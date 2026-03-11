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
const diagnosis_1 = require("./healing/diagnosis");
const strategy_1 = require("./healing/strategy");
const runner_1 = require("./healing/runner");
const depAudit_1 = require("./healing/depAudit");
const generator_1 = require("./docs/generator");
const schemas_1 = require("./tools/schemas");
const symbolUtils_1 = require("./tools/symbolUtils");
const profiles_1 = require("./tools/profiles");
const argUtils_1 = require("./tools/argUtils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ACTIVE_PROFILE = (0, profiles_1.resolveProfile)();
const ACTIVE_TOOLS = (0, profiles_1.filterByProfile)(schemas_1.TOOL_SCHEMAS, ACTIVE_PROFILE);
const server = new index_js_1.Server({
    name: 'ai-context-protocol-engine',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// ── Tool registry ─────────────────────────────────────────────────────────────
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({ tools: ACTIVE_TOOLS }));
// ── Validation error response helper ─────────────────────────────────────────
function validationError(toolName, error) {
    return {
        content: [{ type: 'text', text: `❌ [${toolName}] Invalid arguments: ${error}` }],
        isError: true,
    };
}
// ── Tool routing ──────────────────────────────────────────────────────────────
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const raw = request.params.arguments;
    const tool = request.params.name;
    try {
        switch (tool) {
            case 'get_project_history': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GetProjectHistoryArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, workspacePath } = v.data;
                const branch = workspacePath ? (0, git_1.getActiveBranch)(workspacePath) : 'main';
                const branches = branch === 'main' ? ['main'] : ['main', branch];
                const [memories, decisions] = await Promise.all([
                    db_1.prisma.memory.findMany({ where: { projectId, gitBranch: { in: branches } } }),
                    db_1.prisma.decision.findMany({ where: { task: { projectId }, gitBranch: { in: branches } } })
                ]);
                return { content: [{ type: 'text', text: JSON.stringify({ memories, decisions }, null, 2) }] };
            }
            case 'get_active_task_state': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GetActiveTaskStateArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, workspacePath } = v.data;
                const branch = workspacePath ? (0, git_1.getActiveBranch)(workspacePath) : 'main';
                const tasks = await db_1.prisma.task.findMany({
                    where: { projectId, status: { not: 'DONE' }, gitBranch: branch },
                    include: { decisions: true }
                });
                return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
            }
            case 'commit_decision': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.CommitDecisionArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { taskId, context, chosen, rejected, reasoning, filePath, lineNumber, workspacePath } = v.data;
                const branch = workspacePath ? (0, git_1.getActiveBranch)(workspacePath) : 'main';
                const { symName, symType, symRange } = (0, symbolUtils_1.resolveSymbolContext)(v.data);
                const decision = await db_1.prisma.decision.create({
                    data: {
                        taskId, gitBranch: branch, context, chosen,
                        rejected: rejected,
                        reasoning,
                        filePath: filePath ?? null,
                        lineNumber: lineNumber ?? null,
                        symbolName: symName, symbolType: symType, symbolRange: symRange,
                    }
                });
                const anchor = symName ? ` [⚓ @${symName}]` : (filePath ? ` [📎 ${filePath}]` : '');
                return { content: [{ type: 'text', text: `Decision recorded correctly.${anchor} ID: ${decision.id}` }] };
            }
            case 'commit_task': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.CommitTaskArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, slug, title, workspacePath } = v.data;
                const branch = workspacePath ? (0, git_1.getActiveBranch)(workspacePath) : 'main';
                const task = await db_1.prisma.task.create({
                    data: { projectId, slug, title, gitBranch: branch, status: 'PLANNING' }
                });
                return { content: [{ type: 'text', text: `Task Context successfully created on branch [${branch}]. ID: ${task.id} (Slug: ${task.slug}.md)` }] };
            }
            case 'take_note': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.TakeNoteArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, workspacePath, message, scope, isDecision, issueRef } = v.data;
                const branch = (0, git_1.getActiveBranch)(workspacePath);
                const { dumpContextLedger } = await Promise.resolve().then(() => __importStar(require('./cli/sync')));
                const memory = await db_1.prisma.memory.create({
                    data: {
                        projectId, gitBranch: branch,
                        type: isDecision ? 'architecture' : 'human_note',
                        content: message,
                        filePath: scope ?? null,
                        issueRef: issueRef ?? null,
                    }
                });
                await dumpContextLedger(workspacePath);
                const issueTag = memory.issueRef ? ` 🔗 ${memory.issueRef}` : '';
                return { content: [{ type: 'text', text: `✅ [aigit note] Context captured on branch [${branch}].${issueTag} ID: ${memory.id}` }] };
            }
            case 'commit_memory': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, workspacePath, type, content, filePath, lineNumber } = v.data;
                const branch = (0, git_1.getActiveBranch)(workspacePath);
                const { symName, symType, symRange } = (0, symbolUtils_1.resolveSymbolContext)(v.data);
                const memory = await db_1.prisma.memory.create({
                    data: {
                        projectId, gitBranch: branch, type, content,
                        filePath: filePath ?? null,
                        lineNumber: lineNumber ?? null,
                        symbolName: symName, symbolType: symType, symbolRange: symRange,
                    }
                });
                const anchor = symName ? ` [⚓ @${symName}]` : (filePath ? ` [📎 ${filePath}]` : '');
                return { content: [{ type: 'text', text: `✅ Context committed to branch [${branch}].${anchor} ID: ${memory.id}` }] };
            }
            case 'get_hydrated_context': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GetHydratedContextArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const contextPayload = await (0, hydration_1.compileHydratedContext)(v.data.workspacePath, v.data.activeFile);
                return { content: [{ type: 'text', text: contextPayload }] };
            }
            case 'query_context': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.QueryContextArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const results = await (0, search_1.semanticSearch)({
                    query: v.data.query,
                    branch: v.data.branch,
                    filePath: v.data.filePath,
                    symbolName: v.data.symbolName,
                    topK: v.data.topK ?? 5,
                });
                if (results.length === 0) {
                    return { content: [{ type: 'text', text: 'No matching context found for your query.' }] };
                }
                const formatted = results.map((r, i) => `${i + 1}. [${r.type.toUpperCase()}] (score: ${r.score.toFixed(2)}) ${r.text}${r.filePath ? ` 📁 ${r.filePath}` : ''}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`).join('\n');
                return { content: [{ type: 'text', text: `🔍 Semantic Search Results:\n\n${formatted}` }] };
            }
            case 'query_historical': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.QueryHistoricalArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const result = (0, timeTravel_1.queryHistoricalContext)({
                    query: v.data.query,
                    commitHash: v.data.commitHash,
                    workspacePath: v.data.workspacePath,
                    topK: v.data.topK ?? 5,
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
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GetSymbolContextArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { filePath, lineNumber, symbolName } = v.data;
                let symName = symbolName ?? null;
                if (!symName && lineNumber) {
                    const resolved = (0, resolver_1.resolveSymbolAtLine)(filePath, lineNumber);
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
                const v = (0, argUtils_1.parseArgs)(argUtils_1.AnchorFileArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const result = await (0, resolver_1.anchorFileToSymbols)(v.data.filePath, v.data.workspacePath);
                return {
                    content: [{ type: 'text', text: `⚓ Anchored ${result.anchored}/${result.total} unlinked entries to code symbols in ${path.basename(v.data.filePath)}.` }]
                };
            }
            case 'list_symbols': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.ListSymbolsArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const symbols = (0, resolver_1.extractAllSymbols)(v.data.filePath);
                if (symbols.length === 0) {
                    return { content: [{ type: 'text', text: 'No symbols found in this file.' }] };
                }
                const formatted = symbols.map(s => `${s.type} ${s.qualifiedName} (L${s.range.startLine}-${s.range.endLine})`).join('\n');
                return { content: [{ type: 'text', text: `📋 ${symbols.length} symbols in ${path.basename(v.data.filePath)}:\n\n${formatted}` }] };
            }
            case 'revert_context': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.RevertContextArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const targetId = v.data.id;
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
                const v = (0, argUtils_1.parseArgs)(argUtils_1.CheckConflictsArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, workspacePath, targetBranch } = v.data;
                const currentBranch = (0, git_1.getActiveBranch)(workspacePath);
                const [currentDecisions, targetDecisions] = await Promise.all([
                    db_1.prisma.decision.findMany({ where: { task: { projectId }, gitBranch: currentBranch } }),
                    db_1.prisma.decision.findMany({ where: { task: { projectId }, gitBranch: targetBranch } }),
                ]);
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
                const v = (0, argUtils_1.parseArgs)(argUtils_1.MergeContextArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, sourceBranch: src, targetBranch: tgt } = v.data;
                const [memories, decisions, tasks] = await Promise.all([
                    db_1.prisma.memory.findMany({ where: { projectId, gitBranch: src } }),
                    db_1.prisma.decision.findMany({ where: { task: { projectId }, gitBranch: src } }),
                    db_1.prisma.task.findMany({ where: { projectId, gitBranch: src } }),
                ]);
                let ported = 0;
                for (const m of memories) {
                    const exists = await db_1.prisma.memory.findFirst({
                        where: { projectId, gitBranch: tgt, content: m.content }
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
                for (const t of tasks) {
                    const exists = await db_1.prisma.task.findFirst({
                        where: { projectId, gitBranch: tgt, slug: t.slug }
                    });
                    if (!exists) {
                        const newTask = await db_1.prisma.task.create({
                            data: {
                                projectId: t.projectId, gitBranch: tgt, slug: t.slug, title: t.title, status: t.status,
                            }
                        });
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
                const v = (0, argUtils_1.parseArgs)(argUtils_1.ScanAgentsArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { workspacePath: ws } = v.data;
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
                    .map(t => {
                    const found = t.files.filter(f => fs.existsSync(path.join(ws, f)));
                    return found.length > 0 ? { ...t, foundFiles: found } : null;
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
            // ── Swarm Orchestration Handlers ──────────────────────────────────
            case 'register_agent': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.RegisterAgentArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const agent = await (0, swarm_1.registerAgent)(v.data.swarmId, v.data.role, v.data.agentName);
                const swarm = await (0, swarm_1.getSwarmStatus)(agent.swarmId);
                return {
                    content: [{ type: 'text', text: `🐝 Agent registered: ${agent.agentName} as ${agent.role} (Turn ${agent.turnOrder})\nSwarm status: ${swarm?.status}\nAgent ID: ${agent.id}` }]
                };
            }
            case 'unregister_agent': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.UnregisterAgentArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const agent = await (0, swarm_1.unregisterAgent)(v.data.agentId);
                if (!agent) {
                    return { content: [{ type: 'text', text: '⚠️ Agent not found.' }] };
                }
                return { content: [{ type: 'text', text: `✅ Agent ${agent.agentName} (${agent.role}) removed from swarm.` }] };
            }
            case 'create_swarm': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.CreateSwarmArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, goal, workspacePath, subTasks } = v.data;
                const branch = workspacePath ? (0, git_1.getActiveBranch)(workspacePath) : 'main';
                const swarm = await (0, swarm_1.createSwarm)(projectId, goal, branch, subTasks);
                const agentList = swarm?.agents.map(a => `   ${a.turnOrder}. 🔧 ${a.role}: ${a.taskSlug}`).join('\n') || '';
                return {
                    content: [{
                            type: 'text',
                            text: `🐝 Swarm created!\n   Goal: ${swarm?.goal}\n   Branch: ${branch}\n   Status: ${swarm?.status}\n   Swarm ID: ${swarm?.id}\n\n   Sub-tasks:\n${agentList}\n\n   Agents can join via: register_agent(swarmId: '${swarm?.id}', role: '...')`
                        }]
                };
            }
            case 'publish_message': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.PublishMessageArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const msg = await (0, swarm_1.publishMessage)(v.data.agentId, v.data.type, v.data.channel, v.data.payload);
                return {
                    content: [{ type: 'text', text: `📨 Message published (${msg.type} → ${msg.channel}). ID: ${msg.id}` }]
                };
            }
            case 'poll_messages': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.PollMessagesArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const since = v.data.since ? new Date(v.data.since) : undefined;
                const messages = await (0, swarm_1.pollMessages)(v.data.agentId, since);
                if (messages.length === 0) {
                    return { content: [{ type: 'text', text: 'No new messages.' }] };
                }
                const formatted = messages.map(m => `[${m.fromAgent.role}→${m.channel}] (${m.type}) ${m.payload}${m.isConflict ? ' ⚠️ CONFLICT' : ''}`).join('\n');
                return { content: [{ type: 'text', text: `📬 ${messages.length} message(s):\n\n${formatted}` }] };
            }
            case 'update_agent_status': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.UpdateAgentStatusArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const agent = await (0, swarm_1.updateAgentStatus)(v.data.agentId, v.data.status);
                const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' }[agent.status] || '❓';
                return {
                    content: [{ type: 'text', text: `${emoji} Agent ${agent.agentName} status: ${agent.status}` }]
                };
            }
            case 'get_swarm_status': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GetSwarmStatusArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const swarm = await (0, swarm_1.getSwarmStatus)(v.data.swarmId);
                if (!swarm) {
                    return { content: [{ type: 'text', text: '⚠️ Swarm not found.' }] };
                }
                const agentTable = swarm.agents.map(a => {
                    const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' }[a.status] || '❓';
                    return `   ${a.turnOrder}. ${emoji} ${a.agentName} (${a.role}) — ${a.status} [${a.taskSlug || 'no task'}]`;
                }).join('\n');
                const unresolved = swarm.messages.filter(m => m.isConflict && !m.resolved);
                const conflictInfo = unresolved.length > 0 ? `\n\n⚠️ ${unresolved.length} unresolved conflict(s)` : '';
                const recentMsgs = swarm.messages.slice(0, 5).map(m => `   [${m.fromAgent.role}→${m.channel}] ${m.type}: ${m.payload.substring(0, 80)}...`).join('\n');
                return {
                    content: [{
                            type: 'text',
                            text: `🐝 SWARM: ${swarm.goal}\n   Status: ${swarm.status} — Turn ${swarm.currentTurn}/${swarm.totalTurns}\n   Branch: ${swarm.gitBranch}\n\n   AGENTS:\n${agentTable}${conflictInfo}\n\n   RECENT MESSAGES:\n${recentMsgs || '   (none)'}`
                        }]
                };
            }
            case 'report_conflict': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.ReportConflictArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const conflict = await (0, conflict_1.reportConflict)(v.data.agentId, v.data.reason, v.data.blockedDecision, v.data.filePath, v.data.symbolName);
                return {
                    content: [{
                            type: 'text',
                            text: `⚠️ Conflict reported! Swarm HALTED.\n   Reason: ${v.data.reason}\n   Blocked: ${v.data.blockedDecision}\n   Conflict ID: ${conflict.id}\n\n   Developer must resolve via: resolve_conflict(messageId: '${conflict.id}', resolution: '...')`
                        }]
                };
            }
            case 'resolve_conflict': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.ResolveConflictArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const resolved = await (0, conflict_1.resolveConflict)(v.data.messageId, v.data.resolution);
                return {
                    content: [{
                            type: 'text',
                            text: `✅ Conflict resolved: ${v.data.resolution}\n   Message ID: ${resolved.id}\n   Swarm resumed.`
                        }]
                };
            }
            // ── Self-Healing Codebases Handlers ───────────────────────────────
            case 'diagnose_test_failure': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.DiagnoseTestFailureArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const branch = v.data.branch ?? (0, git_1.getActiveBranch)(v.data.workspacePath);
                const diagnosis = await (0, diagnosis_1.diagnoseTestFailure)(v.data.rawTestOutput, v.data.workspacePath, branch);
                return { content: [{ type: 'text', text: JSON.stringify(diagnosis, null, 2) }] };
            }
            case 'get_healing_plan': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GetHealingPlanArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const branch = (0, git_1.getActiveBranch)(v.data.workspacePath);
                const diagnosis = await (0, diagnosis_1.diagnoseTestFailure)(v.data.rawTestOutput, v.data.workspacePath, branch);
                const plan = (0, strategy_1.buildHealingPlan)(diagnosis);
                return { content: [{ type: 'text', text: (0, strategy_1.formatHealPayload)(plan) }] };
            }
            case 'execute_healing': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.ExecuteHealingArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const result = await (0, runner_1.healFromTestFailure)(v.data.workspacePath, {
                    auto: !!v.data.autoCommit,
                    cmd: v.data.cmd,
                    quiet: true
                });
                return { content: [{ type: 'text', text: result.report }] };
            }
            case 'audit_dependencies': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.AuditDependenciesArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { workspacePath } = v.data;
                const audit = (0, depAudit_1.runAudit)(workspacePath);
                const plan = await (0, depAudit_1.buildDepHealPlan)(audit, workspacePath);
                let resultText = JSON.stringify(plan, null, 2);
                if (v.data.autoFix && audit.fixableCount > 0) {
                    const healResult = (0, depAudit_1.executeDepAutoHeal)(workspacePath, plan.branchName);
                    resultText += `\n\nAUTO-HEAL RESULT:\n${healResult.message}`;
                }
                return { content: [{ type: 'text', text: resultText }] };
            }
            case 'get_healing_history': {
                const history = await (0, runner_1.getHealingHistory)();
                return { content: [{ type: 'text', text: history }] };
            }
            // ── Red-Teaming & Security Handlers ──────────────────────────────
            case 'audit_semantic_decisions': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.AuditSemanticDecisionsArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, limit = 50 } = v.data;
                const decisions = await db_1.prisma.decision.findMany({
                    where: { task: { projectId } },
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
                const v = (0, argUtils_1.parseArgs)(argUtils_1.FlagVulnerabilityArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { projectId, title, description, severity } = v.data;
                const task = await db_1.prisma.task.create({
                    data: {
                        projectId,
                        slug: `security-audit-${Date.now()}`,
                        title: `[${severity}] ${title}`,
                        status: 'BLOCKED',
                    }
                });
                await db_1.prisma.decision.create({
                    data: {
                        taskId: task.id,
                        context: `Security Audit Finding: ${title}`,
                        chosen: 'VULNERABILITY FLAGGED',
                        rejected: [],
                        reasoning: description,
                    }
                });
                return { content: [{ type: 'text', text: `🚨 Vulnerability flagged successfully and assigned to task [${task.slug}] (ID: ${task.id}).` }] };
            }
            case 'generate_architecture_docs': {
                const v = (0, argUtils_1.parseArgs)(argUtils_1.GenerateArchitectureDocsArgs, raw);
                if (!v.ok)
                    return validationError(tool, v.error);
                const { workspacePath } = v.data;
                const project = await db_1.prisma.project.findFirst();
                if (!project)
                    return { content: [{ type: 'text', text: 'No project initialized.' }] };
                const branch = (0, git_1.getActiveBranch)(workspacePath);
                try {
                    const mdContent = await (0, generator_1.generateArchitectureDocs)(project.name, branch);
                    const outPath = path.join(workspacePath, 'ARCHITECTURE.md');
                    fs.writeFileSync(outPath, mdContent, 'utf-8');
                    return { content: [{ type: 'text', text: `✅ Successfully generated documentation at ${outPath}` }] };
                }
                catch (e) {
                    return { content: [{ type: 'text', text: `❌ Error generating documentation: ${e.message}` }], isError: true };
                }
            }
            default:
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${tool}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: 'text', text: `MCP Server Error in ${tool}: ${error.message}` }],
            isError: true,
        };
    }
});
async function main() {
    await (0, db_1.initializeDatabase)();
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    const profileLabel = ACTIVE_PROFILE === 'all'
        ? `all ${ACTIVE_TOOLS.length} tools`
        : `${ACTIVE_PROFILE} profile (${ACTIVE_TOOLS.length} tools)`;
    console.error(`[AI Context Protocol Engine] MCP Server running — ${profileLabel}.`);
}
main().catch(console.error);
