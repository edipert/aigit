import { prisma, initializeDatabase } from '../db';
import { getActiveBranch } from './git';

export async function showContextLog(workspacePath: string) {
    try {
        await initializeDatabase();
        const currentBranch = getActiveBranch(workspacePath);

        const memories = await prisma.memory.findMany({
            where: { gitBranch: { in: ['main', currentBranch] } },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const decisions = await prisma.decision.findMany({
            where: { gitBranch: { in: ['main', currentBranch] } },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log(`\n⏳ [aigit log] Recent Semantic Memory (Branch: ${currentBranch})\n`);

        if (memories.length === 0 && decisions.length === 0) {
            console.log('No context history recorded yet on this branch.');
        }

        // Combine and sort by date descending
        const timeline = [
            ...memories.map(m => ({ type: 'MEMORY', date: m.createdAt, branch: m.gitBranch, details: m.content })),
            ...decisions.map(d => ({ type: 'DECISION', date: d.createdAt, branch: d.gitBranch, details: `${d.context} ➔ ${d.chosen}` }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 15);

        timeline.forEach((item, index) => {
            const dateStr = item.date.toLocaleString();
            console.log(`[${dateStr}] (${item.branch}) [${item.type}]`);
            console.log(`    ${item.details}\n`);
        });

    } catch (error) {
        console.error('❌ Failed to view history:', error);
    } finally {
        await prisma.$disconnect();
    }
}

export async function showContextStatus(workspacePath: string) {
    try {
        await initializeDatabase();
        const currentBranch = getActiveBranch(workspacePath);

        const activeTasks = await prisma.task.findMany({
            where: {
                gitBranch: currentBranch,
                status: { not: 'DONE' }
            },
            include: { decisions: true }
        });

        console.log(`\n📌 [aigit status] Active Context State (Branch: ${currentBranch})\n`);

        if (activeTasks.length === 0) {
            console.log('No active AI tasks or pending semantic changes.\nTrees are clean.');
            return;
        }

        console.log(`Found ${activeTasks.length} active task(s):\n`);

        activeTasks.forEach(task => {
            console.log(`>> TASK: ${task.title} (Slug: ${task.slug}.md) [Status: ${task.status}]`);
            if (task.decisions.length > 0) {
                console.log(`   Pending Decisions (${task.decisions.length}):`);
                task.decisions.forEach(d => console.log(`   - ${d.context} ➔ ${d.chosen}`));
            }
            console.log();
        });

    } catch (error) {
        console.error('❌ Failed to view status:', error);
    } finally {
        await prisma.$disconnect();
    }
}

export async function revertContextId(workspacePath: string, targetId: string) {
    try {
        await initializeDatabase();
        const currentBranch = getActiveBranch(workspacePath);

        // Attempt to find and delete across models
        // We do sequential attempts rather than parallel to easily catch which one matched

        const memory = await prisma.memory.findUnique({ where: { id: targetId } });
        if (memory) {
            await prisma.memory.delete({ where: { id: targetId } });
            console.log(`\n✅ [aigit revert] Accidentally learned semantic memory has been forgotten! (Branch: ${currentBranch})\n`);
            return;
        }

        const decision = await prisma.decision.findUnique({ where: { id: targetId } });
        if (decision) {
            await prisma.decision.delete({ where: { id: targetId } });
            console.log(`\n✅ [aigit revert] Architectural Decision revoked! (Branch: ${currentBranch})\n`);
            return;
        }

        const task = await prisma.task.findUnique({ where: { id: targetId } });
        if (task) {
            // Also cascade delete decisions
            await prisma.decision.deleteMany({ where: { taskId: targetId } });
            await prisma.task.delete({ where: { id: targetId } });
            console.log(`\n✅ [aigit revert] Active Task and its internal decisions aborted! (Branch: ${currentBranch})\n`);
            return;
        }

        console.log(`\n⚠️  [aigit revert] Could not find any Context, Task, or Decision with ID: ${targetId}\n`);
    } catch (error) {
        console.error('❌ Failed to revert context:', error);
    } finally {
        await prisma.$disconnect();
    }
}
