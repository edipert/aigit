import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProjectStats } from './stats';
import { prisma } from '../../db';

vi.mock('../../db', () => ({
    prisma: {
        memory: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn(),
        },
        decision: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn(),
        },
        task: {
            count: vi.fn(),
            findMany: vi.fn(),
        },
        healingEvent: {
            count: vi.fn(),
        }
    }
}));

describe('buildProjectStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates a formatted stats report', async () => {
        vi.mocked(prisma.memory.count).mockResolvedValue(10);
        vi.mocked(prisma.decision.count).mockResolvedValue(5);
        vi.mocked(prisma.task.count).mockResolvedValue(2);
        vi.mocked(prisma.healingEvent.count).mockResolvedValue(1);

        vi.mocked(prisma.memory.findMany).mockResolvedValue([
            { agentName: 'planner' }, { agentName: 'planner' }, { agentName: 'coder' }
        ] as any);
        vi.mocked(prisma.decision.findMany).mockResolvedValue([
            { agentName: 'planner' }, { agentName: 'coder' }
        ] as any);

        vi.mocked(prisma.memory.groupBy).mockResolvedValue([
            { gitBranch: 'main', _count: { id: 10 } }
        ] as any);
        vi.mocked(prisma.decision.groupBy).mockResolvedValue([
            { gitBranch: 'main', _count: { id: 5 } }
        ] as any);

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        vi.mocked(prisma.task.findMany).mockResolvedValue([
            { slug: 'test-task', title: 'Test Task', status: 'IN_PROGRESS', createdAt: yesterday, updatedAt: now, decisions: [{ id: '1' }] }
        ] as any);

        const result = await buildProjectStats(10);

        // Verification checks
        expect(result).toContain('Memories:       10');
        expect(result).toContain('Decisions:      5');
        expect(result).toContain('Tasks:          2');
        expect(result).toContain('Healing Events: 1');

        expect(result).toContain('planner');
        expect(result).toContain('coder');

        expect(result).toContain('test-task');
        expect(result).toContain('main');
    });

    it('handles empty database gracefully', async () => {
        vi.mocked(prisma.memory.count).mockResolvedValue(0);
        vi.mocked(prisma.decision.count).mockResolvedValue(0);
        vi.mocked(prisma.task.count).mockResolvedValue(0);
        vi.mocked(prisma.healingEvent.count).mockResolvedValue(0);

        vi.mocked(prisma.memory.findMany).mockResolvedValue([]);
        vi.mocked(prisma.decision.findMany).mockResolvedValue([]);
        vi.mocked(prisma.memory.groupBy).mockResolvedValue([]);
        vi.mocked(prisma.decision.groupBy).mockResolvedValue([]);
        vi.mocked(prisma.task.findMany).mockResolvedValue([]);

        const result = await buildProjectStats(10);

        expect(result).toContain('Memories:       0');
        expect(result).toContain('Decisions:      0');
        expect(result).not.toContain('Agent Contributions');
        expect(result).not.toContain('Task Velocity (Recent)');
        expect(result).not.toContain('Branch Distribution');
    });
});
