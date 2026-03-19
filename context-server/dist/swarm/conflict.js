"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportConflict = reportConflict;
exports.resolveConflict = resolveConflict;
exports.listConflicts = listConflicts;
exports.detectConflicts = detectConflicts;
const db_1 = require("../db");
const swarm_1 = require("./swarm");
/**
 * Report a conflict within a swarm. Halts the swarm automatically.
 */
async function reportConflict(agentId, reason, blockedDecision, filePath, symbolName) {
    const agent = await db_1.prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent)
        throw new Error('Agent not found');
    // Block the agent
    await db_1.prisma.swarmAgent.update({
        where: { id: agentId },
        data: { status: 'BLOCKED' },
    });
    // Create a conflict message
    const message = await db_1.prisma.swarmMessage.create({
        data: {
            swarmId: agent.swarmId,
            fromAgentId: agentId,
            type: 'conflict',
            channel: 'broadcast',
            payload: JSON.stringify({
                reason,
                blockedDecision,
                filePath: filePath || null,
                symbolName: symbolName || null,
                reportedBy: agent.role,
            }),
            isConflict: true,
            resolved: false,
        },
    });
    // Halt the swarm
    await (0, swarm_1.haltSwarm)(agent.swarmId);
    return message;
}
/**
 * Resolve a conflict message and optionally resume the swarm.
 */
async function resolveConflict(messageId, resolution, resumeSwarm = true) {
    const message = await db_1.prisma.swarmMessage.update({
        where: { id: messageId },
        data: { resolved: true, resolution },
    });
    if (resumeSwarm) {
        // Check if all conflicts in the swarm are resolved
        const unresolvedCount = await db_1.prisma.swarmMessage.count({
            where: { swarmId: message.swarmId, isConflict: true, resolved: false },
        });
        if (unresolvedCount === 0) {
            // Resume the swarm — set the blocked agent back to WORKING
            await db_1.prisma.swarmAgent.updateMany({
                where: { swarmId: message.swarmId, status: 'BLOCKED' },
                data: { status: 'WORKING' },
            });
            await db_1.prisma.swarmSession.update({
                where: { id: message.swarmId },
                data: { status: 'ACTIVE' },
            });
        }
    }
    return message;
}
/**
 * List unresolved conflicts in a swarm.
 */
async function listConflicts(swarmId) {
    return db_1.prisma.swarmMessage.findMany({
        where: { swarmId, isConflict: true, resolved: false },
        include: { fromAgent: { select: { role: true, agentName: true } } },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Auto-detect conflicts: find decisions that touch the same file or symbol from different agents.
 */
async function detectConflicts(swarmId) {
    const decisions = await db_1.prisma.swarmMessage.findMany({
        where: { swarmId, type: 'decision', isConflict: false },
        include: { fromAgent: { select: { role: true, id: true } } },
    });
    const conflicts = [];
    for (let i = 0; i < decisions.length; i++) {
        for (let j = i + 1; j < decisions.length; j++) {
            const a = decisions[i];
            const b = decisions[j];
            // Skip same-agent decisions
            if (a.fromAgentId === b.fromAgentId)
                continue;
            try {
                const payloadA = JSON.parse(a.payload);
                const payloadB = JSON.parse(b.payload);
                const sameFile = payloadA.filePath && payloadB.filePath && payloadA.filePath === payloadB.filePath;
                const sameSymbol = payloadA.symbolName && payloadB.symbolName && payloadA.symbolName === payloadB.symbolName;
                if (sameFile || sameSymbol) {
                    conflicts.push({
                        a, b,
                        reason: sameSymbol
                            ? `Both agents modified symbol @${payloadA.symbolName}`
                            : `Both agents modified file ${payloadA.filePath}`,
                    });
                }
            }
            catch {
                // Skip unparseable payloads
            }
        }
    }
    return conflicts;
}
