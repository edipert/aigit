import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { prisma, initializeDatabase } from '../db';
import { createSwarm } from './swarm';

describe('swarm performance', () => {
    let projectId: string;

    beforeAll(async () => {
        await initializeDatabase();
    });

    beforeEach(async () => {
        const project = await prisma.project.create({
            data: { name: 'test-project-' + Date.now() }
        });
        projectId = project.id;
    });

    it('benchmarks createSwarm with many subtasks', async () => {
        const numSubTasks = 50;
        const subTasks = [];

        for (let i = 0; i < numSubTasks; i++) {
            subTasks.push({
                role: 'worker-' + i,
                slug: 'task-' + i,
                description: 'test description'
            });
        }

        const start = performance.now();
        const swarm = await createSwarm(projectId, 'test goal', 'main', subTasks);
        const end = performance.now();

        console.log(`createSwarm with ${numSubTasks} subtasks took ${end - start}ms`);

        // Correctness assertions
        expect(swarm).not.toBeNull();
        expect(swarm!.agents.length).toBe(numSubTasks);
        expect(swarm!.totalTurns).toBe(numSubTasks);

        const agents = await prisma.swarmAgent.findMany({
            where: { swarmId: swarm!.id }
        });
        expect(agents.length).toBe(numSubTasks);
    });
});
