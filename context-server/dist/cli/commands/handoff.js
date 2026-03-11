"use strict";
/**
 * aigit handoff <slug>
 *
 * Generates a ready-to-paste context block for handing off a task from one agent to another.
 * Reads from DB (task + project + recent memories) and the .aigit/tasks/{slug}.md plan file.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../../db");
const output_1 = require("../output");
const handler = async ({ args, workspacePath }) => {
    const slug = args[0];
    if (!slug || slug === '--help') {
        console.log(`
Usage: aigit handoff <task-slug>

Generates a copy-paste agent context block for a task handoff.
Includes task status, project ID, plan file contents, and MCP tool suggestions.

Examples:
  aigit handoff implement-user-dashboard
  aigit handoff auth-setup
`);
        return;
    }
    // ── 1. Fetch task from DB ─────────────────────────────────────────────────
    const task = await db_1.prisma.task.findFirst({
        where: { slug },
        include: {
            project: true,
            decisions: {
                orderBy: { createdAt: 'desc' },
                take: 5,
            },
        },
    });
    if (!task) {
        (0, output_1.fail)(`No task found with slug "${slug}". Run \`aigit status\` to list active tasks.`);
        process.exit(1);
    }
    // ── 2. Read .aigit/tasks/{slug}.md ────────────────────────────────────────
    const taskFilePath = path_1.default.join(workspacePath, '.aigit', 'tasks', `${slug}.md`);
    const planContent = fs_1.default.existsSync(taskFilePath)
        ? fs_1.default.readFileSync(taskFilePath, 'utf8').trim()
        : '_(No plan file found — run `aigit commit task` to create one)_';
    // ── 3. Fetch recent memories for context ──────────────────────────────────
    const recentMemories = await db_1.prisma.memory.findMany({
        where: { projectId: task.projectId, gitBranch: task.gitBranch },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });
    // ── 4. Build the handoff block ────────────────────────────────────────────
    const statusIcon = task.status === 'DONE' ? '✅' :
        task.status === 'BLOCKED' ? '⚠️ ' :
            task.status === 'CANCELLED' ? '❌' :
                task.status === 'PLANNING' ? '📋' :
                    task.status === 'REVIEW' ? '🔍' :
                        '🔄'; // IN_PROGRESS
    const memoriesBlock = recentMemories.length > 0
        ? recentMemories.map(m => `  - [${m.type}] ${m.content.split('\n')[0].slice(0, 100)}`).join('\n')
        : '  _(No memories recorded yet)_';
    const decisionsBlock = task.decisions.length > 0
        ? task.decisions.map(d => `  - Chose **${d.chosen}**: ${d.context.slice(0, 80)}`).join('\n')
        : '  _(No decisions recorded yet)_';
    const handoffBlock = `
${'═'.repeat(60)}
🤝 AIGIT AGENT HANDOFF CONTEXT
${'═'.repeat(60)}

TASK
  Title   : ${task.title}
  Slug    : ${task.slug}
  Status  : ${statusIcon} ${task.status}
  Branch  : ${task.gitBranch}
  Task ID : ${task.id}
  Project : ${task.project.name} (${task.projectId})

PLAN FILE (.aigit/tasks/${slug}.md)
${'─'.repeat(60)}
${planContent}
${'─'.repeat(60)}

RECENT MEMORIES (last 5 on branch ${task.gitBranch})
${memoriesBlock}

RECENT DECISIONS (last 5)
${decisionsBlock}

MCP TOOLS — RUN THESE FIRST
  get_active_task_state  projectId="${task.projectId}"
  query_context          query="<your feature keywords>" branch="${task.gitBranch}"
  get_project_history    projectId="${task.projectId}"

STATUS COMMANDS
  In progress : aigit update task ${slug} IN_PROGRESS
  Done        : aigit update task ${slug} DONE
  Blocked     : aigit update task ${slug} BLOCKED

${'═'.repeat(60)}
`;
    console.log(handoffBlock);
    (0, output_1.ok)(`Handoff block ready. Paste the block above into Agent B's context.`);
};
exports.default = handler;
