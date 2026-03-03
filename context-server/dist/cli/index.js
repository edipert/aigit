#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hydration_1 = require("./hydration");
const db_1 = require("../db");
const args = process.argv.slice(2);
const command = args[0];
async function main() {
    await (0, db_1.initializeDatabase)();
    if (command === 'hydrate') {
        const workspacePath = process.cwd();
        const activeFile = args[1];
        const context = await (0, hydration_1.compileHydratedContext)(workspacePath, activeFile);
        console.log(context);
    }
    else if (command === 'mcp') {
        // Simply requiring the main index file kicks off the StdioServerTransport
        require('../index');
    }
    else if (command === 'init') {
        const workspacePath = process.cwd();
        const { installGitHook } = require('./hooks');
        installGitHook(workspacePath);
        console.log('✅ aigit initialized. Hooks installed, .aigit/ directory ready.');
    }
    else if (command === 'init-hook') {
        const workspacePath = process.cwd();
        const { installGitHook } = require('./hooks');
        installGitHook(workspacePath);
    }
    else if (command === 'check-conflicts') {
        const targetBranch = args[1] || 'main';
        const workspacePath = process.cwd();
        const { checkContextConflicts } = require('./conflict');
        await checkContextConflicts(workspacePath, targetBranch);
    }
    else if (command === 'merge') {
        const sourceBranch = args[1];
        if (!sourceBranch) {
            console.error('⚠️  Error: You must specify a source branch to merge from.');
            console.log('Usage: aigit merge <source-branch> [target-branch]');
            process.exit(1);
        }
        const targetBranch = args[2] || 'main';
        const workspacePath = process.cwd();
        const { mergeContextBranches } = require('./merge');
        await mergeContextBranches(workspacePath, sourceBranch, targetBranch);
    }
    else if (command === 'dump') {
        const workspacePath = process.cwd();
        const { dumpContextLedger } = require('./sync');
        await dumpContextLedger(workspacePath);
    }
    else if (command === 'load') {
        const workspacePath = process.cwd();
        const { loadContextLedger } = require('./sync');
        await loadContextLedger(workspacePath);
    }
    else if (command === 'log') {
        const workspacePath = process.cwd();
        const { showContextLog } = require('./history');
        await showContextLog(workspacePath);
    }
    else if (command === 'status') {
        const workspacePath = process.cwd();
        const { showContextStatus } = require('./history');
        await showContextStatus(workspacePath);
    }
    else if (command === 'revert') {
        const targetId = args[1];
        if (!targetId) {
            console.error('⚠️  Error: You must specify a Context ID to revert.');
            console.log('Usage: aigit revert <context-id>');
            process.exit(1);
        }
        const workspacePath = process.cwd();
        const { revertContextId } = require('./history');
        await revertContextId(workspacePath, targetId);
    }
    else if (command === 'scan') {
        const workspacePath = process.cwd();
        const { detectAgents, printScanReport } = require('../agents/registry');
        const agents = detectAgents(workspacePath);
        printScanReport(agents);
    }
    else if (command === 'sync') {
        const workspacePath = process.cwd();
        const { syncAgents } = require('../agents/sync');
        const dryRun = args.includes('--dry-run');
        const skillsMigrate = args.includes('--skills');
        const fromIdx = args.indexOf('--from');
        const toIdx = args.indexOf('--to');
        const from = fromIdx !== -1 ? args[fromIdx + 1] : undefined;
        const to = toIdx !== -1 ? args[toIdx + 1] : undefined;
        syncAgents(workspacePath, { dryRun, from, to });
        if (skillsMigrate && !dryRun) {
            const { migrateSkills } = require('../agents/migration');
            const result = migrateSkills(workspacePath);
            if (result.migrated.length > 0) {
                console.log(`\n✅ Unified skills into .aigit/skills and created symlinks for:\n  - ${result.migrated.join('\n  - ')}\n`);
            }
            else if (result.errors.length === 0) {
                console.log('\n✅ No skill folders required migration.\n');
            }
            if (result.errors.length > 0) {
                console.error('\n⚠️  Migration encountered errors:');
                result.errors.forEach((err) => console.error(`  - ${err}`));
                console.log();
            }
        }
    }
    else if (command === 'conflicts') {
        const workspacePath = process.cwd();
        const { loadConflicts, printConflicts } = require('../agents/conflicts');
        const conflicts = loadConflicts(workspacePath);
        printConflicts(conflicts);
    }
    else if (command === 'query') {
        const queryText = args[1];
        if (!queryText) {
            console.error('⚠️  Error: You must provide a query.');
            console.log('Usage: aigit query "<question>" [--commit <hash>] [--top <n>]');
            process.exit(1);
        }
        const workspacePath = process.cwd();
        const commitIdx = args.indexOf('--commit');
        const topIdx = args.indexOf('--top');
        const commitHash = commitIdx !== -1 ? args[commitIdx + 1] : undefined;
        const topK = topIdx !== -1 ? Number(args[topIdx + 1]) : 5;
        if (commitHash) {
            // Time-traveling query
            const { queryHistoricalContext } = require('../rag/timeTravel');
            const result = queryHistoricalContext({ query: queryText, commitHash, workspacePath, topK });
            if (!result.success) {
                console.error(`\n❌ ${result.error}\n`);
                process.exit(1);
            }
            console.log(`\n🕰️  Time-Travel Query @ ${commitHash}:\n`);
            if (result.results.length === 0) {
                console.log('No matching context found at this commit.');
            }
            else {
                result.results.forEach((r, i) => {
                    console.log(`  ${i + 1}. (score: ${r.score.toFixed(2)}) ${r.text}`);
                    if (r.filePath)
                        console.log(`     📁 ${r.filePath}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`);
                });
            }
            console.log();
        }
        else {
            // Live semantic search
            const { semanticSearch } = require('../rag/search');
            const results = await semanticSearch({ query: queryText, topK });
            console.log(`\n🔍 Semantic Search Results:\n`);
            if (results.length === 0) {
                console.log('No matching context found.');
            }
            else {
                results.forEach((r, i) => {
                    console.log(`  ${i + 1}. [${r.type.toUpperCase()}] (score: ${r.score.toFixed(2)}) ${r.text}`);
                    if (r.filePath)
                        console.log(`     📁 ${r.filePath}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`);
                });
            }
            console.log();
        }
    }
    else if (command === 'anchor') {
        const targetFile = args[1];
        if (!targetFile) {
            console.error('⚠️  Error: You must specify a file to anchor symbols to.');
            console.log('Usage: aigit anchor <file>');
            process.exit(1);
        }
        const workspacePath = process.cwd();
        const path = require('path');
        const fullPath = path.isAbsolute(targetFile) ? targetFile : path.join(workspacePath, targetFile);
        const { anchorFileToSymbols } = require('../ast/resolver');
        const result = await anchorFileToSymbols(fullPath, workspacePath);
        console.log(`\n⚓ [aigit anchor] Scanned: ${targetFile}`);
        console.log(`   Anchored ${result.anchored}/${result.total} unlinked entries to code symbols.\n`);
    }
    else if (command === 'swarm') {
        const { createSwarm, getSwarmStatus, haltSwarm, resumeSwarm, listActiveSwarms } = require('../swarm/swarm');
        const { listConflicts, resolveConflict } = require('../swarm/conflict');
        const subCommand = args[1];
        const workspacePath = process.cwd();
        const { getActiveBranch } = require('./git');
        if (subCommand === 'status') {
            // Find active swarms
            const projects = await db_1.prisma.project.findMany();
            for (const project of projects) {
                const swarms = await listActiveSwarms(project.id);
                if (swarms.length === 0)
                    continue;
                for (const swarm of swarms) {
                    const statusEmoji = { PENDING: '⏳', ACTIVE: '🔄', HALTED: '⚠️', DONE: '✅', FAILED: '❌' };
                    console.log(`\n🐝 SWARM: ${swarm.goal}`);
                    console.log(`   Status: ${statusEmoji[swarm.status] || '❓'} ${swarm.status} — Turn ${swarm.currentTurn}/${swarm.totalTurns}`);
                    console.log(`   Branch: ${swarm.gitBranch}\n`);
                    console.log('   AGENTS:');
                    for (const agent of swarm.agents) {
                        const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' };
                        console.log(`   ${agent.turnOrder}. ${emoji[agent.status] || '❓'} ${agent.agentName} (${agent.role}) — ${agent.status} [${agent.taskSlug || 'no task'}]`);
                    }
                }
            }
        }
        else if (subCommand === 'halt') {
            const swarmId = args[2];
            if (!swarmId) {
                console.error('Usage: aigit swarm halt <swarmId>');
                process.exit(1);
            }
            await haltSwarm(swarmId);
            console.log(`⛔ Swarm ${swarmId} halted.`);
        }
        else if (subCommand === 'resume') {
            const swarmId = args[2];
            if (!swarmId) {
                console.error('Usage: aigit swarm resume <swarmId>');
                process.exit(1);
            }
            await resumeSwarm(swarmId);
            console.log(`▶️ Swarm ${swarmId} resumed.`);
        }
        else if (subCommand === 'conflicts') {
            const projects = await db_1.prisma.project.findMany();
            let totalConflicts = 0;
            for (const project of projects) {
                const swarms = await listActiveSwarms(project.id);
                for (const swarm of swarms) {
                    const conflicts = await listConflicts(swarm.id);
                    if (conflicts.length === 0)
                        continue;
                    totalConflicts += conflicts.length;
                    console.log(`\n⚠️  ${conflicts.length} conflict(s) in swarm "${swarm.goal}":\n`);
                    for (const c of conflicts) {
                        try {
                            const payload = JSON.parse(c.payload);
                            console.log(`   CONFLICT ${c.id.substring(0, 8)}:`);
                            console.log(`   ${c.fromAgent.role}: ${payload.reason}`);
                            console.log(`   Blocked: ${payload.blockedDecision}`);
                            if (payload.filePath)
                                console.log(`   📁 ${payload.filePath}${payload.symbolName ? ` ⚓ @${payload.symbolName}` : ''}`);
                            console.log('');
                        }
                        catch { /* skip unparseable */ }
                    }
                }
            }
            if (totalConflicts === 0)
                console.log('✅ No unresolved swarm conflicts.');
        }
        else if (subCommand === 'resolve') {
            const conflictId = args[2];
            const resolution = args.slice(3).join(' ');
            if (!conflictId || !resolution) {
                console.error('Usage: aigit swarm resolve <conflictId> <resolution>');
                process.exit(1);
            }
            await resolveConflict(conflictId, resolution);
            console.log(`✅ Conflict resolved: ${resolution}`);
        }
        else if (subCommand && subCommand !== '--help') {
            // Treat as a goal — create a swarm
            const goal = subCommand;
            const branch = getActiveBranch(workspacePath);
            const projects = await db_1.prisma.project.findMany({ take: 1 });
            if (projects.length === 0) {
                console.error('No project found. Run `aigit init` first.');
                process.exit(1);
            }
            const swarm = await createSwarm(projects[0].id, goal, branch, []);
            console.log(`\n🐝 [aigit swarm] Session created: ${swarm.id.substring(0, 12)}`);
            console.log(`   Goal: ${goal}`);
            console.log(`   Branch: ${branch}`);
            console.log(`   Status: PENDING — waiting for agents to register`);
            console.log(`\n   Agents can join via MCP: register_agent(swarmId: '${swarm.id}', role: '...')\n`);
        }
        else {
            console.log(`
🐝 aigit swarm — Multi-Agent Orchestration

Commands:
  swarm "<goal>"          Create a new swarm session
  swarm status            View swarm state (agents, turns, conflicts)
  swarm halt <id>         Halt an active swarm
  swarm resume <id>       Resume a halted swarm
  swarm conflicts         List unresolved swarm conflicts
  swarm resolve <id> <r>  Resolve a conflict with resolution text
            `);
        }
    }
    else if (command === 'heal') {
        const { healFromTestFailure, getHealingHistory, retryHealingEvent } = require('../healing/runner');
        const workspacePath = process.cwd();
        const subCommand = args[1];
        if (subCommand === 'status') {
            const history = await getHealingHistory();
            console.log(history);
            return;
        }
        if (subCommand === 'retry') {
            const eventId = args[2];
            if (!eventId) {
                console.error('⚠️  Error: Please provide a healing event ID to retry.');
                return process.exit(1);
            }
            const auto = args.includes('--auto');
            const result = await retryHealingEvent(eventId, workspacePath, { auto });
            console.log(result.report);
            return;
        }
        const auto = args.includes('--auto');
        let cmd = undefined;
        const cmdIndex = args.indexOf('--cmd');
        if (cmdIndex !== -1 && args[cmdIndex + 1]) {
            cmd = args[cmdIndex + 1];
        }
        const result = await healFromTestFailure(workspacePath, { auto, cmd });
        console.log(result.report);
        if (!result.success && !auto) {
            console.log('👉 Run `aigit heal --auto` to automatically commit fixes (if strategies are implemented by an agent).');
            process.exit(1);
        }
    }
    else if (command === 'deps') {
        const { runAudit, buildDepHealPlan, formatDepReport, executeDepAutoHeal } = require('../healing/depAudit');
        const workspacePath = process.cwd();
        const auto = args.includes('--auto');
        console.log('\n📦 Running dependency audit...\n');
        const audit = runAudit(workspacePath);
        const plan = await buildDepHealPlan(audit, workspacePath);
        console.log(formatDepReport(plan));
        if (auto) {
            if (audit.fixableCount === 0) {
                console.log('✅ No auto-fixable vulnerabilities found. Nothing to auto-heal.');
                return;
            }
            console.log(`\n⚙️  Auto-healing ${audit.fixableCount} vulnerabilities on branch: ${plan.branchName}...\n`);
            const result = executeDepAutoHeal(workspacePath, plan.branchName);
            console.log(result.message);
        }
        else if (audit.fixableCount > 0) {
            console.log('👉 Run `aigit deps --auto` to automatically branch and fix these vulnerabilities.');
        }
    }
    else if (command === 'docs' || command === 'export-docs') {
        const { exportDocs } = require('./docs');
        const outIdx = args.indexOf('--out');
        const out = outIdx !== -1 ? args[outIdx + 1] : undefined;
        await exportDocs({ out });
    }
    else if (command === 'commit') {
        const subCommand = args[1]; // memory | decision | task
        const workspacePath = process.cwd();
        const { getActiveBranch } = require('./git');
        const branch = getActiveBranch(workspacePath);
        // Ensure a default project exists
        let project = await db_1.prisma.project.findFirst();
        if (!project) {
            const pathModule = require('path');
            project = await db_1.prisma.project.create({
                data: { name: pathModule.basename(workspacePath) }
            });
        }
        if (subCommand === 'memory') {
            const content = args[2];
            if (!content) {
                console.error('⚠️  Error: You must provide the memory content.');
                console.log('Usage: aigit commit memory "<content>" [--type <type>] [--file <path>]');
                process.exit(1);
            }
            const typeIdx = args.indexOf('--type');
            const fileIdx = args.indexOf('--file');
            const memType = typeIdx !== -1 ? args[typeIdx + 1] : 'architecture';
            const filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
            const memory = await db_1.prisma.memory.create({
                data: {
                    projectId: project.id,
                    gitBranch: branch,
                    type: memType,
                    content,
                    filePath,
                }
            });
            console.log(`\n✅ [aigit commit] Memory committed to branch [${branch}]`);
            console.log(`   Type: ${memType}`);
            console.log(`   ID: ${memory.id}`);
            if (filePath)
                console.log(`   📁 ${filePath}`);
            console.log();
        }
        else if (subCommand === 'decision') {
            const context = args[2];
            const chosen = args[3];
            if (!context || !chosen) {
                console.error('⚠️  Error: You must provide the decision context and chosen option.');
                console.log('Usage: aigit commit decision "<context>" "<chosen>" [--reasoning "<text>"]');
                process.exit(1);
            }
            const reasoningIdx = args.indexOf('--reasoning');
            const fileIdx = args.indexOf('--file');
            const reasoning = reasoningIdx !== -1 ? args[reasoningIdx + 1] : '';
            const filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
            // Decisions need a task — create or reuse a default one
            let task = await db_1.prisma.task.findFirst({ where: { projectId: project.id, gitBranch: branch } });
            if (!task) {
                task = await db_1.prisma.task.create({
                    data: { projectId: project.id, slug: 'default', title: 'General', gitBranch: branch, status: 'IN_PROGRESS' }
                });
            }
            const decision = await db_1.prisma.decision.create({
                data: {
                    taskId: task.id,
                    gitBranch: branch,
                    context,
                    chosen,
                    reasoning,
                    filePath,
                }
            });
            console.log(`\n✅ [aigit commit] Decision recorded on branch [${branch}]`);
            console.log(`   Context: ${context}`);
            console.log(`   Chosen: ${chosen}`);
            if (reasoning)
                console.log(`   Reasoning: ${reasoning}`);
            console.log(`   ID: ${decision.id}`);
            console.log();
        }
        else if (subCommand === 'task') {
            const title = args[2];
            if (!title) {
                console.error('⚠️  Error: You must provide a task title.');
                console.log('Usage: aigit commit task "<title>" [--slug <slug>]');
                process.exit(1);
            }
            const slugIdx = args.indexOf('--slug');
            const slug = slugIdx !== -1 ? args[slugIdx + 1] : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
            const task = await db_1.prisma.task.create({
                data: {
                    projectId: project.id,
                    slug,
                    title,
                    gitBranch: branch,
                    status: 'PLANNING'
                }
            });
            console.log(`\n✅ [aigit commit] Task created on branch [${branch}]`);
            console.log(`   Title: ${title}`);
            console.log(`   Slug: ${slug}`);
            console.log(`   ID: ${task.id}`);
            console.log();
        }
        else if (subCommand === 'auto') {
            const { execSync } = require('child_process');
            try {
                // Get the latest commit hash and message
                const commitInfo = execSync('git log -1 --pretty=format:"%h - %s%n%b"').toString().trim();
                // Get the list of files changed and their status (A, M, D, etc.)
                const fileChanges = execSync('git diff-tree --no-commit-id --name-status -r HEAD').toString().trim();
                // Get the diff stats (insertions/deletions)
                const diffStats = execSync('git diff --stat HEAD~1 HEAD').toString().trim();
                const semanticSummary = `Automatic Git Commit Context
Commit:
${commitInfo}

Files Changed:
${fileChanges}

Statistics:
${diffStats}`;
                const memory = await db_1.prisma.memory.create({
                    data: {
                        projectId: project.id,
                        gitBranch: branch,
                        type: 'capability', // using capability to denote functional changes
                        content: semanticSummary,
                        filePath: 'git-commit-auto'
                    }
                });
                const { dumpContextLedger } = require('./sync');
                await dumpContextLedger(workspacePath);
                console.log(`\n✅ [aigit commit] Git context recorded automatically on branch [${branch}]`);
                console.log(`   ID: ${memory.id}`);
                console.log(`   Tokens: ~${Math.floor(semanticSummary.length / 4)}`);
                console.log();
            }
            catch (error) {
                console.error('⚠️  Failed to generate automatic Git commit context. Are you in a Git repository with at least one commit?');
                console.error(error);
                process.exit(1);
            }
        }
        else {
            console.log(`
🧠 aigit commit — Commit context to your semantic memory

Commands:
  commit auto
      Automatically generate a rich semantic context from the latest git commit (message, files, diff stats)
  
  commit memory "<content>" [--type <type>] [--file <path>]
      Commit a memory (architecture, capability, pattern, etc.)
      Types: architecture, capability, pattern, convention (default: architecture)

  commit decision "<context>" "<chosen>" [--reasoning "<text>"] [--file <path>]
      Record an architectural decision with context and chosen path.

  commit task "<title>" [--slug <slug>]
      Create a new tracked task on the current branch.

Examples:
  aigit commit memory "Using Redis for session caching" --type architecture
  aigit commit decision "API protocol" "REST" --reasoning "Team prefers REST for simplicity"
  aigit commit task "Implement JWT authentication"
            `);
        }
    }
    else {
        console.log(`
aigit — The AI Context Engine for Git

Commands:
  init                          Initialize aigit in current repo (hooks + .aigit/)
  hydrate [file]                Compile branch-aware context prompt
  dump                          Serialize memory DB → .aigit/ledger.json
  load                          Reconstruct memory DB ← .aigit/ledger.json
  log                           Show semantic memory timeline
  status                        Show pending AI tasks
  revert <id>                   Remove a specific context entry
  check-conflicts [branch]      Check for semantic conflicts vs branch
  merge <source> [target]       Port AI context between branches
  init-hook                     Install Git hooks only
  anchor <file>                 Re-anchor existing memories to AST symbols
  query "<question>"            Semantic search across memory
  query "<question>" --commit <hash>  Time-travel: search memory at a past commit
  docs [--out <path>]           Auto-generate ARCHITECTURE.md from memory ledger

Context:
  commit memory "<text>"        Commit a memory entry to current branch
  commit decision "<ctx>" "<chosen>"  Record an architectural decision
  commit task "<title>"         Create a tracked task

Agent Sync:
  scan                          Detect active AI tools in the workspace
  sync [--dry-run] [--skills]   Bidirectional sync across all detected tools
  sync --from <tool> --to <tool>  One-directional targeted sync
  conflicts                     Show unresolved sync conflicts

Swarm Orchestration:
  swarm "<goal>"                Create a multi-agent swarm session
  swarm status                  View swarm state (agents, turns, messages)
  swarm halt <id>               Halt an active swarm
  swarm resume <id>             Resume a halted swarm
  swarm conflicts               List unresolved swarm conflicts
  swarm resolve <id> <text>     Resolve a conflict
  
Self-Healing Codebases:
  heal                          Run tests, diagnose failures, map AST context, propose fixes
  heal --auto                   Auto-commit fixes derived from memory
  heal status                   List test-failure healing history
  deps                          Audit npm dependencies & correlate with past context
  deps --auto                   Auto-branch and fix vulnerabilities
        `);
    }
}
main().catch((err) => {
    console.error('aigit error:', err.message);
    process.exit(1);
});
