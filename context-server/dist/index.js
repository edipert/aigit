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
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const hydration_1 = require("./cli/hydration");
const git_1 = require("./cli/git");
const db_1 = require("./db");
const resolver_1 = require("./ast/resolver");
const search_1 = require("./rag/search");
const timeTravel_1 = require("./rag/timeTravel");
const swarm_1 = require("./swarm/swarm");
const conflict_1 = require("./swarm/conflict");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
                name: 'commit_decision',
                description: 'Contextually log an architectural or code decision to the active task (equivalent to `aigit commit decision`). Externalizes the intent. If filePath and lineNumber are provided, the decision will be auto-anchored to the enclosing code symbol (function, class, method).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'string', description: 'The UUID of the current task.' },
                        context: { type: 'string', description: 'What problem required a decision?' },
                        chosen: { type: 'string', description: 'What approach was ultimately chosen?' },
                        rejected: { type: 'array', items: { type: 'string' }, description: 'What approaches were rejected?' },
                        reasoning: { type: 'string', description: 'Why was that approach chosen over the rejected ones?' },
                        filePath: { type: 'string', description: 'Optional. The file path this decision is anchored to.' },
                        lineNumber: { type: 'number', description: 'Optional. The line number this decision is anchored to.' },
                        symbolName: { type: 'string', description: 'Optional. The code symbol name to anchor this decision to (e.g. "initRedisClient"). Auto-resolved from filePath+lineNumber if omitted.' },
                        symbolType: { type: 'string', description: 'Optional. Symbol type: function, class, method, export, variable.' }
                    },
                    required: ['taskId', 'context', 'chosen', 'rejected', 'reasoning']
                }
            },
            {
                name: 'commit_task',
                description: 'Orchestrate a context handoff by creating a new task stub to offload work to a separate specialized agent (equivalent to `aigit commit task`).',
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
                name: 'commit_memory',
                description: 'Explicitly commits learned patterns, architectural rules, or documentation into the workspace Git-aligned memory (equivalent to `aigit commit memory`). If filePath and lineNumber are provided, the memory will be auto-anchored to the enclosing code symbol.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        workspacePath: { type: 'string', description: 'The root directory of the workspace (used to detect current git branch).' },
                        type: { type: 'string', description: 'Memory type (e.g. pattern, architectural-rule, context).' },
                        content: { type: 'string', description: 'The explicit memory learned to store.' },
                        filePath: { type: 'string', description: 'Optional. The file path this memory is anchored to.' },
                        lineNumber: { type: 'number', description: 'Optional. The line number this memory is anchored to.' },
                        symbolName: { type: 'string', description: 'Optional. The code symbol name to anchor this memory to. Auto-resolved from filePath+lineNumber if omitted.' },
                        symbolType: { type: 'string', description: 'Optional. Symbol type: function, class, method, export, variable.' }
                    },
                    required: ['projectId', 'workspacePath', 'type', 'content']
                }
            },
            {
                name: 'query_context',
                description: 'Semantic search across the current project memory. Ask questions like "Why did we choose Redis?" and get ranked results.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Natural language question to search for.' },
                        branch: { type: 'string', description: 'Optional. Filter to a specific branch.' },
                        filePath: { type: 'string', description: 'Optional. Filter to memories linked to a specific file.' },
                        symbolName: { type: 'string', description: 'Optional. Filter to memories linked to a specific code symbol.' },
                        topK: { type: 'number', description: 'Number of results to return (default: 5).' }
                    },
                    required: ['query']
                }
            },
            {
                name: 'query_historical',
                description: 'Time-traveling semantic search. Query the project memory as it existed at a specific Git commit hash.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Natural language question to search for.' },
                        commitHash: { type: 'string', description: 'The Git commit hash to travel back to.' },
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        topK: { type: 'number', description: 'Number of results to return (default: 5).' }
                    },
                    required: ['query', 'commitHash', 'workspacePath']
                }
            },
            {
                name: 'get_symbol_context',
                description: 'Get all linked memories and decisions for a specific code symbol. Provide a file path and line number, and this tool returns all context anchored to the enclosing function/class/method.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Absolute or relative path to the source file.' },
                        lineNumber: { type: 'number', description: 'Line number within the file to resolve the enclosing symbol.' },
                        symbolName: { type: 'string', description: 'Optional. Directly query by symbol name instead of resolving from line number.' }
                    },
                    required: ['filePath']
                }
            },
            {
                name: 'anchor_file',
                description: 'Retroactively link existing memories and decisions to code symbols in a file via AST extraction. Use after refactoring to rebind context to new symbol locations.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Absolute path to the source file to anchor.' },
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' }
                    },
                    required: ['filePath', 'workspacePath']
                }
            },
            {
                name: 'list_symbols',
                description: 'Extract and list all code symbols (functions, classes, methods, exports) from a source file using AST parsing.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Absolute path to the source file.' }
                    },
                    required: ['filePath']
                }
            },
            {
                name: 'revert_context',
                description: 'Delete a specific memory, decision, or task by UUID. Use to correct mistakes or remove outdated context.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'The UUID of the memory, decision, or task to delete.' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'check_conflicts',
                description: 'Detect semantic conflicts between the current branch and a target branch. Finds decisions that might conflict before merging.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        targetBranch: { type: 'string', description: 'The branch to compare against (e.g. "main").' }
                    },
                    required: ['projectId', 'workspacePath', 'targetBranch']
                }
            },
            {
                name: 'merge_context',
                description: 'Port memories, decisions, and tasks from one branch to another. Use to carry architectural knowledge across branches.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        sourceBranch: { type: 'string', description: 'The branch to copy context from.' },
                        targetBranch: { type: 'string', description: 'The branch to copy context to.' }
                    },
                    required: ['projectId', 'sourceBranch', 'targetBranch']
                }
            },
            {
                name: 'scan_agents',
                description: 'Detect all AI coding tools configured in the workspace (Gemini, Claude, Cursor, Windsurf, Cline, Copilot, Codex). Returns their config files and detected features.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' }
                    },
                    required: ['workspacePath']
                }
            },
            // ── Swarm Orchestration Tools ────────────────────
            {
                name: 'register_agent',
                description: 'Register an AI agent into a swarm session with a specific role. Each agent declares its role (e.g. backend-specialist, security-auditor) to participate in turn-taking.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        swarmId: { type: 'string', description: 'The swarm session ID to join.' },
                        role: { type: 'string', description: 'Agent role (e.g. orchestrator, backend-specialist, frontend-specialist, security-auditor).' },
                        agentName: { type: 'string', description: 'Human-readable name for this agent.' }
                    },
                    required: ['swarmId', 'role', 'agentName']
                }
            },
            {
                name: 'unregister_agent',
                description: 'Remove an agent from a swarm session.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string', description: 'The agent ID to unregister.' }
                    },
                    required: ['agentId']
                }
            },
            {
                name: 'create_swarm',
                description: 'Create a multi-agent swarm session with a goal and sub-tasks. Each sub-task is assigned to a role. Agents register to fill the slots.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        goal: { type: 'string', description: 'The high-level goal for the swarm.' },
                        workspacePath: { type: 'string', description: 'Workspace root for branch detection.' },
                        subTasks: {
                            type: 'array',
                            description: 'List of sub-tasks with role, slug, and description.',
                            items: {
                                type: 'object',
                                properties: {
                                    role: { type: 'string' },
                                    slug: { type: 'string' },
                                    description: { type: 'string' }
                                },
                                required: ['role', 'slug', 'description']
                            }
                        }
                    },
                    required: ['projectId', 'goal', 'subTasks']
                }
            },
            {
                name: 'publish_message',
                description: 'Publish a message to the swarm message bus. Messages can be broadcast to all agents or targeted to a specific role.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string', description: 'The sending agent ID.' },
                        type: { type: 'string', description: 'Message type: context, decision, directive, status.' },
                        channel: { type: 'string', description: 'Target: "broadcast" for all or a specific role name.' },
                        payload: { type: 'string', description: 'JSON message payload.' }
                    },
                    required: ['agentId', 'type', 'channel', 'payload']
                }
            },
            {
                name: 'poll_messages',
                description: 'Poll the message bus for messages addressed to this agent (broadcast + role-specific). Returns messages since the last poll.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string', description: 'The polling agent ID.' },
                        since: { type: 'string', description: 'Optional ISO timestamp to filter messages after.' }
                    },
                    required: ['agentId']
                }
            },
            {
                name: 'update_agent_status',
                description: 'Update agent status (IDLE, WORKING, DONE, BLOCKED). Setting DONE advances the swarm to the next turn.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string', description: 'The agent ID.' },
                        status: { type: 'string', description: 'New status: IDLE, WORKING, DONE, or BLOCKED.' }
                    },
                    required: ['agentId', 'status']
                }
            },
            {
                name: 'get_swarm_status',
                description: 'Get the full status of a swarm session including all agents, recent messages, and conflicts.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        swarmId: { type: 'string', description: 'The swarm session ID.' }
                    },
                    required: ['swarmId']
                }
            },
            {
                name: 'report_conflict',
                description: 'Report a semantic conflict in the swarm. Automatically halts the swarm and pages the developer for resolution.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string', description: 'The reporting agent ID.' },
                        reason: { type: 'string', description: 'Why this is a conflict.' },
                        blockedDecision: { type: 'string', description: 'The decision being blocked.' },
                        filePath: { type: 'string', description: 'Optional file path related to the conflict.' },
                        symbolName: { type: 'string', description: 'Optional code symbol related to the conflict.' }
                    },
                    required: ['agentId', 'reason', 'blockedDecision']
                }
            },
            {
                name: 'resolve_conflict',
                description: 'Resolve a swarm conflict. Accepts the conflict message ID and a resolution. Resumes the swarm if all conflicts are resolved.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        messageId: { type: 'string', description: 'The conflict message ID to resolve.' },
                        resolution: { type: 'string', description: 'The resolution decision.' }
                    },
                }
            },
            // ── Self-Healing Codebases Tools ─────────────────
            {
                name: 'diagnose_test_failure',
                description: 'Diagnose a test failure by parsing the stack trace, extracting symbols, and querying semantic memory for related decisions/architecture.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        rawTestOutput: { type: 'string', description: 'The raw stack trace or test error output.' },
                        branch: { type: 'string', description: 'The git branch (defaults to main).' }
                    },
                    required: ['workspacePath', 'rawTestOutput']
                }
            },
            {
                name: 'get_healing_plan',
                description: 'Generate a structured healing plan from a raw test output string. Provides suggested actions and contextual knowledge.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        rawTestOutput: { type: 'string', description: 'The raw stack trace or test error output.' }
                    },
                    required: ['workspacePath', 'rawTestOutput']
                }
            },
            {
                name: 'execute_healing',
                description: 'Orchestrator tool that runs tests, diagnoses any failures, and optionally auto-commits simple fixes to the semantic memory.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        autoCommit: { type: 'boolean', description: 'True to automatically update memory with fixes.' },
                        cmd: { type: 'string', description: 'Optional custom test command (defaults to npm test)' }
                    },
                    required: ['workspacePath']
                }
            },
            {
                name: 'audit_dependencies',
                description: 'Run an npm audit, classify vulnerabilities by severity, and cross-reference with aigit architectural decisions.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                        autoFix: { type: 'boolean', description: 'True to auto-branch and run npm audit fix.' }
                    },
                    required: ['workspacePath']
                }
            },
            {
                name: 'get_healing_history',
                description: 'Retrieve the history of past test failures and dependency heal events.',
                inputSchema: {
                    type: 'object',
                    properties: {} // No arguments required
                }
            },
            // ── Red-Teaming & Security Tools ─────────────────
            {
                name: 'audit_semantic_decisions',
                description: 'Fetch the latest context decisions to review them for security loopholes, leaked secrets, or poor architectural patterns.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        limit: { type: 'number', description: 'Number of recent decisions to review (default: 50).' }
                    },
                    required: ['projectId']
                }
            },
            {
                name: 'flag_vulnerability',
                description: 'Log a specific security warning or task into the database based on an audited semantic decision.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'The UUID of the project.' },
                        title: { type: 'string', description: 'Short title of the vulnerability or risk found.' },
                        description: { type: 'string', description: 'Detailed description of the risk, including which decision it stems from.' },
                        severity: { type: 'string', description: 'Severity level (e.g. LOW, MEDIUM, HIGH, CRITICAL).' }
                    },
                    required: ['projectId', 'title', 'description', 'severity']
                }
            },
            {
                name: 'generate_architecture_docs',
                description: 'Generate ARCHITECTURE.md and a Mermaid DAG from the semantic memory ledger.',
                inputSchema: {
                    type: 'object',
                    properties: {},
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
            case 'commit_decision': {
                const args = request.params.arguments;
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                // Phase 23: Auto-resolve symbol from filePath + lineNumber
                let symName = args?.symbolName ? String(args.symbolName) : null;
                let symType = args?.symbolType ? String(args.symbolType) : null;
                let symRange = null;
                if (!symName && args?.filePath && args?.lineNumber) {
                    try {
                        const resolved = (0, resolver_1.resolveSymbolAtLine)(String(args.filePath), Number(args.lineNumber));
                        if (resolved) {
                            symName = resolved.qualifiedName;
                            symType = resolved.type;
                            symRange = (0, resolver_1.formatRange)(resolved.range);
                        }
                    }
                    catch { /* graceful fallback */ }
                }
                const decision = await db_1.prisma.decision.create({
                    data: {
                        taskId: String(args?.taskId),
                        gitBranch: branch,
                        context: String(args?.context),
                        chosen: String(args?.chosen),
                        rejected: args?.rejected,
                        reasoning: String(args?.reasoning),
                        filePath: args?.filePath ? String(args.filePath) : null,
                        lineNumber: args?.lineNumber ? Number(args.lineNumber) : null,
                        symbolName: symName,
                        symbolType: symType,
                        symbolRange: symRange,
                    }
                });
                const anchor = symName ? ` [⚓ @${symName}]` : (decision.filePath ? ` [📎 ${decision.filePath}]` : '');
                return { content: [{ type: 'text', text: `Decision recorded correctly.${anchor} ID: ${decision.id}` }] };
            }
            case 'commit_task': {
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
            case 'commit_memory': {
                const args = request.params.arguments;
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                // Phase 23: Auto-resolve symbol from filePath + lineNumber
                let cSymName = args?.symbolName ? String(args.symbolName) : null;
                let cSymType = args?.symbolType ? String(args.symbolType) : null;
                let cSymRange = null;
                if (!cSymName && args?.filePath && args?.lineNumber) {
                    try {
                        const resolved = (0, resolver_1.resolveSymbolAtLine)(String(args.filePath), Number(args.lineNumber));
                        if (resolved) {
                            cSymName = resolved.qualifiedName;
                            cSymType = resolved.type;
                            cSymRange = (0, resolver_1.formatRange)(resolved.range);
                        }
                    }
                    catch { /* graceful fallback */ }
                }
                const memory = await db_1.prisma.memory.create({
                    data: {
                        projectId: String(args?.projectId),
                        gitBranch: branch,
                        type: String(args?.type),
                        content: String(args?.content),
                        filePath: args?.filePath ? String(args.filePath) : null,
                        lineNumber: args?.lineNumber ? Number(args.lineNumber) : null,
                        symbolName: cSymName,
                        symbolType: cSymType,
                        symbolRange: cSymRange,
                    }
                });
                const anchor = cSymName ? ` [⚓ @${cSymName}]` : (memory.filePath ? ` [📎 ${memory.filePath}]` : '');
                return { content: [{ type: 'text', text: `✅ Context committed to branch [${branch}].${anchor} ID: ${memory.id}` }] };
            }
            case 'get_hydrated_context': {
                const args = request.params.arguments;
                const contextPayload = await (0, hydration_1.compileHydratedContext)(String(args?.workspacePath), args?.activeFile ? String(args?.activeFile) : undefined);
                return { content: [{ type: 'text', text: contextPayload }] };
            }
            case 'query_context': {
                const args = request.params.arguments;
                const results = await (0, search_1.semanticSearch)({
                    query: String(args?.query),
                    branch: args?.branch ? String(args.branch) : undefined,
                    filePath: args?.filePath ? String(args.filePath) : undefined,
                    symbolName: args?.symbolName ? String(args.symbolName) : undefined,
                    topK: args?.topK ? Number(args.topK) : 5,
                });
                if (results.length === 0) {
                    return { content: [{ type: 'text', text: 'No matching context found for your query.' }] };
                }
                const formatted = results.map((r, i) => `${i + 1}. [${r.type.toUpperCase()}] (score: ${r.score.toFixed(2)}) ${r.text}${r.filePath ? ` 📁 ${r.filePath}` : ''}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`).join('\n');
                return { content: [{ type: 'text', text: `🔍 Semantic Search Results:\n\n${formatted}` }] };
            }
            case 'query_historical': {
                const args = request.params.arguments;
                const result = (0, timeTravel_1.queryHistoricalContext)({
                    query: String(args?.query),
                    commitHash: String(args?.commitHash),
                    workspacePath: String(args?.workspacePath),
                    topK: args?.topK ? Number(args.topK) : 5,
                });
                if (!result.success) {
                    return { content: [{ type: 'text', text: `❌ ${result.error}` }], isError: true };
                }
                if (result.results.length === 0) {
                    return { content: [{ type: 'text', text: `No matching context found at commit ${result.commitHash}.` }] };
                }
                const formatted = result.results.map((r, i) => `${i + 1}. (score: ${r.score.toFixed(2)}) ${r.text}${r.filePath ? ` 📁 ${r.filePath}` : ''}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`).join('\n');
                return { content: [{ type: 'text', text: `🕰️ Time-Travel Query @ ${result.commitHash}:\n\n${formatted}` }] };
            }
            case 'get_symbol_context': {
                const args = request.params.arguments;
                const filePath = String(args?.filePath);
                let symName = args?.symbolName ? String(args.symbolName) : null;
                // Resolve symbol from line number if not provided directly
                if (!symName && args?.lineNumber) {
                    const resolved = (0, resolver_1.resolveSymbolAtLine)(filePath, Number(args.lineNumber));
                    if (resolved)
                        symName = resolved.qualifiedName;
                }
                if (!symName) {
                    return { content: [{ type: 'text', text: 'Could not resolve a code symbol at the given location.' }] };
                }
                const linked = await (0, resolver_1.findLinkedContext)(symName, filePath);
                const total = linked.memories.length + linked.decisions.length;
                if (total === 0) {
                    return { content: [{ type: 'text', text: `No context linked to @${symName}. This symbol has no associated memories or decisions.` }] };
                }
                return { content: [{ type: 'text', text: JSON.stringify({ symbol: symName, ...linked }, null, 2) }] };
            }
            case 'anchor_file': {
                const args = request.params.arguments;
                const result = await (0, resolver_1.anchorFileToSymbols)(String(args?.filePath), String(args?.workspacePath));
                return {
                    content: [{ type: 'text', text: `⚓ Anchored ${result.anchored}/${result.total} unlinked entries to code symbols in ${path.basename(String(args?.filePath))}.` }]
                };
            }
            case 'list_symbols': {
                const args = request.params.arguments;
                const symbols = (0, resolver_1.extractAllSymbols)(String(args?.filePath));
                if (symbols.length === 0) {
                    return { content: [{ type: 'text', text: 'No symbols found in this file.' }] };
                }
                const formatted = symbols.map(s => `${s.type} ${s.qualifiedName} (L${s.range.startLine}-${s.range.endLine})`).join('\n');
                return { content: [{ type: 'text', text: `📋 ${symbols.length} symbols in ${path.basename(String(args?.filePath))}:\n\n${formatted}` }] };
            }
            case 'revert_context': {
                const args = request.params.arguments;
                const targetId = String(args?.id);
                // Try memory first, then decision, then task
                const memory = await db_1.prisma.memory.findUnique({ where: { id: targetId } });
                if (memory) {
                    await db_1.prisma.memory.delete({ where: { id: targetId } });
                    return { content: [{ type: 'text', text: `✅ Memory deleted. ID: ${targetId}` }] };
                }
                const decision = await db_1.prisma.decision.findUnique({ where: { id: targetId } });
                if (decision) {
                    await db_1.prisma.decision.delete({ where: { id: targetId } });
                    return { content: [{ type: 'text', text: `✅ Decision reverted. ID: ${targetId}` }] };
                }
                const task = await db_1.prisma.task.findUnique({ where: { id: targetId } });
                if (task) {
                    await db_1.prisma.decision.deleteMany({ where: { taskId: targetId } });
                    await db_1.prisma.task.delete({ where: { id: targetId } });
                    return { content: [{ type: 'text', text: `✅ Task and its decisions deleted. ID: ${targetId}` }] };
                }
                return { content: [{ type: 'text', text: `⚠️ No memory, decision, or task found with ID: ${targetId}` }] };
            }
            case 'check_conflicts': {
                const args = request.params.arguments;
                const pId = String(args?.projectId);
                const currentBranch = (0, git_1.getActiveBranch)(String(args?.workspacePath));
                const targetBranch = String(args?.targetBranch);
                // Get decisions unique to each branch
                const [currentDecisions, targetDecisions] = await Promise.all([
                    db_1.prisma.decision.findMany({ where: { task: { projectId: pId }, gitBranch: currentBranch } }),
                    db_1.prisma.decision.findMany({ where: { task: { projectId: pId }, gitBranch: targetBranch } }),
                ]);
                // Find conflicts: decisions touching the same file or symbol
                const conflicts = [];
                for (const cd of currentDecisions) {
                    for (const td of targetDecisions) {
                        const sameFile = cd.filePath && td.filePath && cd.filePath === td.filePath;
                        const sameSymbol = cd.symbolName && td.symbolName && cd.symbolName === td.symbolName;
                        if (sameFile || sameSymbol) {
                            conflicts.push({
                                current: `${cd.context} → ${cd.chosen}`,
                                target: `${td.context} → ${td.chosen}`,
                                file: cd.filePath || td.filePath || undefined,
                                symbol: cd.symbolName || td.symbolName || undefined,
                            });
                        }
                    }
                }
                if (conflicts.length === 0) {
                    return { content: [{ type: 'text', text: `✅ No semantic conflicts between ${currentBranch} and ${targetBranch}.` }] };
                }
                const formatted = conflicts.map((c, i) => `${i + 1}. ${c.file ? `📁 ${c.file}` : ''}${c.symbol ? ` ⚓ @${c.symbol}` : ''}\n   Current: ${c.current}\n   Target: ${c.target}`).join('\n\n');
                return {
                    content: [{ type: 'text', text: `⚠️ ${conflicts.length} semantic conflict(s) between ${currentBranch} and ${targetBranch}:\n\n${formatted}` }]
                };
            }
            case 'merge_context': {
                const args = request.params.arguments;
                const pId = String(args?.projectId);
                const src = String(args?.sourceBranch);
                const tgt = String(args?.targetBranch);
                // Get all context from source branch
                const [memories, decisions, tasks] = await Promise.all([
                    db_1.prisma.memory.findMany({ where: { projectId: pId, gitBranch: src } }),
                    db_1.prisma.decision.findMany({ where: { task: { projectId: pId }, gitBranch: src } }),
                    db_1.prisma.task.findMany({ where: { projectId: pId, gitBranch: src } }),
                ]);
                let ported = 0;
                // Port memories
                for (const m of memories) {
                    const exists = await db_1.prisma.memory.findFirst({
                        where: { projectId: pId, gitBranch: tgt, content: m.content }
                    });
                    if (!exists) {
                        await db_1.prisma.memory.create({
                            data: {
                                projectId: m.projectId, gitBranch: tgt, type: m.type, content: m.content,
                                filePath: m.filePath, lineNumber: m.lineNumber,
                                symbolName: m.symbolName, symbolType: m.symbolType, symbolRange: m.symbolRange,
                            }
                        });
                        ported++;
                    }
                }
                // Port tasks and their decisions
                for (const t of tasks) {
                    const exists = await db_1.prisma.task.findFirst({
                        where: { projectId: pId, gitBranch: tgt, slug: t.slug }
                    });
                    if (!exists) {
                        const newTask = await db_1.prisma.task.create({
                            data: {
                                projectId: t.projectId, gitBranch: tgt, slug: t.slug, title: t.title, status: t.status,
                            }
                        });
                        // Port decisions for this task
                        const taskDecisions = decisions.filter(d => d.taskId === t.id);
                        for (const d of taskDecisions) {
                            await db_1.prisma.decision.create({
                                data: {
                                    taskId: newTask.id, gitBranch: tgt, context: d.context, chosen: d.chosen,
                                    rejected: d.rejected, reasoning: d.reasoning,
                                    filePath: d.filePath, lineNumber: d.lineNumber,
                                    symbolName: d.symbolName, symbolType: d.symbolType, symbolRange: d.symbolRange,
                                }
                            });
                            ported++;
                        }
                        ported++;
                    }
                }
                return {
                    content: [{ type: 'text', text: `🔀 Merged ${ported} context entries from ${src} → ${tgt}.` }]
                };
            }
            case 'scan_agents': {
                const args = request.params.arguments;
                const ws = String(args?.workspacePath);
                const toolDefs = [
                    { id: 'gemini', name: 'Google Gemini', files: ['GEMINI.md', 'AGENTS.md', '.gemini'] },
                    { id: 'claude', name: 'Claude Code', files: ['CLAUDE.md', '.claude'] },
                    { id: 'cursor', name: 'Cursor', files: ['.cursorrules', '.cursor'] },
                    { id: 'windsurf', name: 'Windsurf', files: ['.windsurfrules'] },
                    { id: 'cline', name: 'Cline / Roo', files: ['.clinerules'] },
                    { id: 'copilot', name: 'GitHub Copilot', files: ['.github/copilot-instructions.md'] },
                    { id: 'codex', name: 'OpenAI Codex', files: ['CODEX.md'] },
                    { id: 'aider', name: 'Aider', files: ['.aider.conf.yml', 'CONVENTIONS.md'] },
                ];
                const detected = toolDefs
                    .map(tool => {
                    const found = tool.files.filter(f => fs.existsSync(path.join(ws, f)));
                    return found.length > 0 ? { ...tool, foundFiles: found } : null;
                })
                    .filter(Boolean);
                if (detected.length === 0) {
                    return { content: [{ type: 'text', text: 'No AI coding tools detected in this workspace.' }] };
                }
                const formatted = detected.map(t => `🤖 ${t.name} (${t.id})\n   ${t.foundFiles.map(f => `• ${f}`).join('\n   ')}`).join('\n\n');
                return {
                    content: [{ type: 'text', text: `🔍 Detected ${detected.length} AI tool(s):\n\n${formatted}` }]
                };
            }
            // ── Swarm Orchestration Handlers ────────────────
            case 'register_agent': {
                const args = request.params.arguments;
                const agent = await (0, swarm_1.registerAgent)(String(args?.swarmId), String(args?.role), String(args?.agentName));
                const swarm = await (0, swarm_1.getSwarmStatus)(agent.swarmId);
                return {
                    content: [{ type: 'text', text: `🐝 Agent registered: ${agent.agentName} as ${agent.role} (Turn ${agent.turnOrder})\nSwarm status: ${swarm?.status}\nAgent ID: ${agent.id}` }]
                };
            }
            case 'unregister_agent': {
                const args = request.params.arguments;
                const agent = await (0, swarm_1.unregisterAgent)(String(args?.agentId));
                if (!agent) {
                    return { content: [{ type: 'text', text: '⚠️ Agent not found.' }] };
                }
                return { content: [{ type: 'text', text: `✅ Agent ${agent.agentName} (${agent.role}) removed from swarm.` }] };
            }
            case 'create_swarm': {
                const args = request.params.arguments;
                const branch = args?.workspacePath ? (0, git_1.getActiveBranch)(String(args.workspacePath)) : 'main';
                const subTasks = args?.subTasks || [];
                const swarm = await (0, swarm_1.createSwarm)(String(args?.projectId), String(args?.goal), branch, subTasks);
                const agentList = swarm?.agents.map(a => `   ${a.turnOrder}. 🔧 ${a.role}: ${a.taskSlug}`).join('\n') || '';
                return {
                    content: [{
                            type: 'text',
                            text: `🐝 Swarm created!\n   Goal: ${swarm?.goal}\n   Branch: ${branch}\n   Status: ${swarm?.status}\n   Swarm ID: ${swarm?.id}\n\n   Sub-tasks:\n${agentList}\n\n   Agents can join via: register_agent(swarmId: '${swarm?.id}', role: '...')`
                        }]
                };
            }
            case 'publish_message': {
                const args = request.params.arguments;
                const msg = await (0, swarm_1.publishMessage)(String(args?.agentId), String(args?.type), String(args?.channel), String(args?.payload));
                return {
                    content: [{ type: 'text', text: `📨 Message published (${msg.type} → ${msg.channel}). ID: ${msg.id}` }]
                };
            }
            case 'poll_messages': {
                const args = request.params.arguments;
                const since = args?.since ? new Date(String(args.since)) : undefined;
                const messages = await (0, swarm_1.pollMessages)(String(args?.agentId), since);
                if (messages.length === 0) {
                    return { content: [{ type: 'text', text: 'No new messages.' }] };
                }
                const formatted = messages.map(m => `[${m.fromAgent.role}→${m.channel}] (${m.type}) ${m.payload}${m.isConflict ? ' ⚠️ CONFLICT' : ''}`).join('\n');
                return { content: [{ type: 'text', text: `📬 ${messages.length} message(s):\n\n${formatted}` }] };
            }
            case 'update_agent_status': {
                const args = request.params.arguments;
                const agent = await (0, swarm_1.updateAgentStatus)(String(args?.agentId), String(args?.status));
                const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' }[agent.status] || '❓';
                return {
                    content: [{ type: 'text', text: `${emoji} Agent ${agent.agentName} status: ${agent.status}` }]
                };
            }
            case 'get_swarm_status': {
                const args = request.params.arguments;
                const swarm = await (0, swarm_1.getSwarmStatus)(String(args?.swarmId));
                if (!swarm) {
                    return { content: [{ type: 'text', text: '⚠️ Swarm not found.' }] };
                }
                const agentTable = swarm.agents.map(a => {
                    const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' }[a.status] || '❓';
                    return `   ${a.turnOrder}. ${emoji} ${a.agentName} (${a.role}) — ${a.status} [${a.taskSlug || 'no task'}]`;
                }).join('\n');
                const conflicts = swarm.messages.filter(m => m.isConflict && !m.resolved);
                const conflictInfo = conflicts.length > 0 ? `\n\n⚠️ ${conflicts.length} unresolved conflict(s)` : '';
                const recentMsgs = swarm.messages.slice(0, 5).map(m => `   [${m.fromAgent.role}→${m.channel}] ${m.type}: ${m.payload.substring(0, 80)}...`).join('\n');
                return {
                    content: [{
                            type: 'text',
                            text: `🐝 SWARM: ${swarm.goal}\n   Status: ${swarm.status} — Turn ${swarm.currentTurn}/${swarm.totalTurns}\n   Branch: ${swarm.gitBranch}\n\n   AGENTS:\n${agentTable}${conflictInfo}\n\n   RECENT MESSAGES:\n${recentMsgs || '   (none)'}`
                        }]
                };
            }
            case 'report_conflict': {
                const args = request.params.arguments;
                const conflict = await (0, conflict_1.reportConflict)(String(args?.agentId), String(args?.reason), String(args?.blockedDecision), args?.filePath ? String(args.filePath) : undefined, args?.symbolName ? String(args.symbolName) : undefined);
                return {
                    content: [{
                            type: 'text',
                            text: `⚠️ Conflict reported! Swarm HALTED.\n   Reason: ${args?.reason}\n   Blocked: ${args?.blockedDecision}\n   Conflict ID: ${conflict.id}\n\n   Developer must resolve via: resolve_conflict(messageId: '${conflict.id}', resolution: '...')`
                        }]
                };
            }
            case 'resolve_conflict': {
                const args = request.params.arguments;
                const resolved = await (0, conflict_1.resolveConflict)(String(args?.messageId), String(args?.resolution));
                return {
                    content: [{
                            type: 'text',
                            text: `✅ Conflict resolved: ${args?.resolution}\n   Message ID: ${resolved.id}\n   Swarm resumed.`
                        }]
                };
            }
            case 'diagnose_test_failure': {
                const args = request.params.arguments;
                const { diagnoseTestFailure } = require('./healing/diagnosis');
                const branch = args?.branch ? String(args.branch) : (0, git_1.getActiveBranch)(String(args?.workspacePath));
                const diagnosis = await diagnoseTestFailure(String(args?.rawTestOutput), String(args?.workspacePath), branch);
                return { content: [{ type: 'text', text: JSON.stringify(diagnosis, null, 2) }] };
            }
            case 'get_healing_plan': {
                const args = request.params.arguments;
                const { diagnoseTestFailure } = require('./healing/diagnosis');
                const { buildHealingPlan, formatHealPayload } = require('./healing/strategy');
                const branch = (0, git_1.getActiveBranch)(String(args?.workspacePath));
                const diagnosis = await diagnoseTestFailure(String(args?.rawTestOutput), String(args?.workspacePath), branch);
                const plan = buildHealingPlan(diagnosis);
                return { content: [{ type: 'text', text: formatHealPayload(plan) }] };
            }
            case 'execute_healing': {
                const args = request.params.arguments;
                const { healFromTestFailure } = require('./healing/runner');
                const result = await healFromTestFailure(String(args?.workspacePath), {
                    auto: !!args?.autoCommit,
                    cmd: args?.cmd ? String(args.cmd) : undefined,
                    quiet: true
                });
                return { content: [{ type: 'text', text: result.report }] };
            }
            case 'audit_dependencies': {
                const args = request.params.arguments;
                const { runAudit, buildDepHealPlan, executeDepAutoHeal } = require('./healing/depAudit');
                const workspacePath = String(args?.workspacePath);
                const audit = runAudit(workspacePath);
                const plan = await buildDepHealPlan(audit, workspacePath);
                let resultText = JSON.stringify(plan, null, 2);
                if (args?.autoFix && audit.fixableCount > 0) {
                    const healResult = executeDepAutoHeal(workspacePath, plan.branchName);
                    resultText += `\n\nAUTO-HEAL RESULT:\n${healResult.message}`;
                }
                return { content: [{ type: 'text', text: resultText }] };
            }
            case 'get_healing_history': {
                const { getHealingHistory } = require('./healing/runner');
                const history = await getHealingHistory();
                return { content: [{ type: 'text', text: history }] };
            }
            // ── Red-Teaming & Security Handlers ─────────────────
            case 'audit_semantic_decisions': {
                const args = request.params.arguments;
                const pId = String(args?.projectId);
                const limit = args?.limit ? Number(args.limit) : 50;
                const decisions = await db_1.prisma.decision.findMany({
                    where: { task: { projectId: pId } },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    include: { task: { select: { slug: true } } }
                });
                if (decisions.length === 0) {
                    return { content: [{ type: 'text', text: 'No recent semantic decisions found to audit.' }] };
                }
                const formatted = decisions.map(d => `[Decision ${d.id}]\nTask: ${d.task.slug}\nContext: ${d.context}\nChosen: ${d.chosen}\nReasoning: ${d.reasoning}\nFile: ${d.filePath || 'None'}@${d.symbolName || 'None'}\n`).join('\n---\n');
                return { content: [{ type: 'text', text: `🛡️ Security Audit Target:\n\n${formatted}` }] };
            }
            case 'flag_vulnerability': {
                const args = request.params.arguments;
                const pId = String(args?.projectId);
                // Create a special auto-generated task for the security vulnerability
                const task = await db_1.prisma.task.create({
                    data: {
                        projectId: pId,
                        slug: `security-audit-${Date.now()}`,
                        title: `[${args?.severity}] ${args?.title}`,
                        status: 'BLOCKED', // Require human or agent review
                    }
                });
                // Add the vulnerability detail as a synthetic "decision" / context blob
                await db_1.prisma.decision.create({
                    data: {
                        taskId: task.id,
                        context: `Security Audit Finding: ${args?.title}`,
                        chosen: 'VULNERABILITY FLAGGED',
                        rejected: [],
                        reasoning: String(args?.description),
                    }
                });
                return { content: [{ type: 'text', text: `🚨 Vulnerability flagged successfully and assigned to task [${task.slug}] (ID: ${task.id}).` }] };
            }
            case 'generate_architecture_docs': {
                const { generateArchitectureDocs } = require('./docs/generator');
                const project = await db_1.prisma.project.findFirst();
                if (!project)
                    return { content: [{ type: 'text', text: 'No project initialized.' }] };
                const workspacePath = process.cwd();
                const branch = (0, git_1.getActiveBranch)(workspacePath);
                try {
                    const mdContent = await generateArchitectureDocs(project.name, branch);
                    const outPath = path.join(workspacePath, 'ARCHITECTURE.md');
                    fs.writeFileSync(outPath, mdContent, 'utf-8');
                    return { content: [{ type: 'text', text: `✅ Successfully generated documentation at ${outPath}` }] };
                }
                catch (e) {
                    return { content: [{ type: 'text', text: `❌ Error generating documentation: ${e.message}` }], isError: true };
                }
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
