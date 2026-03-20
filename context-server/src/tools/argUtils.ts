/**
 * MCP tool argument validation utilities.
 * Uses Zod to parse and validate tool inputs before they reach Prisma,
 * preventing runtime errors from undefined/invalid values.
 */

import { z } from 'zod';

// ── Shared primitives ─────────────────────────────────────────────────────────

const uuid = z.string().uuid();
const nonEmpty = z.string().min(1);
const workspacePath = z.string().min(1);
const optionalPath = z.string().optional();
const optionalLineNum = z.number().int().positive().optional();
const topK = z.number().int().min(1).max(50).optional();

const SymbolType = z.enum(['function', 'class', 'method', 'export', 'variable']).optional();

// ── Tool argument schemas ─────────────────────────────────────────────────────

export const GetProjectHistoryArgs = z.object({
    projectId: uuid,
    workspacePath: workspacePath.optional(),
});

export const GetActiveTaskStateArgs = z.object({
    projectId: uuid,
    workspacePath: workspacePath.optional(),
});

export const CommitDecisionArgs = z.object({
    taskId: uuid,
    context: nonEmpty,
    chosen: nonEmpty,
    rejected: z.array(z.string()).default([]),
    reasoning: nonEmpty,
    filePath: optionalPath,
    lineNumber: optionalLineNum,
    symbolName: z.string().optional(),
    symbolType: SymbolType,
    workspacePath: workspacePath.optional(),
    agentName: z.string().optional(),
});

export const CommitTaskArgs = z.object({
    projectId: uuid,
    slug: nonEmpty,
    title: nonEmpty,
    workspacePath: workspacePath.optional(),
});

export const GetHydratedContextArgs = z.object({
    workspacePath,
    activeFile: optionalPath,
});

export const TakeNoteArgs = z.object({
    projectId: uuid,
    workspacePath,
    message: nonEmpty,
    scope: optionalPath,
    isDecision: z.boolean().optional(),
    issueRef: z.string().optional(),
    agentName: z.string().optional(),
});

export const CommitMemoryArgs = z.object({
    projectId: uuid,
    workspacePath,
    type: z.enum(['architecture', 'capability', 'pattern', 'convention', 'context', 'human_note']),
    content: nonEmpty,
    filePath: optionalPath,
    lineNumber: optionalLineNum,
    symbolName: z.string().optional(),
    symbolType: SymbolType,
    agentName: z.string().optional(),
});

export const QueryContextArgs = z.object({
    query: nonEmpty,
    branch: z.string().optional(),
    filePath: optionalPath,
    symbolName: z.string().optional(),
    topK,
});

export const QueryHistoricalArgs = z.object({
    query: nonEmpty,
    commitHash: nonEmpty,
    workspacePath,
    topK,
});

export const GetSymbolContextArgs = z.object({
    filePath: nonEmpty,
    lineNumber: optionalLineNum,
    symbolName: z.string().optional(),
});

export const AnchorFileArgs = z.object({
    filePath: nonEmpty,
    workspacePath,
});

export const ListSymbolsArgs = z.object({
    filePath: nonEmpty,
});

export const RevertContextArgs = z.object({
    id: nonEmpty,
});

export const CheckConflictsArgs = z.object({
    projectId: uuid,
    workspacePath,
    targetBranch: nonEmpty,
});

export const MergeContextArgs = z.object({
    projectId: uuid,
    sourceBranch: nonEmpty,
    targetBranch: nonEmpty,
});

export const ScanAgentsArgs = z.object({
    workspacePath,
});

export const RegisterAgentArgs = z.object({
    swarmId: nonEmpty,
    role: nonEmpty,
    agentName: nonEmpty,
});

export const UnregisterAgentArgs = z.object({
    agentId: nonEmpty,
});

export const CreateSwarmArgs = z.object({
    projectId: uuid,
    goal: nonEmpty,
    workspacePath: workspacePath.optional(),
    subTasks: z.array(z.object({
        role: nonEmpty,
        slug: nonEmpty,
        description: nonEmpty,
    })).default([]),
});

export const PublishMessageArgs = z.object({
    agentId: nonEmpty,
    type: z.enum(['context', 'decision', 'directive', 'status']),
    channel: nonEmpty,
    payload: nonEmpty,
});

export const PollMessagesArgs = z.object({
    agentId: nonEmpty,
    since: z.string().datetime().optional(),
});

export const UpdateAgentStatusArgs = z.object({
    agentId: nonEmpty,
    status: z.enum(['IDLE', 'WORKING', 'DONE', 'BLOCKED']),
});

export const GetSwarmStatusArgs = z.object({
    swarmId: nonEmpty,
});

export const ReportConflictArgs = z.object({
    agentId: nonEmpty,
    reason: nonEmpty,
    blockedDecision: nonEmpty,
    filePath: optionalPath,
    symbolName: z.string().optional(),
});

export const ResolveConflictArgs = z.object({
    messageId: nonEmpty,
    resolution: nonEmpty,
});

export const DiagnoseTestFailureArgs = z.object({
    workspacePath,
    rawTestOutput: nonEmpty,
    branch: z.string().optional(),
});

export const GetHealingPlanArgs = z.object({
    workspacePath,
    rawTestOutput: nonEmpty,
});

export const ExecuteHealingArgs = z.object({
    workspacePath,
    autoCommit: z.boolean().optional(),
    cmd: z.string().optional(),
});

export const AuditDependenciesArgs = z.object({
    workspacePath,
    autoFix: z.boolean().optional(),
});

export const AuditSemanticDecisionsArgs = z.object({
    projectId: uuid,
    limit: z.number().int().min(1).max(200).optional(),
});

export const FlagVulnerabilityArgs = z.object({
    projectId: uuid,
    title: nonEmpty,
    description: nonEmpty,
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export const GenerateArchitectureDocsArgs = z.object({
    workspacePath,
});

export const SemanticBisectArgs = z.object({
    query: nonEmpty,
    workspacePath,
    fromCommit: z.string().optional(),
    toCommit: z.string().optional(),
});

export const GetProjectStatsArgs = z.object({
    limit: z.number().int().positive().optional(),
});

export const DetectContextDriftArgs = z.object({
    projectId: uuid,
    workspacePath,
});

export const GetDependencyGraphArgs = z.object({
    workspacePath,
});

// ── Validation helper ─────────────────────────────────────────────────────────

/**
 * Parse and validate tool arguments with a Zod schema.
 * Returns `{ ok: true, data }` or `{ ok: false, error }`.
 */
export function parseArgs<T>(schema: z.ZodType<T>, raw: unknown): { ok: true; data: T } | { ok: false; error: string } {
    const result = schema.safeParse(raw);
    if (result.success) return { ok: true, data: result.data };
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: issues };
}

// ── Preserved original helpers ────────────────────────────────────────────────

/** Resolve enclosing symbol from filePath + lineNumber args (shared by commit_decision, commit_memory) */
export { resolveSymbolContext } from './symbolUtils';
