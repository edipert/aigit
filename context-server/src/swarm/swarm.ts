import { prisma } from '../db';
import { getActiveBranch } from '../cli/git';

// ── Swarm Lifecycle ──────────────────────────────────

interface SubTask {
    role: string;
    slug: string;
    description: string;
}

export async function createSwarm(
    projectId: string,
    goal: string,
    gitBranch: string,
    subTasks: SubTask[]
) {
    const swarm = await prisma.swarmSession.create({
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
    await prisma.swarmAgent.createMany({
        data: subTasks.map((task, i) => ({
            swarmId: swarm.id,
            role: task.role,
            agentName: task.role, // placeholder until agent registers
            taskSlug: task.slug,
            turnOrder: i + 1,
            status: 'IDLE',
        })),
    });

    return prisma.swarmSession.findUnique({
        where: { id: swarm.id },
        include: { agents: { orderBy: { turnOrder: 'asc' } }, messages: true },
    });
}

// ── Agent Registration ──────────────────────────────────

export async function registerAgent(swarmId: string, role: string, agentName: string) {
    // Find the pre-created slot for this role
    const slot = await prisma.swarmAgent.findFirst({
        where: { swarmId, role, agentName: role }, // placeholder name = role
    });

    if (slot) {
        // Fill the slot with the real agent name
        const agent = await prisma.swarmAgent.update({
            where: { id: slot.id },
            data: { agentName },
        });

        // Check if all slots are filled → activate swarm
        const allAgents = await prisma.swarmAgent.findMany({ where: { swarmId } });
        const allRegistered = allAgents.every(a => a.agentName !== a.role);

        if (allRegistered) {
            await prisma.swarmSession.update({
                where: { id: swarmId },
                data: { status: 'ACTIVE', currentTurn: 1 },
            });

            // Set first agent to WORKING
            const first = allAgents.find(a => a.turnOrder === 1);
            if (first) {
                await prisma.swarmAgent.update({
                    where: { id: first.id },
                    data: { status: 'WORKING' },
                });
            }
        }

        return agent;
    }

    // No pre-created slot — create a new agent entry
    const maxOrder = await prisma.swarmAgent.findFirst({
        where: { swarmId },
        orderBy: { turnOrder: 'desc' },
    });

    const agent = await prisma.swarmAgent.create({
        data: {
            swarmId,
            role,
            agentName,
            turnOrder: (maxOrder?.turnOrder ?? 0) + 1,
            status: 'IDLE',
        },
    });

    // Update total turns
    await prisma.swarmSession.update({
        where: { id: swarmId },
        data: { totalTurns: { increment: 1 } },
    });

    return agent;
}

export async function unregisterAgent(agentId: string) {
    const agent = await prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent) return null;

    await prisma.swarmAgent.delete({ where: { id: agentId } });
    return agent;
}

// ── Message Bus ──────────────────────────────────────

export async function publishMessage(
    agentId: string,
    type: string,
    channel: string,
    payload: string,
    isConflict = false
) {
    const agent = await prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    return prisma.swarmMessage.create({
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

export async function pollMessages(agentId: string, since?: Date) {
    const agent = await prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent) return [];

    const where: Record<string, unknown> = {
        swarmId: agent.swarmId,
        OR: [
            { channel: 'broadcast' },
            { channel: agent.role },
        ],
    };

    if (since) {
        where.createdAt = { gt: since };
    }

    return prisma.swarmMessage.findMany({
        where: where as any,
        orderBy: { createdAt: 'asc' },
        include: { fromAgent: { select: { role: true, agentName: true } } },
    });
}

// ── Turn Management ──────────────────────────────────

export async function updateAgentStatus(agentId: string, status: string) {
    const agent = await prisma.swarmAgent.update({
        where: { id: agentId },
        data: { status },
    });

    // If agent completed, advance the turn
    if (status === 'DONE') {
        await advanceTurn(agent.swarmId);
    }

    return agent;
}

async function advanceTurn(swarmId: string) {
    const swarm = await prisma.swarmSession.findUnique({
        where: { id: swarmId },
        include: { agents: { orderBy: { turnOrder: 'asc' } } },
    });

    if (!swarm) return;

    const nextTurn = swarm.currentTurn + 1;

    if (nextTurn > swarm.totalTurns) {
        // All turns complete
        await prisma.swarmSession.update({
            where: { id: swarmId },
            data: { status: 'DONE', currentTurn: nextTurn },
        });
        return;
    }

    // Activate next agent
    const nextAgent = swarm.agents.find(a => a.turnOrder === nextTurn);
    if (nextAgent) {
        await prisma.swarmAgent.update({
            where: { id: nextAgent.id },
            data: { status: 'WORKING' },
        });
    }

    await prisma.swarmSession.update({
        where: { id: swarmId },
        data: { currentTurn: nextTurn },
    });
}

// ── Status ──────────────────────────────────────────

export async function getSwarmStatus(swarmId: string) {
    return prisma.swarmSession.findUnique({
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

export async function listActiveSwarms(projectId: string) {
    return prisma.swarmSession.findMany({
        where: { projectId, status: { in: ['PENDING', 'ACTIVE', 'HALTED'] } },
        include: {
            agents: { orderBy: { turnOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function haltSwarm(swarmId: string) {
    return prisma.swarmSession.update({
        where: { id: swarmId },
        data: { status: 'HALTED' },
    });
}

export async function resumeSwarm(swarmId: string) {
    const swarm = await prisma.swarmSession.findUnique({
        where: { id: swarmId },
        include: { agents: { orderBy: { turnOrder: 'asc' } } },
    });

    if (!swarm) return null;

    // Find the current working agent or set the current turn agent to WORKING
    const currentAgent = swarm.agents.find(a => a.turnOrder === swarm.currentTurn);
    if (currentAgent && currentAgent.status !== 'DONE') {
        await prisma.swarmAgent.update({
            where: { id: currentAgent.id },
            data: { status: 'WORKING' },
        });
    }

    return prisma.swarmSession.update({
        where: { id: swarmId },
        data: { status: 'ACTIVE' },
    });
}
