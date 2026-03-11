"use strict";
/**
 * MCP tool argument validation utilities.
 * Uses Zod to parse and validate tool inputs before they reach Prisma,
 * preventing runtime errors from undefined/invalid values.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSymbolContext = exports.GenerateArchitectureDocsArgs = exports.FlagVulnerabilityArgs = exports.AuditSemanticDecisionsArgs = exports.AuditDependenciesArgs = exports.ExecuteHealingArgs = exports.GetHealingPlanArgs = exports.DiagnoseTestFailureArgs = exports.ResolveConflictArgs = exports.ReportConflictArgs = exports.GetSwarmStatusArgs = exports.UpdateAgentStatusArgs = exports.PollMessagesArgs = exports.PublishMessageArgs = exports.CreateSwarmArgs = exports.UnregisterAgentArgs = exports.RegisterAgentArgs = exports.ScanAgentsArgs = exports.MergeContextArgs = exports.CheckConflictsArgs = exports.RevertContextArgs = exports.ListSymbolsArgs = exports.AnchorFileArgs = exports.GetSymbolContextArgs = exports.QueryHistoricalArgs = exports.QueryContextArgs = exports.CommitMemoryArgs = exports.TakeNoteArgs = exports.GetHydratedContextArgs = exports.CommitTaskArgs = exports.CommitDecisionArgs = exports.GetActiveTaskStateArgs = exports.GetProjectHistoryArgs = void 0;
exports.parseArgs = parseArgs;
const zod_1 = require("zod");
// ── Shared primitives ─────────────────────────────────────────────────────────
const uuid = zod_1.z.string().uuid();
const nonEmpty = zod_1.z.string().min(1);
const workspacePath = zod_1.z.string().min(1);
const optionalPath = zod_1.z.string().optional();
const optionalLineNum = zod_1.z.number().int().positive().optional();
const topK = zod_1.z.number().int().min(1).max(50).optional();
const SymbolType = zod_1.z.enum(['function', 'class', 'method', 'export', 'variable']).optional();
// ── Tool argument schemas ─────────────────────────────────────────────────────
exports.GetProjectHistoryArgs = zod_1.z.object({
    projectId: uuid,
    workspacePath: workspacePath.optional(),
});
exports.GetActiveTaskStateArgs = zod_1.z.object({
    projectId: uuid,
    workspacePath: workspacePath.optional(),
});
exports.CommitDecisionArgs = zod_1.z.object({
    taskId: uuid,
    context: nonEmpty,
    chosen: nonEmpty,
    rejected: zod_1.z.array(zod_1.z.string()).default([]),
    reasoning: nonEmpty,
    filePath: optionalPath,
    lineNumber: optionalLineNum,
    symbolName: zod_1.z.string().optional(),
    symbolType: SymbolType,
    workspacePath: workspacePath.optional(),
});
exports.CommitTaskArgs = zod_1.z.object({
    projectId: uuid,
    slug: nonEmpty,
    title: nonEmpty,
    workspacePath: workspacePath.optional(),
});
exports.GetHydratedContextArgs = zod_1.z.object({
    workspacePath,
    activeFile: optionalPath,
});
exports.TakeNoteArgs = zod_1.z.object({
    projectId: uuid,
    workspacePath,
    message: nonEmpty,
    scope: optionalPath,
    isDecision: zod_1.z.boolean().optional(),
    issueRef: zod_1.z.string().optional(),
});
exports.CommitMemoryArgs = zod_1.z.object({
    projectId: uuid,
    workspacePath,
    type: zod_1.z.enum(['architecture', 'capability', 'pattern', 'convention', 'context', 'human_note']),
    content: nonEmpty,
    filePath: optionalPath,
    lineNumber: optionalLineNum,
    symbolName: zod_1.z.string().optional(),
    symbolType: SymbolType,
});
exports.QueryContextArgs = zod_1.z.object({
    query: nonEmpty,
    branch: zod_1.z.string().optional(),
    filePath: optionalPath,
    symbolName: zod_1.z.string().optional(),
    topK,
});
exports.QueryHistoricalArgs = zod_1.z.object({
    query: nonEmpty,
    commitHash: nonEmpty,
    workspacePath,
    topK,
});
exports.GetSymbolContextArgs = zod_1.z.object({
    filePath: nonEmpty,
    lineNumber: optionalLineNum,
    symbolName: zod_1.z.string().optional(),
});
exports.AnchorFileArgs = zod_1.z.object({
    filePath: nonEmpty,
    workspacePath,
});
exports.ListSymbolsArgs = zod_1.z.object({
    filePath: nonEmpty,
});
exports.RevertContextArgs = zod_1.z.object({
    id: nonEmpty,
});
exports.CheckConflictsArgs = zod_1.z.object({
    projectId: uuid,
    workspacePath,
    targetBranch: nonEmpty,
});
exports.MergeContextArgs = zod_1.z.object({
    projectId: uuid,
    sourceBranch: nonEmpty,
    targetBranch: nonEmpty,
});
exports.ScanAgentsArgs = zod_1.z.object({
    workspacePath,
});
exports.RegisterAgentArgs = zod_1.z.object({
    swarmId: nonEmpty,
    role: nonEmpty,
    agentName: nonEmpty,
});
exports.UnregisterAgentArgs = zod_1.z.object({
    agentId: nonEmpty,
});
exports.CreateSwarmArgs = zod_1.z.object({
    projectId: uuid,
    goal: nonEmpty,
    workspacePath: workspacePath.optional(),
    subTasks: zod_1.z.array(zod_1.z.object({
        role: nonEmpty,
        slug: nonEmpty,
        description: nonEmpty,
    })).default([]),
});
exports.PublishMessageArgs = zod_1.z.object({
    agentId: nonEmpty,
    type: zod_1.z.enum(['context', 'decision', 'directive', 'status']),
    channel: nonEmpty,
    payload: nonEmpty,
});
exports.PollMessagesArgs = zod_1.z.object({
    agentId: nonEmpty,
    since: zod_1.z.string().datetime().optional(),
});
exports.UpdateAgentStatusArgs = zod_1.z.object({
    agentId: nonEmpty,
    status: zod_1.z.enum(['IDLE', 'WORKING', 'DONE', 'BLOCKED']),
});
exports.GetSwarmStatusArgs = zod_1.z.object({
    swarmId: nonEmpty,
});
exports.ReportConflictArgs = zod_1.z.object({
    agentId: nonEmpty,
    reason: nonEmpty,
    blockedDecision: nonEmpty,
    filePath: optionalPath,
    symbolName: zod_1.z.string().optional(),
});
exports.ResolveConflictArgs = zod_1.z.object({
    messageId: nonEmpty,
    resolution: nonEmpty,
});
exports.DiagnoseTestFailureArgs = zod_1.z.object({
    workspacePath,
    rawTestOutput: nonEmpty,
    branch: zod_1.z.string().optional(),
});
exports.GetHealingPlanArgs = zod_1.z.object({
    workspacePath,
    rawTestOutput: nonEmpty,
});
exports.ExecuteHealingArgs = zod_1.z.object({
    workspacePath,
    autoCommit: zod_1.z.boolean().optional(),
    cmd: zod_1.z.string().optional(),
});
exports.AuditDependenciesArgs = zod_1.z.object({
    workspacePath,
    autoFix: zod_1.z.boolean().optional(),
});
exports.AuditSemanticDecisionsArgs = zod_1.z.object({
    projectId: uuid,
    limit: zod_1.z.number().int().min(1).max(200).optional(),
});
exports.FlagVulnerabilityArgs = zod_1.z.object({
    projectId: uuid,
    title: nonEmpty,
    description: nonEmpty,
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});
exports.GenerateArchitectureDocsArgs = zod_1.z.object({
    workspacePath,
});
// ── Validation helper ─────────────────────────────────────────────────────────
/**
 * Parse and validate tool arguments with a Zod schema.
 * Returns `{ ok: true, data }` or `{ ok: false, error }`.
 */
function parseArgs(schema, raw) {
    const result = schema.safeParse(raw);
    if (result.success)
        return { ok: true, data: result.data };
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: issues };
}
// ── Preserved original helpers ────────────────────────────────────────────────
/** Resolve enclosing symbol from filePath + lineNumber args (shared by commit_decision, commit_memory) */
var symbolUtils_1 = require("./symbolUtils");
Object.defineProperty(exports, "resolveSymbolContext", { enumerable: true, get: function () { return symbolUtils_1.resolveSymbolContext; } });
