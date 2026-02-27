import fs from 'fs';
import path from 'path';
import { prisma, initializeDatabase } from '../db';

export async function dumpContextLedger(workspacePath: string) {
    try {
        await initializeDatabase();

        const projects = await prisma.project.findMany();
        const agents = await prisma.agent.findMany();
        const sessions = await prisma.session.findMany();
        const tasks = await prisma.task.findMany();
        const decisions = await prisma.decision.findMany();

        // Fetch memories including their raw stringified vector embeddings
        const memories = await prisma.$queryRaw<any[]>`
            SELECT id, "projectId", "sessionId", "gitBranch", type, content, embedding::text, "createdAt" 
            FROM "Memory"
        `;

        const ledger = {
            projects,
            agents,
            sessions,
            tasks,
            decisions,
            memories
        };

        const aigitDir = path.join(workspacePath, '.aigit');
        if (!fs.existsSync(aigitDir)) {
            fs.mkdirSync(aigitDir, { recursive: true });
        }

        const ledgerPath = path.join(aigitDir, 'ledger.json');
        fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

        console.log(`\n✅ [aigit] Semantic context deeply serialized to ${ledgerPath}\n`);
    } catch (e) {
        console.error('❌ [aigit] Failed to dump context ledger:', e);
    } finally {
        await prisma.$disconnect();
    }
}

export async function loadContextLedger(workspacePath: string) {
    try {
        const aigitDir = path.join(workspacePath, '.aigit');
        const ledgerPath = path.join(aigitDir, 'ledger.json');

        if (!fs.existsSync(ledgerPath)) {
            console.log(`\n⚠️  [aigit] No ledger.json found at ${ledgerPath}. Existing memory unaffected.\n`);
            return;
        }

        const ledgerData = fs.readFileSync(ledgerPath, 'utf8');
        let ledger;
        try {
            ledger = JSON.parse(ledgerData);
        } catch (e) {
            console.error(`\n❌ [aigit] Invalid ledger.json format. Cannot load context.\n`);
            return;
        }

        await initializeDatabase();

        console.log(`\n🔄 [aigit] Hydrating semantic memory from Git-tracked ledger...`);

        // Wipe current DB deterministically to prevent duplicate clashes during load
        await prisma.memory.deleteMany();
        await prisma.decision.deleteMany();
        await prisma.task.deleteMany();
        await prisma.session.deleteMany();
        await prisma.agent.deleteMany();
        await prisma.project.deleteMany();

        // Utility to revive ISO strings to Date objects for Prisma
        const reviveDates = (arr: any[]) => arr.map(item => {
            const revived = { ...item };
            if (revived.createdAt) revived.createdAt = new Date(revived.createdAt);
            if (revived.updatedAt) revived.updatedAt = new Date(revived.updatedAt);
            if (revived.startedAt) revived.startedAt = new Date(revived.startedAt);
            if (revived.endedAt) revived.endedAt = new Date(revived.endedAt);
            return revived;
        });

        // Bulk load tables sequentially
        if (ledger.projects?.length > 0) await prisma.project.createMany({ data: reviveDates(ledger.projects) });
        if (ledger.agents?.length > 0) await prisma.agent.createMany({ data: reviveDates(ledger.agents) });
        if (ledger.sessions?.length > 0) await prisma.session.createMany({ data: reviveDates(ledger.sessions) });
        if (ledger.tasks?.length > 0) await prisma.task.createMany({ data: reviveDates(ledger.tasks) });
        if (ledger.decisions?.length > 0) await prisma.decision.createMany({ data: reviveDates(ledger.decisions) });

        // Load Memories bypassing 'embedding' initially since it's an Unsupported type
        if (ledger.memories?.length > 0) {
            const safeMemories = ledger.memories.map((m: any) => {
                const { embedding, ...rest } = m;
                return rest;
            });
            await prisma.memory.createMany({ data: reviveDates(safeMemories) });

            // Attach embeddings explicitly via raw SQL 
            for (const memory of ledger.memories) {
                if (memory.embedding) {
                    await prisma.$executeRaw`
                        UPDATE "Memory" SET embedding = ${memory.embedding}::vector WHERE id = ${memory.id}
                    `;
                }
            }
        }

        console.log(`✅ [aigit] Semantic context perfectly reconstructed from ledger.json!\n`);
    } catch (e) {
        console.error('\n❌ [aigit] Failed to load context ledger:', e);
    } finally {
        await prisma.$disconnect();
    }
}
