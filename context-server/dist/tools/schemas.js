"use strict";
/**
 * MCP tool schema definitions.
 * All schemas include enum constraints and additionalProperties: false
 * to prevent invalid inputs from reaching Prisma.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_SCHEMAS = void 0;
exports.TOOL_SCHEMAS = [
    // ── Core Memory & Context ─────────────────────────────────
    {
        name: 'get_project_history',
        description: 'Read the long-term semantic memory and architectural decisions made previously on the project.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                workspacePath: { type: 'string', description: 'Optional. Filter to branch derived from this workspace.' },
            },
            required: ['projectId']
        }
    },
    {
        name: 'get_active_task_state',
        description: 'Read the currently active (incomplete) tasks and handovers assigned to agents.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                workspacePath: { type: 'string', description: 'Optional. Used to detect current branch.' },
            },
            required: ['projectId']
        }
    },
    {
        name: 'commit_decision',
        description: 'Contextually log an architectural or code decision to the active task (equivalent to `aigit commit decision`). Externalizes the intent. If filePath and lineNumber are provided, the decision will be auto-anchored to the enclosing code symbol (function, class, method).',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                taskId: { type: 'string', description: 'The UUID of the current task.' },
                context: { type: 'string', description: 'What problem required a decision?' },
                chosen: { type: 'string', description: 'What approach was ultimately chosen?' },
                rejected: { type: 'array', items: { type: 'string' }, description: 'What approaches were rejected?' },
                reasoning: { type: 'string', description: 'Why was that approach chosen over the rejected ones?' },
                filePath: { type: 'string', description: 'Optional. The file path this decision is anchored to.' },
                lineNumber: { type: 'number', description: 'Optional. The line number this decision is anchored to.' },
                symbolName: { type: 'string', description: 'Optional. The code symbol name to anchor this decision to (e.g. "initRedisClient"). Auto-resolved from filePath+lineNumber if omitted.' },
                symbolType: { type: 'string', enum: ['function', 'class', 'method', 'export', 'variable'], description: 'Optional. Symbol type.' },
                workspacePath: { type: 'string', description: 'Optional. The root directory (used to detect branch).' },
            },
            required: ['taskId', 'context', 'chosen', 'rejected', 'reasoning']
        }
    },
    {
        name: 'commit_task',
        description: 'Orchestrate a context handoff by creating a new task stub to offload work to a separate specialized agent (equivalent to `aigit commit task`).',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                slug: { type: 'string', description: 'The task-slug identifier, mapping to the markdown file (e.g., auth-setup).' },
                title: { type: 'string', description: 'Human-readable title for the task.' },
                workspacePath: { type: 'string', description: 'Optional. The root directory (used to detect branch).' },
            },
            required: ['projectId', 'slug', 'title']
        }
    },
    {
        name: 'get_hydrated_context',
        description: 'Compile an environment-aware system prompt dynamically based on Git branch, active files, and project type.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                activeFile: { type: 'string', description: 'Optional path to the file currently being edited.' }
            },
            required: ['workspacePath']
        }
    },
    {
        name: 'take_note',
        description: 'Instantly capture a manual context note, architectural decision, or mid-sprint "why" directly into the semantic vector space without waiting for a commit hook (equivalent to `aigit note`).',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                message: { type: 'string', description: 'The note message to capture.' },
                scope: { type: 'string', description: 'Optional. A specific directory or file to bind the note to.' },
                isDecision: { type: 'boolean', description: 'Optional. Set to true to categorize this note as an architectural decision.' },
                issueRef: { type: 'string', description: 'Optional. An external issue tracker reference (e.g. "ENG-404", "#45").' }
            },
            required: ['projectId', 'workspacePath', 'message']
        }
    },
    {
        name: 'commit_memory',
        description: 'Explicitly commits learned patterns, architectural rules, or documentation into the workspace Git-aligned memory (equivalent to `aigit commit memory`). If filePath and lineNumber are provided, the memory will be auto-anchored to the enclosing code symbol.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                workspacePath: { type: 'string', description: 'The root directory of the workspace (used to detect current git branch).' },
                type: {
                    type: 'string',
                    enum: ['architecture', 'capability', 'pattern', 'convention', 'context', 'human_note'],
                    description: 'Memory type.'
                },
                content: { type: 'string', description: 'The explicit memory learned to store.' },
                filePath: { type: 'string', description: 'Optional. The file path this memory is anchored to.' },
                lineNumber: { type: 'number', description: 'Optional. The line number this memory is anchored to.' },
                symbolName: { type: 'string', description: 'Optional. The code symbol name to anchor this memory to. Auto-resolved from filePath+lineNumber if omitted.' },
                symbolType: { type: 'string', enum: ['function', 'class', 'method', 'export', 'variable'], description: 'Optional. Symbol type.' }
            },
            required: ['projectId', 'workspacePath', 'type', 'content']
        }
    },
    {
        name: 'query_context',
        description: 'Semantic search across the current project memory. Ask questions like "Why did we choose Redis?" and get ranked results.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                query: { type: 'string', description: 'Natural language question to search for.' },
                branch: { type: 'string', description: 'Optional. Filter to a specific branch.' },
                filePath: { type: 'string', description: 'Optional. Filter to memories linked to a specific file.' },
                symbolName: { type: 'string', description: 'Optional. Filter to memories linked to a specific code symbol.' },
                topK: { type: 'number', minimum: 1, maximum: 50, description: 'Number of results to return (default: 5, max: 50).' }
            },
            required: ['query']
        }
    },
    {
        name: 'query_historical',
        description: 'Time-traveling semantic search. Query the project memory as it existed at a specific Git commit hash.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                query: { type: 'string', description: 'Natural language question to search for.' },
                commitHash: { type: 'string', description: 'The Git commit hash to travel back to.' },
                workspacePath: { type: 'string', description: 'The root directory of the workspace.' },
                topK: { type: 'number', minimum: 1, maximum: 50, description: 'Number of results to return (default: 5).' }
            },
            required: ['query', 'commitHash', 'workspacePath']
        }
    },
    // ── AST & Symbol Analysis ─────────────────────────────────
    {
        name: 'get_symbol_context',
        description: 'Get all linked memories and decisions for a specific code symbol. Provide a file path and line number, and this tool returns all context anchored to the enclosing function/class/method.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
            properties: {
                id: { type: 'string', description: 'The UUID of the memory, decision, or task to delete.' }
            },
            required: ['id']
        }
    },
    // ── Branch & Conflict Tools ───────────────────────────────
    {
        name: 'check_conflicts',
        description: 'Detect semantic conflicts between the current branch and a target branch. Finds decisions that might conflict before merging.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
            properties: {
                workspacePath: { type: 'string', description: 'The root directory of the workspace.' }
            },
            required: ['workspacePath']
        }
    },
    // ── Swarm Orchestration ───────────────────────────────────
    {
        name: 'register_agent',
        description: 'Register an AI agent into a swarm session with a specific role. Each agent declares its role (e.g. backend-specialist, security-auditor) to participate in turn-taking.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                goal: { type: 'string', description: 'The high-level goal for the swarm.' },
                workspacePath: { type: 'string', description: 'Workspace root for branch detection.' },
                subTasks: {
                    type: 'array',
                    description: 'List of sub-tasks with role, slug, and description.',
                    items: {
                        type: 'object',
                        additionalProperties: false,
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
            additionalProperties: false,
            properties: {
                agentId: { type: 'string', description: 'The sending agent ID.' },
                type: {
                    type: 'string',
                    enum: ['context', 'decision', 'directive', 'status'],
                    description: 'Message type.'
                },
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
            additionalProperties: false,
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
            additionalProperties: false,
            properties: {
                agentId: { type: 'string', description: 'The agent ID.' },
                status: {
                    type: 'string',
                    enum: ['IDLE', 'WORKING', 'DONE', 'BLOCKED'],
                    description: 'New status.'
                }
            },
            required: ['agentId', 'status']
        }
    },
    {
        name: 'get_swarm_status',
        description: 'Get the full status of a swarm session including all agents, recent messages, and conflicts.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
            properties: {
                messageId: { type: 'string', description: 'The conflict message ID to resolve.' },
                resolution: { type: 'string', description: 'The resolution decision.' }
            },
            required: ['messageId', 'resolution']
        }
    },
    // ── Self-Healing ──────────────────────────────────────────
    {
        name: 'diagnose_test_failure',
        description: 'Diagnose a test failure by parsing the stack trace, extracting symbols, and querying semantic memory for related decisions/architecture.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
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
            additionalProperties: false,
            properties: {}
        }
    },
    // ── Red-Teaming & Security ────────────────────────────────
    {
        name: 'audit_semantic_decisions',
        description: 'Fetch the latest context decisions to review them for security loopholes, leaked secrets, or poor architectural patterns.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                limit: { type: 'number', minimum: 1, maximum: 200, description: 'Number of recent decisions to review (default: 50).' }
            },
            required: ['projectId']
        }
    },
    {
        name: 'flag_vulnerability',
        description: 'Log a specific security warning or task into the database based on an audited semantic decision.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                projectId: { type: 'string', description: 'The UUID of the project.' },
                title: { type: 'string', description: 'Short title of the vulnerability or risk found.' },
                description: { type: 'string', description: 'Detailed description of the risk, including which decision it stems from.' },
                severity: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    description: 'Severity level.'
                }
            },
            required: ['projectId', 'title', 'description', 'severity']
        }
    },
    {
        name: 'generate_architecture_docs',
        description: 'Generate ARCHITECTURE.md and a Mermaid DAG from the semantic memory ledger.',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                workspacePath: { type: 'string', description: 'The root directory of the workspace where ARCHITECTURE.md will be written.' }
            },
            required: ['workspacePath']
        }
    },
];
