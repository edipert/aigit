"use strict";
/**
 * Tests for the Zod argument validation schemas in argUtils.ts.
 * Covers both valid and invalid inputs for key tool schemas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const argUtils_1 = require("../tools/argUtils");
(0, vitest_1.describe)('parseArgs — CommitMemoryArgs', () => {
    const VALID = {
        projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        workspacePath: '/workspace',
        type: 'architecture',
        content: 'Chose PGlite over SQLite for vector support.',
    };
    (0, vitest_1.it)('accepts a valid memory payload', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, VALID);
        (0, vitest_1.expect)(result.ok).toBe(true);
        if (result.ok) {
            (0, vitest_1.expect)(result.data.type).toBe('architecture');
        }
    });
    (0, vitest_1.it)('rejects an invalid memory type', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, { ...VALID, type: 'random_unknown_type' });
        (0, vitest_1.expect)(result.ok).toBe(false);
        if (!result.ok)
            (0, vitest_1.expect)(result.error).toMatch(/type/);
    });
    (0, vitest_1.it)('rejects when projectId is not a UUID', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, { ...VALID, projectId: 'not-a-uuid' });
        (0, vitest_1.expect)(result.ok).toBe(false);
    });
    (0, vitest_1.it)('rejects when content is empty', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, { ...VALID, content: '' });
        (0, vitest_1.expect)(result.ok).toBe(false);
    });
    (0, vitest_1.it)('coerces missing optional fields to undefined', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, VALID);
        (0, vitest_1.expect)(result.ok).toBe(true);
        if (result.ok) {
            (0, vitest_1.expect)(result.data.filePath).toBeUndefined();
            (0, vitest_1.expect)(result.data.lineNumber).toBeUndefined();
            (0, vitest_1.expect)(result.data.symbolName).toBeUndefined();
        }
    });
    (0, vitest_1.it)('accepts all valid memory types', () => {
        const valid = ['architecture', 'capability', 'pattern', 'convention', 'context', 'human_note'];
        for (const type of valid) {
            const r = (0, argUtils_1.parseArgs)(argUtils_1.CommitMemoryArgs, { ...VALID, type });
            (0, vitest_1.expect)(r.ok).toBe(true);
        }
    });
});
(0, vitest_1.describe)('parseArgs — CommitDecisionArgs', () => {
    const VALID = {
        taskId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890', // valid v4 UUID (13th char = 4)
        context: 'Which DB to use?',
        chosen: 'PGlite',
        rejected: ['SQLite', 'Turso'],
        reasoning: 'PGlite supports pgvector natively.',
    };
    (0, vitest_1.it)('accepts valid decision', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitDecisionArgs, VALID);
        (0, vitest_1.expect)(result.ok).toBe(true);
    });
    (0, vitest_1.it)('defaults rejected to [] when omitted', () => {
        const { rejected: _unused, ...noRejected } = VALID;
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitDecisionArgs, noRejected);
        (0, vitest_1.expect)(result.ok).toBe(true);
        if (result.ok)
            (0, vitest_1.expect)(result.data.rejected).toEqual([]);
    });
    (0, vitest_1.it)('rejects missing context', () => {
        const { context: _unused, ...noContext } = VALID;
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitDecisionArgs, noContext);
        (0, vitest_1.expect)(result.ok).toBe(false);
    });
    (0, vitest_1.it)('accepts optional symbolType when valid', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitDecisionArgs, { ...VALID, symbolType: 'function' });
        (0, vitest_1.expect)(result.ok).toBe(true);
    });
    (0, vitest_1.it)('rejects invalid symbolType', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.CommitDecisionArgs, { ...VALID, symbolType: 'widget' });
        (0, vitest_1.expect)(result.ok).toBe(false);
    });
});
(0, vitest_1.describe)('parseArgs — FlagVulnerabilityArgs', () => {
    const VALID = {
        projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'SQL injection risk',
        description: 'Raw string interpolation in query builder.',
        severity: 'HIGH',
    };
    (0, vitest_1.it)('accepts valid vulnerability', () => {
        (0, vitest_1.expect)((0, argUtils_1.parseArgs)(argUtils_1.FlagVulnerabilityArgs, VALID).ok).toBe(true);
    });
    (0, vitest_1.it)('rejects invalid severity', () => {
        const result = (0, argUtils_1.parseArgs)(argUtils_1.FlagVulnerabilityArgs, { ...VALID, severity: 'EXTREME' });
        (0, vitest_1.expect)(result.ok).toBe(false);
        if (!result.ok)
            (0, vitest_1.expect)(result.error).toMatch(/severity/);
    });
    (0, vitest_1.it)('accepts all valid severity levels', () => {
        for (const severity of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
            (0, vitest_1.expect)((0, argUtils_1.parseArgs)(argUtils_1.FlagVulnerabilityArgs, { ...VALID, severity }).ok).toBe(true);
        }
    });
});
(0, vitest_1.describe)('parseArgs — UpdateAgentStatusArgs', () => {
    (0, vitest_1.it)('accepts valid statuses', () => {
        for (const status of ['IDLE', 'WORKING', 'DONE', 'BLOCKED']) {
            const r = (0, argUtils_1.parseArgs)(argUtils_1.UpdateAgentStatusArgs, { agentId: 'agent-1', status });
            (0, vitest_1.expect)(r.ok).toBe(true);
        }
    });
    (0, vitest_1.it)('rejects unknown status', () => {
        const r = (0, argUtils_1.parseArgs)(argUtils_1.UpdateAgentStatusArgs, { agentId: 'agent-1', status: 'SLEEPING' });
        (0, vitest_1.expect)(r.ok).toBe(false);
    });
});
(0, vitest_1.describe)('parseArgs — PublishMessageArgs', () => {
    const VALID = {
        agentId: 'agent-1',
        type: 'decision',
        channel: 'broadcast',
        payload: '{"key":"value"}',
    };
    (0, vitest_1.it)('accepts valid message', () => {
        (0, vitest_1.expect)((0, argUtils_1.parseArgs)(argUtils_1.PublishMessageArgs, VALID).ok).toBe(true);
    });
    (0, vitest_1.it)('rejects invalid message type', () => {
        const r = (0, argUtils_1.parseArgs)(argUtils_1.PublishMessageArgs, { ...VALID, type: 'gossip' });
        (0, vitest_1.expect)(r.ok).toBe(false);
    });
});
(0, vitest_1.describe)('parseArgs — QueryContextArgs', () => {
    (0, vitest_1.it)('accepts minimal query', () => {
        const r = (0, argUtils_1.parseArgs)(argUtils_1.QueryContextArgs, { query: 'Why did we choose PGlite?' });
        (0, vitest_1.expect)(r.ok).toBe(true);
    });
    (0, vitest_1.it)('rejects topK over 50', () => {
        const r = (0, argUtils_1.parseArgs)(argUtils_1.QueryContextArgs, { query: 'foo', topK: 999 });
        (0, vitest_1.expect)(r.ok).toBe(false);
    });
    (0, vitest_1.it)('rejects empty query', () => {
        const r = (0, argUtils_1.parseArgs)(argUtils_1.QueryContextArgs, { query: '' });
        (0, vitest_1.expect)(r.ok).toBe(false);
    });
});
(0, vitest_1.describe)('parseArgs — CommitTaskArgs', () => {
    const VALID = {
        projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        slug: 'auth-setup',
        title: 'Set up authentication module',
    };
    (0, vitest_1.it)('accepts valid task', () => {
        (0, vitest_1.expect)((0, argUtils_1.parseArgs)(argUtils_1.CommitTaskArgs, VALID).ok).toBe(true);
    });
    (0, vitest_1.it)('rejects empty slug', () => {
        (0, vitest_1.expect)((0, argUtils_1.parseArgs)(argUtils_1.CommitTaskArgs, { ...VALID, slug: '' }).ok).toBe(false);
    });
    (0, vitest_1.it)('rejects missing title', () => {
        const { title: _unused, ...noTitle } = VALID;
        (0, vitest_1.expect)((0, argUtils_1.parseArgs)(argUtils_1.CommitTaskArgs, noTitle).ok).toBe(false);
    });
});
