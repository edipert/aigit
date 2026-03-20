import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { prisma, initializeDatabase } from '../db';
import { resolveConflict, reportConflict } from './conflict';

describe('conflict resolution performance', () => {
    let projectId: string;

    beforeAll(async () => {
        await initializeDatabase();
    });
    let swarmId: string;

    beforeEach(async () => {
        await initializeDatabase();
        // Clean up or setup test data
        const project = await prisma.project.create({
            data: { name: 'test-project-' + Date.now() }
        });
        projectId = project.id;

        const swarm = await prisma.swarmSession.create({
            data: {
                projectId: projectId,
                goal: 'test goal',
                status: 'ACTIVE'
            }
        });
        swarmId = swarm.id;
    });

    it('benchmarks resolveConflict with many blocked agents', async () => {
        const numAgents = 50;
        const agents = [];

        for (let i = 0; i < numAgents; i++) {
            const agent = await prisma.swarmAgent.create({
                data: {
                    swarmId: swarmId,
                    role: 'worker-' + i,
                    agentName: 'agent-' + i,
                    status: 'BLOCKED'
                }
            });
            agents.push(agent);
        }

        const conflictMessage = await prisma.swarmMessage.create({
            data: {
                swarmId: swarmId,
                fromAgentId: agents[0].id,
                type: 'conflict',
                channel: 'broadcast',
                payload: '{}',
                isConflict: true,
                resolved: false
            }
        });

        const start = performance.now();
        await resolveConflict(conflictMessage.id, 'resolved', true);
        const end = performance.now();

        console.log(`Resolution of ${numAgents} agents took ${end - start}ms`);

        // Verify status
        const updatedAgents = await prisma.swarmAgent.findMany({
            where: { swarmId: swarmId }
        });
        expect(updatedAgents.every(a => a.status === 'WORKING')).toBe(true);
    });
});
