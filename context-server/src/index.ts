import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { compileHydratedContext } from './cli/hydration';
import { getActiveBranch } from './cli/git';
import { prisma, initializeDatabase } from './db';
import { resolveSymbolAtLine, extractAllSymbols, findLinkedContext, anchorFileToSymbols } from './ast/resolver';
import { semanticSearch } from './rag/search';
import { queryHistoricalContext } from './rag/timeTravel';
import { createSwarm, registerAgent, unregisterAgent, publishMessage, pollMessages, updateAgentStatus, getSwarmStatus } from './swarm/swarm';
import { reportConflict, resolveConflict } from './swarm/conflict';
import { diagnoseTestFailure } from './healing/diagnosis';
import { buildHealingPlan, formatHealPayload } from './healing/strategy';
import { healFromTestFailure, getHealingHistory } from './healing/runner';
import { runAudit, buildDepHealPlan, executeDepAutoHeal } from './healing/depAudit';
import { generateArchitectureDocs } from './docs/generator';
import { TOOL_SCHEMAS } from './tools/schemas';
import { resolveSymbolContext } from './tools/symbolUtils';
import { resolveProfile, filterByProfile } from './tools/profiles';
import {
    parseArgs,
    GetProjectHistoryArgs,
    GetActiveTaskStateArgs,
    CommitDecisionArgs,
    CommitTaskArgs,
    GetHydratedContextArgs,
    TakeNoteArgs,
    CommitMemoryArgs,
    QueryContextArgs,
    QueryHistoricalArgs,
    GetSymbolContextArgs,
    AnchorFileArgs,
    ListSymbolsArgs,
    RevertContextArgs,
    CheckConflictsArgs,
    MergeContextArgs,
    ScanAgentsArgs,
    RegisterAgentArgs,
    UnregisterAgentArgs,
    CreateSwarmArgs,
    PublishMessageArgs,
    PollMessagesArgs,
    UpdateAgentStatusArgs,
    GetSwarmStatusArgs,
    ReportConflictArgs,
    ResolveConflictArgs,
    DiagnoseTestFailureArgs,
    GetHealingPlanArgs,
    ExecuteHealingArgs,
    AuditDependenciesArgs,
    AuditSemanticDecisionsArgs,
    FlagVulnerabilityArgs,
    GenerateArchitectureDocsArgs,
} from './tools/argUtils';
import * as fs from 'fs';
import * as path from 'path';

const ACTIVE_PROFILE = resolveProfile();
const ACTIVE_TOOLS = filterByProfile(TOOL_SCHEMAS, ACTIVE_PROFILE);

