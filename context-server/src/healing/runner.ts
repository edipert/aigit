import { execFileSync } from 'child_process';
import { prisma } from '../db';
import { getActiveBranch } from '../cli/git';
import { diagnoseTestFailure, Diagnosis } from './diagnosis';
import { buildHealingPlan, formatHealReport, HealingPlan } from './strategy';
import { detectContextDrift } from '../diagnostics/drift';

export interface HealOptions {
    cmd?: string;
    auto?: boolean;
    quiet?: boolean;
}

export interface HealResult {
    success: boolean;
    diagnosis: Diagnosis | null;
    plan: HealingPlan | null;
    report: string;
    eventId: string | null;
}

/**
 * Run the test suite and capture output.
 */
export function runTestSuite(workspacePath: string, cmd?: string): { exitCode: number; output: string } {
    const testCmd = cmd || 'npm test';
    try {
        const parts = testCmd.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);
        const output = execFileSync(command, args, {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 120_000, // 2 min timeout
        });
        return { exitCode: 0, output };
    } catch (error: any) {
        // Non-zero exit code — tests failed
        const output = (error.stdout || '') + '\n' + (error.stderr || '');
        return { exitCode: error.status || 1, output };
    }
}

/**
 * Full heal pipeline: run tests → diagnose → build plan → persist event.
 */
export async function healFromTestFailure(
    workspacePath: string,
    options: HealOptions = {}
): Promise<HealResult> {
    const branch = getActiveBranch(workspacePath);

    // Step 0: Run Semantic Drift Detection
    if (!options.quiet) {
        try {
            const driftReport = await detectContextDrift(workspacePath);
            if (driftReport.staleCount > 0) {
                console.log(`\n🧹 Context Drift Detected: Found ${driftReport.staleCount} stale architectural memories.`);
                for (const item of driftReport.staleItems.slice(0, 3)) {
                    console.log(`   - [${item.type.toUpperCase()}] ${item.reason}`);
                }
                if (driftReport.staleCount > 3) {
                    console.log(`   ...and ${driftReport.staleCount - 3} more.`);
                }
                console.log(`   (Run an interactive AI orchestrator to resolve or mark them as [OBSOLETE])\n`);
            }
        } catch (error) {
            // fail silently on diagnostic errors
        }
    }

    // Step 1: Run the test suite
    if (!options.quiet) console.log('\n🧪 Running test suite...\n');
    const { exitCode, output } = runTestSuite(workspacePath, options.cmd);

    if (exitCode === 0) {
        return {
            success: true,
            diagnosis: null,
            plan: null,
            report: '\n✅ All tests passed. No healing needed.\n',
            eventId: null,
        };
    }

    if (output.includes('Missing script: "test"') || output.includes('Missing script: test')) {
        if (!options.quiet) console.log('⚠️  No "test" script found in package.json. Skipping diagnostic phase.\n');
        return {
            success: true, // Graceful skip
            diagnosis: null,
            plan: null,
            report: '\n⚠️  No "test" script found. Skipping healing.\n',
            eventId: null,
        };
    }

    if (!options.quiet) console.log('❌ Tests failed. Diagnosing...\n');

    // Step 2: Diagnose the failure
    const diagnosis = await diagnoseTestFailure(output, workspacePath, branch);

    // Step 3: Build healing plan
    const plan = buildHealingPlan(diagnosis);
    const report = formatHealReport(plan);

    // Step 4: Persist the healing event
    let project = await prisma.project.findFirst();
    if (!project) {
        const path = require('path');
        project = await prisma.project.create({
            data: { name: path.basename(workspacePath) }
        });
    }

    const event = await prisma.healingEvent.create({
        data: {
            projectId: project.id,
            trigger: 'test_failure',
            source: output.substring(0, 5000), // truncate for storage
            diagnosis: diagnosis.summary,
            filePath: diagnosis.failures[0]?.filePath || null,
            symbolName: diagnosis.symbols[0]?.name || null,
            strategy: options.auto ? 'auto_commit' : 'propose',
            patch: JSON.stringify(plan),
            status: 'PENDING',
            gitBranch: branch,
        }
    });

    // Step 5: If auto mode, commit the diagnosis as memory
    if (options.auto) {
        await prisma.memory.create({
            data: {
                projectId: project.id,
                gitBranch: branch,
                type: 'healing',
                content: `[AUTO-HEAL] ${diagnosis.summary}`,
                filePath: diagnosis.failures[0]?.filePath || null,
                symbolName: diagnosis.symbols[0]?.name || null,
            }
        });

        await prisma.healingEvent.update({
            where: { id: event.id },
            data: { status: 'FIXED' },
        });
    }

    return {
        success: false,
        diagnosis,
        plan,
        report,
        eventId: event.id,
    };
}

/**
 * Show the healing event history.
 */
export async function getHealingHistory(): Promise<string> {
    const events = await prisma.healingEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    if (events.length === 0) {
        return '\n📋 No healing events recorded yet.\n';
    }

    let output = `\n📋 [aigit heal] History (${events.length} event(s)):\n\n`;
    for (const e of events) {
        const icon = e.status === 'FIXED' ? '✅' : e.status === 'FAILED' ? '❌' : e.status === 'SKIPPED' ? '⏭️' : '⏳';
        const time = e.createdAt.toISOString().substring(0, 19).replace('T', ' ');
        output += `  ${icon} [${e.status}] ${e.trigger} — ${e.diagnosis}\n`;
        output += `     Branch: ${e.gitBranch} | Strategy: ${e.strategy} | ${time}\n`;
        if (e.filePath) output += `     📁 ${e.filePath}${e.symbolName ? ` ⚓ @${e.symbolName}` : ''}\n`;
        output += `     ID: ${e.id.substring(0, 12)}\n\n`;
    }

    return output;
}

/**
 * Retry a failed healing event.
 */
export async function retryHealingEvent(
    eventId: string,
    workspacePath: string,
    options: HealOptions = {}
): Promise<HealResult> {
    const event = await prisma.healingEvent.findUnique({ where: { id: eventId } });
    if (!event) {
        return {
            success: false,
            diagnosis: null,
            plan: null,
            report: `\n❌ Healing event not found: ${eventId}\n`,
            eventId: null,
        };
    }

    // Re-run the heal pipeline
    return healFromTestFailure(workspacePath, options);
}
