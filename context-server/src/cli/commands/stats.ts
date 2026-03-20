import { prisma } from '../../db';
import type { CommandHandler } from './types';

interface AgentStats {
    name: string;
    memories: number;
    decisions: number;
    total: number;
}

interface TaskVelocity {
    slug: string;
    title: string;
    status: string;
    daysActive: number;
    decisionCount: number;
}

export async function buildProjectStats(limit: number = 10): Promise<string> {
    const lines: string[] = ['\n📊 aigit Project Statistics\n'];

    const [memoryCount, decisionCount, taskCount, healingCount] = await Promise.all([
        prisma.memory.count(),
        prisma.decision.count(),
        prisma.task.count(),
        prisma.healingEvent.count(),
    ]);

    lines.push('  ── Overview ──────────────────────────────────');
    lines.push(`  📝 Memories:       ${memoryCount}`);
    lines.push(`  🎯 Decisions:      ${decisionCount}`);
    lines.push(`  📋 Tasks:          ${taskCount}`);
    lines.push(`  🩹 Healing Events: ${healingCount}\n`);

    const memories = await prisma.memory.findMany({ select: { agentName: true } });
    const decisions = await prisma.decision.findMany({ select: { agentName: true } });

    const agentMap = new Map<string, AgentStats>();
    const getAgent = (name: string): AgentStats => {
        if (!agentMap.has(name)) agentMap.set(name, { name, memories: 0, decisions: 0, total: 0 });
        return agentMap.get(name)!;
    };

    for (const m of memories) {
        const name = m.agentName || 'unknown';
        const a = getAgent(name);
        a.memories++;
        a.total++;
    }
    for (const d of decisions) {
        const name = d.agentName || 'unknown';
        const a = getAgent(name);
        a.decisions++;
        a.total++;
    }

    const agentRanking = Array.from(agentMap.values()).sort((a, b) => b.total - a.total);

    if (agentRanking.length > 0) {
        lines.push('  ── Agent Contributions ───────────────────────');
        lines.push('  Agent                Memories  Decisions  Total');
        lines.push('  ─────────────────────────────────────────────');
        for (const a of agentRanking.slice(0, limit)) {
            const name = a.name.padEnd(20);
            const mem = String(a.memories).padStart(8);
            const dec = String(a.decisions).padStart(10);
            const tot = String(a.total).padStart(6);
            lines.push(`  ${name} ${mem} ${dec} ${tot}`);
        }
        lines.push('');
    }

    const tasks = await prisma.task.findMany({
        include: { decisions: { select: { id: true } } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
    });

    if (tasks.length > 0) {
        const velocities: TaskVelocity[] = tasks.map(t => ({
            slug: t.slug,
            title: t.title,
            status: t.status,
            daysActive: Math.max(1, Math.round((t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24))),
            decisionCount: t.decisions.length,
        }));

        lines.push('  ── Task Velocity (Recent) ────────────────────');
        lines.push('  Slug                    Status       Days  Decisions');
        lines.push('  ─────────────────────────────────────────────────────');
        for (const v of velocities) {
            const slug = v.slug.substring(0, 24).padEnd(24);
            const status = v.status.padEnd(12);
            const days = String(v.daysActive).padStart(5);
            const decs = String(v.decisionCount).padStart(10);
            lines.push(`  ${slug} ${status} ${days} ${decs}`);
        }
        lines.push('');
    }

    const branchMemories = await prisma.memory.groupBy({ by: ['gitBranch'], _count: { id: true } });
    const branchDecisions = await prisma.decision.groupBy({ by: ['gitBranch'], _count: { id: true } });

    const branchMap = new Map<string, { memories: number; decisions: number }>();
    for (const b of branchMemories) {
        branchMap.set(b.gitBranch, { memories: b._count.id, decisions: 0 });
    }
    for (const b of branchDecisions) {
        const entry = branchMap.get(b.gitBranch) || { memories: 0, decisions: 0 };
        entry.decisions = b._count.id;
        branchMap.set(b.gitBranch, entry);
    }

    if (branchMap.size > 0) {
        lines.push('  ── Branch Distribution ───────────────────────');
        lines.push('  Branch               Memories  Decisions');
        lines.push('  ─────────────────────────────────────────────');
        for (const [branch, counts] of branchMap) {
            const name = branch.padEnd(20);
            const mem = String(counts.memories).padStart(10);
            const dec = String(counts.decisions).padStart(10);
            lines.push(`  ${name} ${mem} ${dec}`);
        }
        lines.push('');
    }

    const totalContextEntries = memoryCount + decisionCount;
    const avgTokensPerEntry = 150;
    const estimatedTokensSaved = totalContextEntries * avgTokensPerEntry;

    lines.push('  ── Context Tax Estimate ──────────────────────');
    lines.push(`  📦 Total context entries:     ${totalContextEntries}`);
    lines.push(`  🧠 Est. tokens preserved:     ~${estimatedTokensSaved.toLocaleString()}`);
    lines.push(`  ⏱️  Est. sessions benefited:   ~${Math.ceil(totalContextEntries / 5)}\n`);

    return lines.join('\n');
}

const handler: CommandHandler = async ({ args }) => {
    const topIdx = args.indexOf('--top');
    const limit = topIdx !== -1 ? Number(args[topIdx + 1]) : 10;
    const result = await buildProjectStats(limit);
    console.log(result);
};

export default handler;