const server = new Server(
    {
        name: 'ai-context-protocol-engine',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// ── Tool registry ─────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ACTIVE_TOOLS }));

// ── Validation error response helper ─────────────────────────────────────────
function validationError(toolName: string, error: string) {
    return {
        content: [{ type: 'text', text: `❌ [${toolName}] Invalid arguments: ${error}` }],
        isError: true,
    };
}

// ── Tool routing ──────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const raw = request.params.arguments;
    const tool = request.params.name;

    try {
        switch (tool) {
            case 'get_project_history': {
                const v = parseArgs(GetProjectHistoryArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, workspacePath } = v.data;
                const branch = workspacePath ? getActiveBranch(workspacePath) : 'main';
                const branches = branch === 'main' ? ['main'] : ['main', branch];

                const [memories, decisions] = await Promise.all([
                    prisma.memory.findMany({ where: { projectId, gitBranch: { in: branches } } }),
                    prisma.decision.findMany({ where: { task: { projectId }, gitBranch: { in: branches } } })
                ]);
                return { content: [{ type: 'text', text: JSON.stringify({ memories, decisions }, null, 2) }] };
            }

            case 'get_active_task_state': {
                const v = parseArgs(GetActiveTaskStateArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, workspacePath } = v.data;
                const branch = workspacePath ? getActiveBranch(workspacePath) : 'main';

                const tasks = await prisma.task.findMany({
                    where: { projectId, status: { not: 'DONE' }, gitBranch: branch },
                    include: { decisions: true }
                });
                return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
            }

            case 'commit_decision': {
                const v = parseArgs(CommitDecisionArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { taskId, context, chosen, rejected, reasoning, filePath, lineNumber, workspacePath } = v.data;
                const branch = workspacePath ? getActiveBranch(workspacePath) : 'main';
                const { symName, symType, symRange } = resolveSymbolContext(v.data as Record<string, unknown>);

                const decision = await prisma.decision.create({
                    data: {
                        taskId, gitBranch: branch, context, chosen,
                        rejected: rejected as string[],
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
                const v = parseArgs(CommitTaskArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, slug, title, workspacePath } = v.data;
                const branch = workspacePath ? getActiveBranch(workspacePath) : 'main';

                const task = await prisma.task.create({
                    data: { projectId, slug, title, gitBranch: branch, status: 'PLANNING' }
                });
                return { content: [{ type: 'text', text: `Task Context successfully created on branch [${branch}]. ID: ${task.id} (Slug: ${task.slug}.md)` }] };
            }

            case 'take_note': {
                const v = parseArgs(TakeNoteArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, workspacePath, message, scope, isDecision, issueRef } = v.data;
                const branch = getActiveBranch(workspacePath);
                const { dumpContextLedger } = await import('./cli/sync');

                const memory = await prisma.memory.create({
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
                const v = parseArgs(CommitMemoryArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, workspacePath, type, content, filePath, lineNumber } = v.data;
                const branch = getActiveBranch(workspacePath);
                const { symName, symType, symRange } = resolveSymbolContext(v.data as Record<string, unknown>);

                const memory = await prisma.memory.create({
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
                const v = parseArgs(GetHydratedContextArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const contextPayload = await compileHydratedContext(v.data.workspacePath, v.data.activeFile);
                return { content: [{ type: 'text', text: contextPayload }] };
            }

            case 'query_context': {
                const v = parseArgs(QueryContextArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const results = await semanticSearch({
                    query: v.data.query,
                    branch: v.data.branch,
                    filePath: v.data.filePath,
                    symbolName: v.data.symbolName,
                    topK: v.data.topK ?? 5,
                });

                if (results.length === 0) {
                    return { content: [{ type: 'text', text: 'No matching context found for your query.' }] };
                }

                const formatted = results.map((r, i) =>
                    `${i + 1}. [${r.type.toUpperCase()}] (score: ${r.score.toFixed(2)}) ${r.text}${r.filePath ? ` 📁 ${r.filePath}` : ''}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`
                ).join('\n');

                return { content: [{ type: 'text', text: `🔍 Semantic Search Results:\n\n${formatted}` }] };
            }

            case 'query_historical': {
                const v = parseArgs(QueryHistoricalArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const result = queryHistoricalContext({
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

                const formatted = result.results.map((r, i) =>
                    `${i + 1}. (score: ${r.score.toFixed(2)}) ${r.text}${r.filePath ? ` 📁 ${r.filePath}` : ''}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`
                ).join('\n');

                return { content: [{ type: 'text', text: `🕰️ Time-Travel Query @ ${result.commitHash}:\n\n${formatted}` }] };
            }

            case 'get_symbol_context': {
                const v = parseArgs(GetSymbolContextArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { filePath, lineNumber, symbolName } = v.data;
                let symName = symbolName ?? null;

                if (!symName && lineNumber) {
                    const resolved = resolveSymbolAtLine(filePath, lineNumber);
                    if (resolved) symName = resolved.qualifiedName;
                }

                if (!symName) {
                    return { content: [{ type: 'text', text: 'Could not resolve a code symbol at the given location.' }] };
                }

                const linked = await findLinkedContext(symName, filePath);
                const total = linked.memories.length + linked.decisions.length;

                if (total === 0) {
                    return { content: [{ type: 'text', text: `No context linked to @${symName}. This symbol has no associated memories or decisions.` }] };
                }

                return { content: [{ type: 'text', text: JSON.stringify({ symbol: symName, ...linked }, null, 2) }] };
            }

            case 'anchor_file': {
                const v = parseArgs(AnchorFileArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const result = await anchorFileToSymbols(v.data.filePath, v.data.workspacePath);
                return {
                    content: [{ type: 'text', text: `⚓ Anchored ${result.anchored}/${result.total} unlinked entries to code symbols in ${path.basename(v.data.filePath)}.` }]
                };
            }

            case 'list_symbols': {
                const v = parseArgs(ListSymbolsArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const symbols = extractAllSymbols(v.data.filePath);

                if (symbols.length === 0) {
                    return { content: [{ type: 'text', text: 'No symbols found in this file.' }] };
                }

                const formatted = symbols.map(s =>
                    `${s.type} ${s.qualifiedName} (L${s.range.startLine}-${s.range.endLine})`
                ).join('\n');

                return { content: [{ type: 'text', text: `📋 ${symbols.length} symbols in ${path.basename(v.data.filePath)}:\n\n${formatted}` }] };
            }

            case 'revert_context': {
                const v = parseArgs(RevertContextArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const targetId = v.data.id;

                const memory = await prisma.memory.findUnique({ where: { id: targetId } });
                if (memory) {
                    await prisma.memory.delete({ where: { id: targetId } });
                    return { content: [{ type: 'text', text: `✅ Memory deleted. ID: ${targetId}` }] };
                }

                const decision = await prisma.decision.findUnique({ where: { id: targetId } });
                if (decision) {
                    await prisma.decision.delete({ where: { id: targetId } });
                    return { content: [{ type: 'text', text: `✅ Decision reverted. ID: ${targetId}` }] };
                }

                const task = await prisma.task.findUnique({ where: { id: targetId } });
                if (task) {
                    await prisma.decision.deleteMany({ where: { taskId: targetId } });
                    await prisma.task.delete({ where: { id: targetId } });
                    return { content: [{ type: 'text', text: `✅ Task and its decisions deleted. ID: ${targetId}` }] };
                }

                return { content: [{ type: 'text', text: `⚠️ No memory, decision, or task found with ID: ${targetId}` }] };
            }

            case 'check_conflicts': {
                const v = parseArgs(CheckConflictsArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, workspacePath, targetBranch } = v.data;
                const currentBranch = getActiveBranch(workspacePath);

                const [currentDecisions, targetDecisions] = await Promise.all([
                    prisma.decision.findMany({ where: { task: { projectId }, gitBranch: currentBranch } }),
                    prisma.decision.findMany({ where: { task: { projectId }, gitBranch: targetBranch } }),
                ]);

                const conflicts: Array<{ current: string; target: string; file?: string; symbol?: string }> = [];

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

                const formatted = conflicts.map((c, i) =>
                    `${i + 1}. ${c.file ? `📁 ${c.file}` : ''}${c.symbol ? ` ⚓ @${c.symbol}` : ''}\n   Current: ${c.current}\n   Target: ${c.target}`
                ).join('\n\n');

                return {
                    content: [{ type: 'text', text: `⚠️ ${conflicts.length} semantic conflict(s) between ${currentBranch} and ${targetBranch}:\n\n${formatted}` }]
                };
            }

            case 'merge_context': {
                const v = parseArgs(MergeContextArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, sourceBranch: src, targetBranch: tgt } = v.data;

                const [memories, decisions, tasks, targetMemories, targetTasks] = await Promise.all([
                    prisma.memory.findMany({ where: { projectId, gitBranch: src } }),
                    prisma.decision.findMany({ where: { task: { projectId }, gitBranch: src } }),
                    prisma.task.findMany({ where: { projectId, gitBranch: src } }),
                    prisma.memory.findMany({ where: { projectId, gitBranch: tgt }, select: { content: true } }),
                    prisma.task.findMany({ where: { projectId, gitBranch: tgt }, select: { slug: true } })
                ]);

                let ported = 0;

                // 1. Bulk process memories
                if (memories.length > 0) {
                    const existingMemories = await prisma.memory.findMany({
                        where: { projectId, gitBranch: tgt },
                        select: { content: true }
                    });
                    const existingContentSet = new Set(existingMemories.map(m => m.content));

                    const newMemoriesData = memories
                        .filter(m => !existingContentSet.has(m.content))
                        .map(m => ({
                            projectId: m.projectId, gitBranch: tgt, type: m.type, content: m.content,
                            filePath: m.filePath, lineNumber: m.lineNumber,
                            symbolName: m.symbolName, symbolType: m.symbolType, symbolRange: m.symbolRange,
                        }));

                    if (newMemoriesData.length > 0) {
                        await prisma.memory.createMany({ data: newMemoriesData });
                        ported += newMemoriesData.length;
                    }
                }

                // 2. Bulk process tasks
                if (tasks.length > 0) {
                    const existingTasks = await prisma.task.findMany({
                        where: { projectId, gitBranch: tgt },
                        select: { slug: true }
                    });
                    const existingSlugSet = new Set(existingTasks.map(t => t.slug));

                    const newTasks = tasks.filter(t => !existingSlugSet.has(t.slug));

                    if (newTasks.length > 0) {
                        // Pre-group decisions by source taskId to avoid O(N*M) filtering inside the loop
                        const decisionsByTaskId = new Map<string, typeof decisions>();
                        for (const d of decisions) {
                            let group = decisionsByTaskId.get(d.taskId);
                            if (!group) {
                                group = [];
                                decisionsByTaskId.set(d.taskId, group);
                            }
                            group.push(d);
                        }

                        // Create tasks individually to get their new IDs for associating decisions.
                        // We still save N queries by not checking existence individually.
                        for (const t of newTasks) {
                            const newTask = await prisma.task.create({
                                data: {
                                    projectId: t.projectId, gitBranch: tgt, slug: t.slug, title: t.title, status: t.status,
                                }
                            });
                            ported++;

                            const taskDecisions = decisionsByTaskId.get(t.id);
                            if (taskDecisions && taskDecisions.length > 0) {
                                await prisma.decision.createMany({
                                    data: taskDecisions.map(d => ({
                                        taskId: newTask.id, gitBranch: tgt, context: d.context, chosen: d.chosen,
                                        rejected: d.rejected as string[], reasoning: d.reasoning,
                                        filePath: d.filePath, lineNumber: d.lineNumber,
                                        symbolName: d.symbolName, symbolType: d.symbolType, symbolRange: d.symbolRange,
                                    }))
                                });
                                ported += taskDecisions.length;
                            }
                        }
                    }
                }



                return {
                    content: [{ type: 'text', text: `🔀 Merged ${ported} context entries from ${src} → ${tgt}.` }]
                };
            }

            case 'scan_agents': {
                const v = parseArgs(ScanAgentsArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
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

                const formatted = detected.map(t =>
                    `🤖 ${t!.name} (${t!.id})\n   ${t!.foundFiles.map(f => `• ${f}`).join('\n   ')}`
                ).join('\n\n');

                return {
                    content: [{ type: 'text', text: `🔍 Detected ${detected.length} AI tool(s):\n\n${formatted}` }]
                };
            }

            // ── Swarm Orchestration Handlers ──────────────────────────────────

            case 'register_agent': {
                const v = parseArgs(RegisterAgentArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const agent = await registerAgent(v.data.swarmId, v.data.role, v.data.agentName);
                const swarm = await getSwarmStatus(agent.swarmId);
                return {
                    content: [{ type: 'text', text: `🐝 Agent registered: ${agent.agentName} as ${agent.role} (Turn ${agent.turnOrder})\nSwarm status: ${swarm?.status}\nAgent ID: ${agent.id}` }]
                };
            }

            case 'unregister_agent': {
                const v = parseArgs(UnregisterAgentArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const agent = await unregisterAgent(v.data.agentId);
                if (!agent) {
                    return { content: [{ type: 'text', text: '⚠️ Agent not found.' }] };
                }
                return { content: [{ type: 'text', text: `✅ Agent ${agent.agentName} (${agent.role}) removed from swarm.` }] };
            }

            case 'create_swarm': {
                const v = parseArgs(CreateSwarmArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, goal, workspacePath, subTasks } = v.data;
                const branch = workspacePath ? getActiveBranch(workspacePath) : 'main';

                const swarm = await createSwarm(projectId, goal, branch, subTasks);
                const agentList = swarm?.agents.map(a => `   ${a.turnOrder}. 🔧 ${a.role}: ${a.taskSlug}`).join('\n') || '';

                return {
                    content: [{
                        type: 'text',
                        text: `🐝 Swarm created!\n   Goal: ${swarm?.goal}\n   Branch: ${branch}\n   Status: ${swarm?.status}\n   Swarm ID: ${swarm?.id}\n\n   Sub-tasks:\n${agentList}\n\n   Agents can join via: register_agent(swarmId: '${swarm?.id}', role: '...')`
                    }]
                };
            }

            case 'publish_message': {
                const v = parseArgs(PublishMessageArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const msg = await publishMessage(v.data.agentId, v.data.type, v.data.channel, v.data.payload);
                return {
                    content: [{ type: 'text', text: `📨 Message published (${msg.type} → ${msg.channel}). ID: ${msg.id}` }]
                };
            }

            case 'poll_messages': {
                const v = parseArgs(PollMessagesArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const since = v.data.since ? new Date(v.data.since) : undefined;
                const messages = await pollMessages(v.data.agentId, since);

                if (messages.length === 0) {
                    return { content: [{ type: 'text', text: 'No new messages.' }] };
                }

                const formatted = messages.map(m =>
                    `[${m.fromAgent.role}→${m.channel}] (${m.type}) ${m.payload}${m.isConflict ? ' ⚠️ CONFLICT' : ''}`
                ).join('\n');

                return { content: [{ type: 'text', text: `📬 ${messages.length} message(s):\n\n${formatted}` }] };
            }

            case 'update_agent_status': {
                const v = parseArgs(UpdateAgentStatusArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const agent = await updateAgentStatus(v.data.agentId, v.data.status);
                const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' }[agent.status] || '❓';
                return {
                    content: [{ type: 'text', text: `${emoji} Agent ${agent.agentName} status: ${agent.status}` }]
                };
            }

            case 'get_swarm_status': {
                const v = parseArgs(GetSwarmStatusArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const swarm = await getSwarmStatus(v.data.swarmId);

                if (!swarm) {
                    return { content: [{ type: 'text', text: '⚠️ Swarm not found.' }] };
                }

                const agentTable = swarm.agents.map(a => {
                    const emoji = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' }[a.status] || '❓';
                    return `   ${a.turnOrder}. ${emoji} ${a.agentName} (${a.role}) — ${a.status} [${a.taskSlug || 'no task'}]`;
                }).join('\n');

                const unresolved = swarm.messages.filter(m => m.isConflict && !m.resolved);
                const conflictInfo = unresolved.length > 0 ? `\n\n⚠️ ${unresolved.length} unresolved conflict(s)` : '';

                const recentMsgs = swarm.messages.slice(0, 5).map(m =>
                    `   [${m.fromAgent.role}→${m.channel}] ${m.type}: ${m.payload.substring(0, 80)}...`
                ).join('\n');

                return {
                    content: [{
                        type: 'text',
                        text: `🐝 SWARM: ${swarm.goal}\n   Status: ${swarm.status} — Turn ${swarm.currentTurn}/${swarm.totalTurns}\n   Branch: ${swarm.gitBranch}\n\n   AGENTS:\n${agentTable}${conflictInfo}\n\n   RECENT MESSAGES:\n${recentMsgs || '   (none)'}`
                    }]
                };
            }

            case 'report_conflict': {
                const v = parseArgs(ReportConflictArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const conflict = await reportConflict(
                    v.data.agentId, v.data.reason, v.data.blockedDecision,
                    v.data.filePath, v.data.symbolName
                );
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ Conflict reported! Swarm HALTED.\n   Reason: ${v.data.reason}\n   Blocked: ${v.data.blockedDecision}\n   Conflict ID: ${conflict.id}\n\n   Developer must resolve via: resolve_conflict(messageId: '${conflict.id}', resolution: '...')`
                    }]
                };
            }

            case 'resolve_conflict': {
                const v = parseArgs(ResolveConflictArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const resolved = await resolveConflict(v.data.messageId, v.data.resolution);
                return {
                    content: [{
                        type: 'text',
                        text: `✅ Conflict resolved: ${v.data.resolution}\n   Message ID: ${resolved.id}\n   Swarm resumed.`
                    }]
                };
            }

            // ── Self-Healing Codebases Handlers ───────────────────────────────

            case 'diagnose_test_failure': {
                const v = parseArgs(DiagnoseTestFailureArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const branch = v.data.branch ?? getActiveBranch(v.data.workspacePath);
                const diagnosis = await diagnoseTestFailure(v.data.rawTestOutput, v.data.workspacePath, branch);
                return { content: [{ type: 'text', text: JSON.stringify(diagnosis, null, 2) }] };
            }

            case 'get_healing_plan': {
                const v = parseArgs(GetHealingPlanArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const branch = getActiveBranch(v.data.workspacePath);
                const diagnosis = await diagnoseTestFailure(v.data.rawTestOutput, v.data.workspacePath, branch);
                const plan = buildHealingPlan(diagnosis);
                return { content: [{ type: 'text', text: formatHealPayload(plan) }] };
            }

            case 'execute_healing': {
                const v = parseArgs(ExecuteHealingArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const result = await healFromTestFailure(v.data.workspacePath, {
                    auto: !!v.data.autoCommit,
                    cmd: v.data.cmd,
                    quiet: true
                });
                return { content: [{ type: 'text', text: result.report }] };
            }

            case 'audit_dependencies': {
                const v = parseArgs(AuditDependenciesArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { workspacePath } = v.data;

                const audit = runAudit(workspacePath);
                const plan = await buildDepHealPlan(audit, workspacePath);

                let resultText = JSON.stringify(plan, null, 2);
                if (v.data.autoFix && audit.fixableCount > 0) {
                    const healResult = executeDepAutoHeal(workspacePath, plan.branchName);
                    resultText += `\n\nAUTO-HEAL RESULT:\n${healResult.message}`;
                }

                return { content: [{ type: 'text', text: resultText }] };
            }

            case 'get_healing_history': {
                const history = await getHealingHistory();
                return { content: [{ type: 'text', text: history }] };
            }

            // ── Red-Teaming & Security Handlers ──────────────────────────────

            case 'audit_semantic_decisions': {
                const v = parseArgs(AuditSemanticDecisionsArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, limit = 50 } = v.data;

                const decisions = await prisma.decision.findMany({
                    where: { task: { projectId } },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    include: { task: { select: { slug: true } } }
                });

                if (decisions.length === 0) {
                    return { content: [{ type: 'text', text: 'No recent semantic decisions found to audit.' }] };
                }

                const formatted = decisions.map(d =>
                    `[Decision ${d.id}]\nTask: ${d.task.slug}\nContext: ${d.context}\nChosen: ${d.chosen}\nReasoning: ${d.reasoning}\nFile: ${d.filePath || 'None'}@${d.symbolName || 'None'}\n`
                ).join('\n---\n');

                return { content: [{ type: 'text', text: `🛡️ Security Audit Target:\n\n${formatted}` }] };
            }

            case 'flag_vulnerability': {
                const v = parseArgs(FlagVulnerabilityArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { projectId, title, description, severity } = v.data;

                const task = await prisma.task.create({
                    data: {
                        projectId,
                        slug: `security-audit-${Date.now()}`,
                        title: `[${severity}] ${title}`,
                        status: 'BLOCKED',
                    }
                });

                await prisma.decision.create({
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
                const v = parseArgs(GenerateArchitectureDocsArgs, raw);
                if (!v.ok) return validationError(tool, v.error);
                const { workspacePath } = v.data;

                const project = await prisma.project.findFirst();
                if (!project) return { content: [{ type: 'text', text: 'No project initialized.' }] };

                const branch = getActiveBranch(workspacePath);

                try {
                    const mdContent = await generateArchitectureDocs(project.name, branch);
                    const outPath = path.join(workspacePath, 'ARCHITECTURE.md');
                    fs.writeFileSync(outPath, mdContent, 'utf-8');
                    return { content: [{ type: 'text', text: `✅ Successfully generated documentation at ${outPath}` }] };
                } catch (e: any) {
                    return { content: [{ type: 'text', text: `❌ Error generating documentation: ${e.message}` }], isError: true };
                }
            }

            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${tool}`);
        }
    } catch (error) {
        return {
            content: [{ type: 'text', text: `MCP Server Error in ${tool}: ${(error as Error).message}` }],
            isError: true,
        };
    }
});

async function main() {
    await initializeDatabase();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    const profileLabel = ACTIVE_PROFILE === 'all'
        ? `all ${ACTIVE_TOOLS.length} tools`
        : `${ACTIVE_PROFILE} profile (${ACTIVE_TOOLS.length} tools)`;
    console.error(`[AI Context Protocol Engine] MCP Server running — ${profileLabel}.`);
}

main().catch(console.error);
