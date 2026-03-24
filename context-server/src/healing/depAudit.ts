import { execFileSync } from 'child_process';
import path from 'path';
import { prisma } from '../db';
import { getActiveBranch } from '../cli/git';

/** Parsed vulnerability from npm audit */
export interface Vulnerability {
    name: string;
    severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
    title: string;
    url: string | null;
    fixAvailable: boolean;
    range: string;
}

/** Classified audit results */
export interface AuditResult {
    total: number;
    critical: Vulnerability[];
    high: Vulnerability[];
    moderate: Vulnerability[];
    low: Vulnerability[];
    fixableCount: number;
}

/** Dependency healing plan */
export interface DepHealPlan {
    summary: string;
    updates: { name: string; severity: string; fixAvailable: boolean }[];
    relatedDecisions: { context: string; chosen: string }[];
    suggestedActions: string[];
    branchName: string;
}

/**
 * Run `npm audit --json` and parse the results.
 */
export function runAudit(workspacePath: string): AuditResult {
    let raw: string;
    try {
        raw = execFileSync('npm', ['audit', '--json'], {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 60_000,
        });
    } catch (error: any) {
        // npm audit exits non-zero when vulnerabilities are found
        raw = error.stdout || '{}';
    }

    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { total: 0, critical: [], high: [], moderate: [], low: [], fixableCount: 0 };
    }

    const vulns: Vulnerability[] = [];

    // npm audit v2 format (npm 7+)
    if (parsed.vulnerabilities) {
        for (const [name, info] of Object.entries(parsed.vulnerabilities) as [string, any][]) {
            vulns.push({
                name,
                severity: info.severity || 'info',
                title: info.via?.[0]?.title || info.via?.[0] || name,
                url: info.via?.[0]?.url || null,
                fixAvailable: !!info.fixAvailable,
                range: info.range || '*',
            });
        }
    }

    const result: AuditResult = {
        total: vulns.length,
        critical: vulns.filter(v => v.severity === 'critical'),
        high: vulns.filter(v => v.severity === 'high'),
        moderate: vulns.filter(v => v.severity === 'moderate'),
        low: vulns.filter(v => v.severity === 'low'),
        fixableCount: vulns.filter(v => v.fixAvailable).length,
    };

    return result;
}

/**
 * Query aigit's decisions for any historical context about a dependency.
 */
export async function queryDepDecisions(
    packageNames: string[],
    branch: string
): Promise<{ context: string; chosen: string }[]> {
    if (packageNames.length === 0) return [];

    // Search decisions where the context mentions any of the package names
    const decisions = await prisma.decision.findMany({
        where: {
            gitBranch: branch,
            OR: packageNames.map(name => ({
                context: { contains: name },
            })),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { context: true, chosen: true },
    });

    return decisions;
}

/**
 * Build a dependency healing plan.
 */
export async function buildDepHealPlan(
    audit: AuditResult,
    workspacePath: string
): Promise<DepHealPlan> {
    const branch = getActiveBranch(workspacePath);
    const allVulns = [...audit.critical, ...audit.high, ...audit.moderate, ...audit.low];
    const packageNames = allVulns.map(v => v.name);

    const relatedDecisions = await queryDepDecisions(packageNames, branch);

    const suggestedActions: string[] = [];

    if (audit.fixableCount > 0) {
        suggestedActions.push(`Run \`npm audit fix\` to auto-fix ${audit.fixableCount} vulnerability(ies)`);
    }
    if (audit.critical.length > 0) {
        suggestedActions.push(`⚠️ CRITICAL: ${audit.critical.map(v => v.name).join(', ')} — immediate action required`);
    }
    if (audit.high.length > 0) {
        suggestedActions.push(`HIGH: Review ${audit.high.map(v => v.name).join(', ')}`);
    }
    if (relatedDecisions.length > 0) {
        suggestedActions.push(`Found ${relatedDecisions.length} past decision(s) about these dependencies — review before updating`);
    }

    const date = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const branchName = `aigit/dep-heal-${date}`;

    const summary = `${audit.total} vulnerability(ies): ${audit.critical.length} critical, ${audit.high.length} high, ${audit.moderate.length} moderate, ${audit.low.length} low. ${audit.fixableCount} auto-fixable.`;

    return {
        summary,
        updates: allVulns.map(v => ({ name: v.name, severity: v.severity, fixAvailable: v.fixAvailable })),
        relatedDecisions,
        suggestedActions,
        branchName,
    };
}

/**
 * Format dep audit report for CLI.
 */
export function formatDepReport(plan: DepHealPlan): string {
    let report = `\n📦 [aigit deps] Dependency Audit Report\n`;
    report += `${'─'.repeat(50)}\n`;
    report += `${plan.summary}\n\n`;

    if (plan.updates.length > 0) {
        report += `🔍 Vulnerabilities:\n`;
        for (const u of plan.updates) {
            const icon = u.severity === 'critical' ? '🔴' : u.severity === 'high' ? '🟠' : u.severity === 'moderate' ? '🟡' : '🟢';
            const fix = u.fixAvailable ? ' (auto-fixable)' : '';
            report += `  ${icon} [${u.severity.toUpperCase()}] ${u.name}${fix}\n`;
        }
        report += '\n';
    }

    if (plan.relatedDecisions.length > 0) {
        report += `🧠 Related Decisions:\n`;
        for (const d of plan.relatedDecisions) {
            report += `  • ${d.context} → ${d.chosen}\n`;
        }
        report += '\n';
    }

    if (plan.suggestedActions.length > 0) {
        report += `💡 Suggested Actions:\n`;
        for (let i = 0; i < plan.suggestedActions.length; i++) {
            report += `  ${i + 1}. ${plan.suggestedActions[i]}\n`;
        }
        report += '\n';
    }

    return report;
}

/**
 * Execute auto-heal: create branch, run npm audit fix, commit.
 */
export function executeDepAutoHeal(workspacePath: string, branchName: string): { success: boolean; message: string } {
    try {
        // Create healing branch
        execFileSync('git', ['checkout', '-b', branchName], {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
        });

        // Run npm audit fix
        execFileSync('npm', ['audit', 'fix'], {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 120_000,
        });

        // Commit the fix
        execFileSync('git', ['add', 'package.json', 'package-lock.json'], {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
        });
        execFileSync('git', ['commit', '-m', 'fix(deps): auto-heal vulnerabilities via aigit deps --auto'], {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
        });

        return {
            success: true,
            message: `\n✅ Dependencies healed on branch \`${branchName}\`.\n   Run \`git diff main..${branchName}\` to review changes.\n`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `\n❌ Auto-heal failed: ${error.message}\n`,
        };
    }
}
