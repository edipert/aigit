import { prisma } from '../../db';
import type { CommandHandler } from './types';

const GC_HELP = `
🧹 aigit gc — Garbage Collection

Cleans up the semantic memory ledger by removing old temporary context and packing the database.

Usage:
  aigit gc [--days <N>]

Options:
  --days <N>    Remove auto-generated capability/context memories older than N days (default: 30)

Examples:
  aigit gc
  aigit gc --days 14
`;

const handler: CommandHandler = async ({ args }) => {
    if (args[0] === '--help' || args[0] === '-h') {
        console.log(GC_HELP);
        return;
    }

    console.log('🧹 [aigit gc] Starting Context Garbage Collection...\n');

    const daysIdx = args.indexOf('--days');
    const keepDays = daysIdx !== -1 ? Number(args[daysIdx + 1]) : 30;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    let totalDeleted = 0;

    // 1. Delete old auto-generated memories (capability, context) older than N days.
    // Explicit notes and architecture memories are kept forever.
    try {
        const deletedMemories = await prisma.memory.deleteMany({
            where: {
                type: { in: ['capability', 'context'] },
                createdAt: { lt: cutoffDate }
            }
        });
        console.log(`  🗑️  Deleted ${deletedMemories.count} auto-generated temporary memories older than ${keepDays} days.`);
        totalDeleted += deletedMemories.count;
    } catch (e: any) {
        console.log(`  ⚠️  Failed to delete old memories: ${e.message}`);
    }

    // 2. Identify and clear orphaned Tasks (Tasks that have no decisions and are DONE/CANCELLED)
    try {
        const emptyTasks = await prisma.task.findMany({
            where: {
                decisions: { none: {} },
                status: { in: ['DONE', 'CANCELLED'] }
            }
        });

        if (emptyTasks.length > 0) {
            await prisma.task.deleteMany({
                where: { id: { in: emptyTasks.map(t => t.id) } }
            });
            console.log(`  🗑️  Cleaned up ${emptyTasks.length} empty, resolved tasks.`);
            totalDeleted += emptyTasks.length;
        } else {
            console.log(`  🗑️  No empty resolved tasks to clean up.`);
        }
    } catch (e: any) {
        console.log(`  ⚠️  Failed to clean up empty tasks: ${e.message}`);
    }

    // 3. Compact the database
    // Note: PGlite supports standard PostgreSQL vacuum syntax
    console.log(`  🗜️  Vacuuming database to reclaim storage...`);
    try {
        await prisma.$executeRawUnsafe(`VACUUM ANALYZE;`);
        console.log(`  ✅ Database optimized.`);
    } catch(e: any) {
        console.log(`  ⚠️  Vacuum failed or unsupported in this adapter: ${e.message}`);
    }

    console.log(`\n✨ GC Completed. Freed ${totalDeleted} context items.\n`);
};

export default handler;
