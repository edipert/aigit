"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const db_1 = require("../db");
const conflict_1 = require("./conflict");
(0, vitest_1.describe)('conflict resolution performance', () => {
    let projectId;
    let swarmId;
    (0, vitest_1.beforeEach)(async () => {
        // Clean up or setup test data
        const project = await db_1.prisma.project.create({
            data: { name: 'test-project-' + Date.now() }
        });
        projectId = project.id;
        const swarm = await db_1.prisma.swarmSession.create({
            data: {
                projectId: projectId,
                goal: 'test goal',
                status: 'ACTIVE'
            }
        });
        swarmId = swarm.id;
    });
    (0, vitest_1.it)('benchmarks resolveConflict with many blocked agents', async () => {
        const numAgents = 50;
        const agents = [];
        for (let i = 0; i < numAgents; i++) {
            const agent = await db_1.prisma.swarmAgent.create({
                data: {
                    swarmId: swarmId,
                    role: 'worker-' + i,
                    agentName: 'agent-' + i,
                    status: 'BLOCKED'
                }
            });
            agents.push(agent);
        }
        const conflictMessage = await db_1.prisma.swarmMessage.create({
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
        await (0, conflict_1.resolveConflict)(conflictMessage.id, 'resolved', true);
        const end = performance.now();
        console.log(`Resolution of ${numAgents} agents took ${end - start}ms`);
        // Verify status
        const updatedAgents = await db_1.prisma.swarmAgent.findMany({
            where: { swarmId: swarmId }
        });
        (0, vitest_1.expect)(updatedAgents.every(a => a.status === 'WORKING')).toBe(true);
    });
});
