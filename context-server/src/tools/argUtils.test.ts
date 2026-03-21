/**
 * Tests for the Zod argument validation schemas in argUtils.ts.
 * Covers both valid and invalid inputs for key tool schemas.
 */

import { describe, it, expect } from 'vitest';
import {
    parseArgs,
    CommitMemoryArgs,
    CommitDecisionArgs,
    FlagVulnerabilityArgs,
    UpdateAgentStatusArgs,
    PublishMessageArgs,
    QueryContextArgs,
    CommitTaskArgs,
} from '../tools/argUtils';

describe('parseArgs — CommitMemoryArgs', () => {
    const VALID = {
        projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        workspacePath: '/workspace',
        type: 'architecture',
        content: 'Chose PGlite over SQLite for vector support.',
    };

    it('accepts a valid memory payload', () => {
        const result = parseArgs(CommitMemoryArgs, VALID);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.type).toBe('architecture');
        }
    });

    it('rejects an invalid memory type', () => {
        const result = parseArgs(CommitMemoryArgs, { ...VALID, type: 'random_unknown_type' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/type/);
    });

    it('rejects when projectId is not a UUID', () => {
        const result = parseArgs(CommitMemoryArgs, { ...VALID, projectId: 'not-a-uuid' });
        expect(result.ok).toBe(false);
    });

    it('rejects when content is empty', () => {
        const result = parseArgs(CommitMemoryArgs, { ...VALID, content: '' });
        expect(result.ok).toBe(false);
    });

    it('coerces missing optional fields to undefined', () => {
        const result = parseArgs(CommitMemoryArgs, VALID);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.filePath).toBeUndefined();
            expect(result.data.lineNumber).toBeUndefined();
            expect(result.data.symbolName).toBeUndefined();
        }
    });

    it('accepts all valid memory types', () => {
        const valid = ['architecture', 'capability', 'pattern', 'convention', 'context', 'human_note'];
        for (const type of valid) {
            const r = parseArgs(CommitMemoryArgs, { ...VALID, type });
            expect(r.ok).toBe(true);
        }
    });
});

describe('parseArgs — CommitDecisionArgs', () => {
    const VALID = {
        taskId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890', // valid v4 UUID (13th char = 4)
        context: 'Which DB to use?',
        chosen: 'PGlite',
        rejected: ['SQLite', 'Turso'],
        reasoning: 'PGlite supports pgvector natively.',
    };

    it('accepts valid decision', () => {
        const result = parseArgs(CommitDecisionArgs, VALID);
        expect(result.ok).toBe(true);
    });

    it('defaults rejected to [] when omitted', () => {
        const { rejected: _, ...noRejected } = VALID;
        const result = parseArgs(CommitDecisionArgs, noRejected);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.rejected).toEqual([]);
    });

    it('rejects missing context', () => {
        const { context: _, ...noContext } = VALID;
        const result = parseArgs(CommitDecisionArgs, noContext);
        expect(result.ok).toBe(false);
    });

    it('accepts optional symbolType when valid', () => {
        const result = parseArgs(CommitDecisionArgs, { ...VALID, symbolType: 'function' });
        expect(result.ok).toBe(true);
    });

    it('rejects invalid symbolType', () => {
        const result = parseArgs(CommitDecisionArgs, { ...VALID, symbolType: 'widget' });
        expect(result.ok).toBe(false);
    });
});

describe('parseArgs — FlagVulnerabilityArgs', () => {
    const VALID = {
        projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'SQL injection risk',
        description: 'Raw string interpolation in query builder.',
        severity: 'HIGH',
    };

    it('accepts valid vulnerability', () => {
        expect(parseArgs(FlagVulnerabilityArgs, VALID).ok).toBe(true);
    });

    it('rejects invalid severity', () => {
        const result = parseArgs(FlagVulnerabilityArgs, { ...VALID, severity: 'EXTREME' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/severity/);
    });

    it('accepts all valid severity levels', () => {
        for (const severity of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
            expect(parseArgs(FlagVulnerabilityArgs, { ...VALID, severity }).ok).toBe(true);
        }
    });
});

describe('parseArgs — UpdateAgentStatusArgs', () => {
    it('accepts valid statuses', () => {
        for (const status of ['IDLE', 'WORKING', 'DONE', 'BLOCKED']) {
            const r = parseArgs(UpdateAgentStatusArgs, { agentId: 'agent-1', status });
            expect(r.ok).toBe(true);
        }
    });

    it('rejects unknown status', () => {
        const r = parseArgs(UpdateAgentStatusArgs, { agentId: 'agent-1', status: 'SLEEPING' });
        expect(r.ok).toBe(false);
    });
});

describe('parseArgs — PublishMessageArgs', () => {
    const VALID = {
        agentId: 'agent-1',
        type: 'decision',
        channel: 'broadcast',
        payload: '{"key":"value"}',
    };

    it('accepts valid message', () => {
        expect(parseArgs(PublishMessageArgs, VALID).ok).toBe(true);
    });

    it('rejects invalid message type', () => {
        const r = parseArgs(PublishMessageArgs, { ...VALID, type: 'gossip' });
        expect(r.ok).toBe(false);
    });
});

describe('parseArgs — QueryContextArgs', () => {
    it('accepts minimal query', () => {
        const r = parseArgs(QueryContextArgs, { query: 'Why did we choose PGlite?' });
        expect(r.ok).toBe(true);
    });

    it('rejects topK over 50', () => {
        const r = parseArgs(QueryContextArgs, { query: 'foo', topK: 999 });
        expect(r.ok).toBe(false);
    });

    it('rejects empty query', () => {
        const r = parseArgs(QueryContextArgs, { query: '' });
        expect(r.ok).toBe(false);
    });
});

describe('parseArgs — CommitTaskArgs', () => {
    const VALID = {
        projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        slug: 'auth-setup',
        title: 'Set up authentication module',
    };

    it('accepts valid task', () => {
        expect(parseArgs(CommitTaskArgs, VALID).ok).toBe(true);
    });

    it('rejects empty slug', () => {
        expect(parseArgs(CommitTaskArgs, { ...VALID, slug: '' }).ok).toBe(false);
    });

    it('rejects missing title', () => {
        const { title: _, ...noTitle } = VALID;
        expect(parseArgs(CommitTaskArgs, noTitle).ok).toBe(false);
    });
});
