"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const git_1 = require("../git");
const db_1 = require("../../db");
const utils_1 = require("./utils");
const COMMIT_HELP = `
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

  commit update task <slug> <status>
      Update the status of an existing task.
      Statuses: PLANNING, IN_PROGRESS, REVIEW, DONE, BLOCKED, CANCELLED

Examples:
  aigit commit memory "Using Redis for session caching" --type architecture
  aigit commit decision "API protocol" "REST" --reasoning "Team prefers REST for simplicity"
  aigit commit task "Implement JWT authentication"
  aigit commit update task "jwt-auth" IN_PROGRESS
`;
const handler = async ({ args, workspacePath }) => {
    const subCommand = args[0];
    const branch = (0, git_1.getActiveBranch)(workspacePath);
    const project = await (0, utils_1.getOrCreateDefaultProject)(workspacePath);
    if (subCommand === 'memory') {
        const content = args[1];
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
            data: { projectId: project.id, gitBranch: branch, type: memType, content, filePath },
        });
        await (0, utils_1.afterWrite)(workspacePath);
        console.log(`\n✅ [aigit commit] Memory committed to branch [${branch}]`);
        console.log(`   Type: ${memType}`);
        console.log(`   ID: ${memory.id}`);
        if (filePath)
            console.log(`   📁 ${filePath}`);
        console.log();
    }
    else if (subCommand === 'decision') {
        const context = args[1];
        const chosen = args[2];
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
                data: { projectId: project.id, slug: 'default', title: 'General', gitBranch: branch, status: 'IN_PROGRESS' },
            });
        }
        const decision = await db_1.prisma.decision.create({
            data: { taskId: task.id, gitBranch: branch, context, chosen, reasoning, filePath },
        });
        await (0, utils_1.afterWrite)(workspacePath);
        console.log(`\n✅ [aigit commit] Decision recorded on branch [${branch}]`);
        console.log(`   Context: ${context}`);
        console.log(`   Chosen: ${chosen}`);
        if (reasoning)
            console.log(`   Reasoning: ${reasoning}`);
        console.log(`   ID: ${decision.id}`);
        console.log();
    }
    else if (subCommand === 'task') {
        const title = args[1];
        if (!title) {
            console.error('⚠️  Error: You must provide a task title.');
            console.log('Usage: aigit commit task "<title>" [--slug <slug>]');
            process.exit(1);
        }
        const slugIdx = args.indexOf('--slug');
        const slug = slugIdx !== -1
            ? args[slugIdx + 1]
            : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        const task = await db_1.prisma.task.create({
            data: { projectId: project.id, slug, title, gitBranch: branch, status: 'PLANNING' },
        });
        // Create the task plan file in .aigit/tasks/{slug}.md
        const tasksDir = path_1.default.join(workspacePath, '.aigit', 'tasks');
        if (!fs_1.default.existsSync(tasksDir))
            fs_1.default.mkdirSync(tasksDir, { recursive: true });
        const taskFilePath = path_1.default.join(tasksDir, `${slug}.md`);
        const taskFileTemplate = `# ${title}

> **Status**: PLANNING | **Branch**: ${branch} | **ID**: ${task.id}

## Objective

<!-- What does this task accomplish? What is the success criterion? -->

## Sub-tasks

- [ ] Sub-task 1
- [ ] Sub-task 2

## Notes

<!-- Agent handoff notes go here -->
`;
        fs_1.default.writeFileSync(taskFilePath, taskFileTemplate, 'utf8');
        await (0, utils_1.afterWrite)(workspacePath);
        console.log(`\n✅ [aigit commit] Task created on branch [${branch}]`);
        console.log(`   Title: ${title}`);
        console.log(`   Slug: ${slug}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Plan: .aigit/tasks/${slug}.md (fill in sub-tasks)`);
        console.log();
    }
    else if (subCommand === 'update') {
        const updateType = args[1];
        if (updateType === 'task') {
            const slug = args[2];
            const status = args[3];
            if (!slug || !status) {
                console.error('⚠️  Error: You must provide a task slug and new status.');
                console.log('Usage: aigit commit update task <slug> <status>');
                console.log('       Statuses: PLANNING, IN_PROGRESS, REVIEW, DONE, BLOCKED, CANCELLED');
                process.exit(1);
            }
            const validStatuses = ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'CANCELLED'];
            if (!validStatuses.includes(status)) {
                console.error(`⚠️  Error: Invalid status '${status}'.`);
                console.log(`Available statuses: ${validStatuses.join(', ')}`);
                process.exit(1);
            }
            try {
                const updateResult = await db_1.prisma.task.updateMany({
                    where: { projectId: project.id, gitBranch: branch, slug },
                    data: { status },
                });
                if (updateResult.count === 0) {
                    console.log(`⚠️  Warning: No task found with slug '${slug}' on branch [${branch}].`);
                }
                else {
                    console.log(`\n✅ [aigit update task] Task '${slug}' marked as ${status} on branch [${branch}]`);
                }
                await (0, utils_1.afterWrite)(workspacePath);
            }
            catch (error) {
                console.error('⚠️  Failed to update task:', error.message);
                process.exit(1);
            }
        }
        else {
            console.error(`⚠️  Error: Unknown update type '${updateType}'.`);
            console.log('Usage: aigit commit update task <slug> <status>');
            process.exit(1);
        }
    }
    else if (subCommand === 'staged') {
        try {
            // Check if an AI Agent already supplied semantic memory in the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentAgentMemory = await db_1.prisma.memory.findFirst({
                where: {
                    projectId: project.id,
                    gitBranch: branch,
                    type: { in: ['capability', 'architecture', 'context'] },
                    createdAt: { gte: fiveMinutesAgo },
                },
            });
            if (recentAgentMemory) {
                console.log(`\n⏭️  [aigit commit] Skipping automatic raw diff generation.`);
                console.log(`   └─ Found recent Agent-authored memory: "${recentAgentMemory.content.slice(0, 50)}..."`);
                process.exit(0);
            }
            // No recent agent memory — prompt the human or block the headless agent
            let isTTY = false;
            try {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                fs.accessSync('/dev/tty', fs.constants.R_OK | fs.constants.W_OK);
                isTTY = true;
            }
            catch {
                isTTY = false;
            }
            if (isTTY) {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const ttyFd = fs.openSync('/dev/tty', 'rs+');
                fs.writeSync(ttyFd, `\n[Aigit] No semantic memory detected for this commit.\n`);
                fs.writeSync(ttyFd, `[Aigit] Please briefly summarize the architectural changes you made (or press ENTER to abort):\n> `);
                let summary = '';
                const buffer = Buffer.alloc(1);
                while (true) {
                    const bytesRead = fs.readSync(ttyFd, buffer, 0, 1, null);
                    if (bytesRead === 0 || buffer[0] === 10 || buffer[0] === 13)
                        break;
                    summary += buffer.toString('utf8');
                }
                fs.closeSync(ttyFd);
                const trimmedSummary = summary.trim();
                if (!trimmedSummary) {
                    console.error(`\n🛑 [Aigit] Commit aborted. Semantic summary is required.\n`);
                    process.exit(1);
                }
                console.log(`\n[Aigit] Saving semantic memory...`);
                try {
                    const safeSummary = trimmedSummary.replace(/"/g, '\\"');
                    (0, child_process_1.execSync)(`npx --no-install aigit commit memory "${safeSummary}"`, { stdio: 'inherit' });
                    console.log(`⏭️  [aigit commit] Resuming git commit...\n`);
                    process.exit(0);
                }
                catch {
                    console.error(`🛑 [Aigit] Failed to save semantic memory.`);
                    process.exit(1);
                }
            }
            else {
                console.error(`\n======================================================`);
                console.error(`🛑 [Aigit] ERROR: Agent-Driven Commit Summaries are REQUIRED.`);
                console.error(`======================================================`);
                console.error(`To maintain a clean and token-efficient semantic ledger, you`);
                console.error(`are not allowed to generate noisy raw 'git diff' payloads.\n`);
                console.error(`🤖 AI Agents & Developers MUST run this command FIRST:\n`);
                console.error(`   aigit commit memory "<semantic architectural summary>"\n`);
                console.error(`Please run the command above, then try your 'git commit' again.`);
                console.error(`======================================================\n`);
                process.exit(1);
            }
        }
        catch (error) {
            console.error('⚠️  Failed to generate automatic staged context.');
            process.exit(1);
        }
    }
    else if (subCommand === 'auto') {
        try {
            const commitInfo = (0, child_process_1.execSync)('git log -1 --pretty=format:"%h - %s%n%b"').toString().trim();
            const fileChanges = (0, child_process_1.execSync)('git diff-tree --no-commit-id --name-status -r HEAD').toString().trim();
            const diffStats = (0, child_process_1.execSync)('git diff --stat HEAD~1 HEAD').toString().trim();
            const semanticSummary = `Automatic Git Commit Context\nCommit:\n${commitInfo}\n\nFiles Changed:\n${fileChanges}\n\nStatistics:\n${diffStats}`;
            const memory = await db_1.prisma.memory.create({
                data: {
                    projectId: project.id,
                    gitBranch: branch,
                    type: 'capability',
                    content: semanticSummary,
                    filePath: 'git-commit-auto',
                },
            });
            await (0, utils_1.afterWrite)(workspacePath);
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
        console.log(COMMIT_HELP);
    }
};
exports.default = handler;
