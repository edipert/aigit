import { describe, it, expect, vi, beforeEach } from 'vitest';
import resolveHandler from './resolve';
import { prisma } from '../../db';

const mockGetActiveBranch = vi.fn();
vi.mock('../../cli/git', () => ({
    get getActiveBranch() { return mockGetActiveBranch; }
}));

const mockFindManyMemories = vi.fn();
const mockFindManyDecisions = vi.fn();
const mockUpdateMemory = vi.fn();
const mockUpdateDecision = vi.fn();

vi.mock('../../db', () => ({
    prisma: {
        memory: {
            findMany: (...args: any[]) => mockFindManyMemories(...args),
            update: (...args: any[]) => mockUpdateMemory(...args)
        },
        decision: {
            findMany: (...args: any[]) => mockFindManyDecisions(...args),
            update: (...args: any[]) => mockUpdateDecision(...args)
        }
    }
}));

describe('aigit resolve', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetActiveBranch.mockResolvedValue('main');
        mockFindManyMemories.mockResolvedValue([]);
        mockFindManyDecisions.mockResolvedValue([]);
    });

    it('should exit cleanly if no unassimilated records are found', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await resolveHandler({ args: [], workspacePath: '/mock/path', command: 'resolve' });
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No unassimilated context found'));
        consoleSpy.mockRestore();
    });
});
