"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumpContextLedger = dumpContextLedger;
exports.loadContextLedger = loadContextLedger;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const scrubber_1 = require("../security/scrubber");
async function dumpContextLedger(workspacePath) {
    try {
        await (0, db_1.initializeDatabase)();
        const projects = await db_1.prisma.project.findMany();
        const agents = await db_1.prisma.agent.findMany();
        const sessions = await db_1.prisma.session.findMany();
        const tasks = await db_1.prisma.task.findMany();
        const decisions = await db_1.prisma.decision.findMany();
        const healingEvents = await db_1.prisma.healingEvent.findMany();
        // Fetch memories including their raw stringified vector embeddings
        const memories = await db_1.prisma.$queryRaw `
            SELECT id, "projectId", "sessionId", "gitBranch", type, content, embedding::text, "createdAt"
            FROM "Memory"
        `;
        const sanitizedDecisions = decisions.map(scrubber_1.sanitizeDecision);
        const sanitizedMemories = memories.map(scrubber_1.sanitizeMemory);
        const ledger = {
            projects,
            agents,
            sessions,
            tasks,
            decisions: sanitizedDecisions,
            memories: sanitizedMemories,
            healingEvents
        };
        const aigitDir = path_1.default.join(workspacePath, '.aigit');
        if (!fs_1.default.existsSync(aigitDir)) {
            fs_1.default.mkdirSync(aigitDir, { recursive: true });
        }
        const ledgerPath = path_1.default.join(aigitDir, 'ledger.json');
        fs_1.default.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
        console.log(`\n✅ [aigit] Semantic context deeply serialized to ${ledgerPath}\n`);
    }
    catch (e) {
        console.error('❌ [aigit] Failed to dump context ledger:', e);
    }
    finally {
        await db_1.prisma.$disconnect();
    }
}
async function loadContextLedger(workspacePath) {
    try {
        const aigitDir = path_1.default.join(workspacePath, '.aigit');
        const ledgerPath = path_1.default.join(aigitDir, 'ledger.json');
        if (!fs_1.default.existsSync(ledgerPath)) {
            console.log(`\n⚠️  [aigit] No ledger.json found at ${ledgerPath}. Existing memory unaffected.\n`);
            return;
        }
        const ledgerData = fs_1.default.readFileSync(ledgerPath, 'utf8');
        let ledger;
        try {
            ledger = JSON.parse(ledgerData);
        }
        catch (e) {
            console.error(`\n❌ [aigit] Invalid ledger.json format. Cannot load context.\n`);
            return;
        }
        await (0, db_1.initializeDatabase)();
        console.log(`\n🔄 [aigit] Hydrating semantic memory from Git-tracked ledger...`);
        // Wipe current DB deterministically to prevent duplicate clashes during load
        await db_1.prisma.healingEvent.deleteMany();
        await db_1.prisma.memory.deleteMany();
        await db_1.prisma.decision.deleteMany();
        await db_1.prisma.task.deleteMany();
        await db_1.prisma.session.deleteMany();
        await db_1.prisma.agent.deleteMany();
        await db_1.prisma.project.deleteMany();
        // Utility to revive ISO strings to Date objects for Prisma
        const reviveDates = (arr) => arr.map(item => {
            const revived = { ...item };
            if (revived.createdAt)
                revived.createdAt = new Date(revived.createdAt);
            if (revived.updatedAt)
                revived.updatedAt = new Date(revived.updatedAt);
            if (revived.startedAt)
                revived.startedAt = new Date(revived.startedAt);
            if (revived.endedAt)
                revived.endedAt = new Date(revived.endedAt);
            return revived;
        });
        // Bulk load tables sequentially
        if (ledger.projects?.length > 0)
            await db_1.prisma.project.createMany({ data: reviveDates(ledger.projects) });
        if (ledger.agents?.length > 0)
            await db_1.prisma.agent.createMany({ data: reviveDates(ledger.agents) });
        if (ledger.sessions?.length > 0)
            await db_1.prisma.session.createMany({ data: reviveDates(ledger.sessions) });
        if (ledger.tasks?.length > 0)
            await db_1.prisma.task.createMany({ data: reviveDates(ledger.tasks) });
        if (ledger.decisions?.length > 0)
            await db_1.prisma.decision.createMany({ data: reviveDates(ledger.decisions) });
        if (ledger.healingEvents?.length > 0)
            await db_1.prisma.healingEvent.createMany({ data: reviveDates(ledger.healingEvents) });
        // Load Memories bypassing 'embedding' initially since it's an Unsupported type
        if (ledger.memories?.length > 0) {
            const safeMemories = ledger.memories.map((m) => {
                const { embedding, ...rest } = m;
                return rest;
            });
            await db_1.prisma.memory.createMany({ data: reviveDates(safeMemories) });
            // Attach embeddings explicitly via raw SQL
            for (const memory of ledger.memories) {
                if (memory.embedding) {
                    await db_1.prisma.$executeRaw `
                        UPDATE "Memory" SET embedding = ${memory.embedding}::vector WHERE id = ${memory.id}
                    `;
                    await db_1.prisma.$executeRawUnsafe(query, ...values);
                }
            }
        }
        console.log(`✅ [aigit] Semantic context perfectly reconstructed from ledger.json!\n`);
    }
    catch (e) {
        console.error('\n❌ [aigit] Failed to load context ledger:', e);
    }
    finally {
        await db_1.prisma.$disconnect();
    }
}
