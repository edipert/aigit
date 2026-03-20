import fsPromises from 'fs/promises';
import path from 'path';
import { prisma, initializeDatabase } from '../db';
import { sanitizeMemory, sanitizeDecision } from '../security/scrubber';

export async function dumpContextLedger(workspacePath: string) {
    try {
        await initializeDatabase();

        const projects = await prisma.project.findMany();
        const agents = await prisma.agent.findMany();
        const sessions = await prisma.session.findMany();
        const tasks = await prisma.task.findMany();
        const decisions = await prisma.decision.findMany();
        const healingEvents = await prisma.healingEvent.findMany();

        // Fetch memories including their raw stringified vector embeddings
        const memories = await prisma.$queryRaw<any[]>`
            SELECT id, "projectId", "sessionId", "gitBranch", type, content, embedding::text, "createdAt"
            FROM "Memory"
        `;

        const sanitizedDecisions = decisions.map(sanitizeDecision);
        const sanitizedMemories = memories.map(sanitizeMemory);

        const ledger = {
            projects,
            agents,
            sessions,
            tasks,
            decisions: sanitizedDecisions,
            memories: sanitizedMemories,
            healingEvents
        };

        const aigitDir = path.join(workspacePath, '.aigit');
        await fsPromises.mkdir(aigitDir, { recursive: true });

        const ledgerPath = path.join(aigitDir, 'ledger.json');
        await fsPromises.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

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

        let ledgerData;
        try {
            ledgerData = await fsPromises.readFile(ledgerPath, 'utf8');
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                console.log(`\n⚠️  [aigit] No ledger.json found at ${ledgerPath}. Existing memory unaffected.\n`);
                return;
            }
            throw e;
        }

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
        await prisma.healingEvent.deleteMany();
        await prisma.memory.deleteMany();
        await prisma.decision.deleteMany();
        await prisma.task.deleteMany();
        await prisma.session.deleteMany();
        await prisma.agent.deleteMany();
        await prisma.swarmMessage.deleteMany();
        await prisma.swarmAgent.deleteMany();
        await prisma.swarmSession.deleteMany();
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
        if (ledger.healingEvents?.length > 0) await prisma.healingEvent.createMany({ data: reviveDates(ledger.healingEvents) });

        // Load Memories bypassing 'embedding' initially since it's an Unsupported type
        if (ledger.memories?.length > 0) {
            const safeMemories = ledger.memories.map((m: any) => {
                const { embedding, ...rest } = m;
                return rest;
            });
            await prisma.memory.createMany({ data: reviveDates(safeMemories) });

            // Attach embeddings explicitly via raw SQL bulk update to avoid N+1 queries
            const memoriesWithEmbeddings = ledger.memories.filter((m: any) => m.embedding);

            if (memoriesWithEmbeddings.length > 0) {
                // Using parameterized queries with VALUES requires exact unrolling of placeholders
                // PostgreSQL limits parameters to ~65535. With 2 params per memory, chunk at 10000 to be safe.
                const CHUNK_SIZE = 10000;

                for (let i = 0; i < memoriesWithEmbeddings.length; i += CHUNK_SIZE) {
                    const chunk = memoriesWithEmbeddings.slice(i, i + CHUNK_SIZE);
                    const placeholders: string[] = [];
                    const values: any[] = [];

                    chunk.forEach((memory: any, index: number) => {
                        const idParam = `$${index * 2 + 1}`;
                        const embedParam = `$${index * 2 + 2}`;
                        placeholders.push(`(${idParam}, ${embedParam}::text)`);
                        values.push(memory.id, memory.embedding);
                    });

                    const query = `
                        UPDATE "Memory" AS m
                        SET embedding = v.embedding::vector
                        FROM (VALUES ${placeholders.join(', ')}) AS v(id, embedding)
                        WHERE m.id = v.id;
                    `;

                    await prisma.$executeRawUnsafe(query, ...values);
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
