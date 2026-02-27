"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const hydration_1 = require("./cli/hydration");
const git_1 = require("./cli/git");
const db_1 = require("./db");
const server = new index_js_1.Server({
    name: 'ai-context-protocol-engine',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Provide the Tool list over MCP
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'get_project_history',
                description: 'Read the long-term semantic memory and architectural decisions made previously on the project.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' }
                    },
                    required: ['projectId']
                }
            },
            {
                name: 'get_active_task_state',
                description: 'Read the currently active (incomplete) tasks and handovers assigned to agents.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' }
                    },
                    required: ['projectId']
                }
            },
            {
                name: 'log_decision',
                description: 'Contextually log an architectural or code decision to the active task. Externalizes the intent.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'string', description: 'The UUID of the current task.' },
                        context: { type: 'string', description: 'What problem required a decision?' },
                        chosen: { type: 'string', description: 'What approach was ultimately chosen?' },
                        rejected: { type: 'array', items: { type: 'string' }, description: 'What approaches were rejected?' },
                        reasoning: { type: 'string', description: 'Why was that approach chosen over the rejected ones?' }
                    },
                    required: ['taskId', 'context', 'chosen', 'rejected', 'reasoning']
                }
            },
            {
                name: 'create_task',
                description: 'Orchestrate a context handoff by creating a new task stub to offload work to a separate specialized agent.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        slug: { type: 'string', description: 'The task-slug identifier, mapping to the markdown file (e.g., auth-setup).' },
                        title: { type: 'string', description: 'Human-readable title for the task.' }
                    },
                    required: ['projectId', 'slug', 'title']
                }
            },
            {
                name: 'get_hydrated_context',
                description: 'Compile an environment-aware system prompt dynamically based on Git branch, active files, and project type.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        activeFile: { type: 'string', description: 'Optional path to the file currently being edited.' }
                    },
                    required: ['workspacePath']
                }
            },
            {
                name: 'commit_context',
                description: 'Explicitly commits learned patterns, architectural rules, or documentation into the workspace Git-aligned memory.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        workspacePath: { type: 'string', description: 'The root directory of the workspace (used to detect current git branch).' },
                        type: { type: 'string', description: 'Memory type (e.g. pattern, architectural-rule, context).' },
                        content: { type: 'string', description: 'The explicit memory learned to store.' }
                    },
                    required: ['projectId', 'workspacePath', 'type', 'content']
                }
            }
        ]
    };
});
// Implement Tool routing logic over MCP
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case 'get_project_history': {
                const args = request.params.arguments;
                const pId = String(args?.projectId);
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                // Fetch context belonging to 'main' AND the active branch
                const branches = branch === 'main' ? ['main'] : ['main', branch];
                const [memories, decisions] = await Promise.all([
                    db_1.prisma.memory.findMany({ where: { projectId: pId, gitBranch: { in: branches } } }),
                    db_1.prisma.decision.findMany({ where: { task: { projectId: pId }, gitBranch: { in: branches } } })
                ]);
                return { content: [{ type: 'text', text: JSON.stringify({ memories, decisions }, null, 2) }] };
            }
            case 'get_active_task_state': {
                const args = request.params.arguments;
                const pId = String(args?.projectId);
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                const tasks = await db_1.prisma.task.findMany({
                    where: { projectId: pId, status: { not: 'DONE' }, gitBranch: branch },
                    include: { decisions: true }
                });
                return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
            }
            case 'log_decision': {
                const args = request.params.arguments;
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                const decision = await db_1.prisma.decision.create({
                    data: {
                        taskId: String(args?.taskId),
                        gitBranch: branch,
                        context: String(args?.context),
                        chosen: String(args?.chosen),
                        rejected: args?.rejected,
                        reasoning: String(args?.reasoning)
                    }
                });
                return { content: [{ type: 'text', text: `Decision recorded correctly. ID: ${decision.id}` }] };
            }
            case 'create_task': {
                const args = request.params.arguments;
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                const task = await db_1.prisma.task.create({
                    data: {
                        projectId: String(args?.projectId),
                        slug: String(args?.slug),
                        title: String(args?.title),
                        gitBranch: branch,
                        status: 'PLANNING'
                    }
                });
                return { content: [{ type: 'text', text: `Task Context successfully created on branch [${branch}]. ID: ${task.id} (Slug: ${task.slug}.md)` }] };
            }
            case 'get_hydrated_context': {
                const args = request.params.arguments;
                const contextPayload = (0, hydration_1.compileHydratedContext)(String(args?.workspacePath), args?.activeFile ? String(args?.activeFile) : undefined);
                return { content: [{ type: 'text', text: contextPayload }] };
            }
            default:
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool mapping: ${request.params.name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: 'text', text: `MCP Server Error executing ${request.params.name}: ${error.message}` }],
            isError: true,
        };
    }
});
async function main() {
    await (0, db_1.initializeDatabase)();
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('[AI Context Protocol Engine] MCP Server running securely via STDIO.');
}
main().catch(console.error);
