"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwarm = createSwarm;
exports.registerAgent = registerAgent;
exports.unregisterAgent = unregisterAgent;
exports.publishMessage = publishMessage;
exports.pollMessages = pollMessages;
exports.updateAgentStatus = updateAgentStatus;
exports.getSwarmStatus = getSwarmStatus;
exports.listActiveSwarms = listActiveSwarms;
exports.haltSwarm = haltSwarm;
exports.resumeSwarm = resumeSwarm;
const db_1 = require("../db");
async function createSwarm(projectId, goal, gitBranch, subTasks) {
    const swarm = await db_1.prisma.swarmSession.create({
        data: {
            projectId,
            goal,
            gitBranch,
            status: 'PENDING',
            totalTurns: subTasks.length,
            currentTurn: 0,
        },
    });
    // Pre-create agent slots from sub-tasks (agents register into them)
    for (let i = 0; i < subTasks.length; i++) {
        await db_1.prisma.swarmAgent.create({
            data: {
                swarmId: swarm.id,
                role: subTasks[i].role,
                agentName: subTasks[i].role, // placeholder until agent registers
                taskSlug: subTasks[i].slug,
                turnOrder: i + 1,
                status: 'IDLE',
            },
        });
    }
    return db_1.prisma.swarmSession.findUnique({
        where: { id: swarm.id },
        include: { agents: { orderBy: { turnOrder: 'asc' } }, messages: true },
    });
}
// ── Agent Registration ──────────────────────────────────
async function registerAgent(swarmId, role, agentName) {
    // Find the pre-created slot for this role
    const slot = await db_1.prisma.swarmAgent.findFirst({
        where: { swarmId, role, agentName: role }, // placeholder name = role
    });
    if (slot) {
        // Fill the slot with the real agent name
        const agent = await db_1.prisma.swarmAgent.update({
            where: { id: slot.id },
            data: { agentName },
        });
        // Check if all slots are filled → activate swarm
        const allAgents = await db_1.prisma.swarmAgent.findMany({ where: { swarmId } });
        const allRegistered = allAgents.every(a => a.agentName !== a.role);
        if (allRegistered) {
            await db_1.prisma.swarmSession.update({
                where: { id: swarmId },
                data: { status: 'ACTIVE', currentTurn: 1 },
            });
            // Set first agent to WORKING
            const first = allAgents.find(a => a.turnOrder === 1);
            if (first) {
                await db_1.prisma.swarmAgent.update({
                    where: { id: first.id },
                    data: { status: 'WORKING' },
                });
            }
        }
        return agent;
    }
    // No pre-created slot — create a new agent entry
    const maxOrder = await db_1.prisma.swarmAgent.findFirst({
        where: { swarmId },
        orderBy: { turnOrder: 'desc' },
    });
    const agent = await db_1.prisma.swarmAgent.create({
        data: {
            swarmId,
            role,
            agentName,
            turnOrder: (maxOrder?.turnOrder ?? 0) + 1,
            status: 'IDLE',
        },
    });
    // Update total turns
    await db_1.prisma.swarmSession.update({
        where: { id: swarmId },
        data: { totalTurns: { increment: 1 } },
    });
    return agent;
}
async function unregisterAgent(agentId) {
    const agent = await db_1.prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent)
        return null;
    await db_1.prisma.swarmAgent.delete({ where: { id: agentId } });
    return agent;
}
// ── Message Bus ──────────────────────────────────────
async function publishMessage(agentId, type, channel, payload, isConflict = false) {
    const agent = await db_1.prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent)
        throw new Error('Agent not found');
    return db_1.prisma.swarmMessage.create({
        data: {
            swarmId: agent.swarmId,
            fromAgentId: agentId,
            type,
            channel,
            payload,
            isConflict,
        },
    });
}
async function pollMessages(agentId, since) {
    const agent = await db_1.prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent)
        return [];
    const where = {
        swarmId: agent.swarmId,
        OR: [
            { channel: 'broadcast' },
            { channel: agent.role },
        ],
    };
    if (since) {
        where.createdAt = { gt: since };
    }
    return db_1.prisma.swarmMessage.findMany({
        where: where,
        orderBy: { createdAt: 'asc' },
        include: { fromAgent: { select: { role: true, agentName: true } } },
    });
}
// ── Turn Management ──────────────────────────────────
async function updateAgentStatus(agentId, status) {
    const agent = await db_1.prisma.swarmAgent.update({
        where: { id: agentId },
        data: { status },
    });
    // If agent completed, advance the turn
    if (status === 'DONE') {
        await advanceTurn(agent.swarmId);
    }
    return agent;
}
async function advanceTurn(swarmId) {
    const swarm = await db_1.prisma.swarmSession.findUnique({
        where: { id: swarmId },
        include: { agents: { orderBy: { turnOrder: 'asc' } } },
    });
    if (!swarm)
        return;
    const nextTurn = swarm.currentTurn + 1;
    if (nextTurn > swarm.totalTurns) {
        // All turns complete
        await db_1.prisma.swarmSession.update({
            where: { id: swarmId },
            data: { status: 'DONE', currentTurn: nextTurn },
        });
        return;
    }
    // Activate next agent
    const nextAgent = swarm.agents.find(a => a.turnOrder === nextTurn);
    if (nextAgent) {
        await db_1.prisma.swarmAgent.update({
            where: { id: nextAgent.id },
            data: { status: 'WORKING' },
        });
    }
    await db_1.prisma.swarmSession.update({
        where: { id: swarmId },
        data: { currentTurn: nextTurn },
    });
}
// ── Status ──────────────────────────────────────────
async function getSwarmStatus(swarmId) {
    return db_1.prisma.swarmSession.findUnique({
        where: { id: swarmId },
        include: {
            agents: { orderBy: { turnOrder: 'asc' } },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { fromAgent: { select: { role: true, agentName: true } } },
            },
        },
    });
}
async function listActiveSwarms(projectId) {
    return db_1.prisma.swarmSession.findMany({
        where: { projectId, status: { in: ['PENDING', 'ACTIVE', 'HALTED'] } },
        include: {
            agents: { orderBy: { turnOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });
}
async function haltSwarm(swarmId) {
    return db_1.prisma.swarmSession.update({
        where: { id: swarmId },
        data: { status: 'HALTED' },
    });
}
async function resumeSwarm(swarmId) {
    const swarm = await db_1.prisma.swarmSession.findUnique({
        where: { id: swarmId },
        include: { agents: { orderBy: { turnOrder: 'asc' } } },
    });
    if (!swarm)
        return null;
    // Find the current working agent or set the current turn agent to WORKING
    const currentAgent = swarm.agents.find(a => a.turnOrder === swarm.currentTurn);
    if (currentAgent && currentAgent.status !== 'DONE') {
        await db_1.prisma.swarmAgent.update({
            where: { id: currentAgent.id },
            data: { status: 'WORKING' },
        });
    }
    return db_1.prisma.swarmSession.update({
        where: { id: swarmId },
        data: { status: 'ACTIVE' },
    });
}
