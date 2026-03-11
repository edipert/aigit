"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.client = void 0;
exports.findWorkspaceRoot = findWorkspaceRoot;
exports.initializeDatabase = initializeDatabase;
const client_1 = require("@prisma/client");
const pglite_1 = require("@electric-sql/pglite");
const pglite_prisma_adapter_1 = require("pglite-prisma-adapter");
// @ts-ignore — PGlite vector extension types missing from distribution
const vector_1 = require("@electric-sql/pglite/vector");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ── Workspace resolution ──────────────────────────────────────────────────────
function findWorkspaceRoot(startDir) {
    let current = startDir;
    while (current !== path_1.default.parse(current).root) {
        if (fs_1.default.existsSync(path_1.default.join(current, '.aigit')) || fs_1.default.existsSync(path_1.default.join(current, '.git'))) {
            return current;
        }
        current = path_1.default.dirname(current);
    }
    return startDir;
}
/**
 * Resolve the target directory for the database.
 * When the CLI is invoked as `aigit mcp /path/to/project`, we use that explicit path.
 * Otherwise we walk up from cwd to find the workspace root.
 */
function resolveTargetDir() {
    const args = process.argv.slice(2);
    if (args[0] === 'mcp' && args[1]) {
        const candidate = args[1];
        return path_1.default.isAbsolute(candidate)
            ? candidate
            : path_1.default.resolve(process.cwd(), candidate);
    }
    return findWorkspaceRoot(process.cwd());
}
// ── DB path setup ─────────────────────────────────────────────────────────────
const targetDir = resolveTargetDir();
const AIGIT_DIR = path_1.default.join(targetDir, '.aigit');
const AIGIT_DB_PATH = path_1.default.join(AIGIT_DIR, 'memory.db');
if (!fs_1.default.existsSync(AIGIT_DIR)) {
    fs_1.default.mkdirSync(AIGIT_DIR, { recursive: true });
}
// ── PGlite + Prisma singletons ────────────────────────────────────────────────
exports.client = new pglite_1.PGlite(AIGIT_DB_PATH, { extensions: { vector: vector_1.vector } });
const adapter = new pglite_prisma_adapter_1.PrismaPGlite(exports.client);
exports.prisma = new client_1.PrismaClient({ adapter });
// ── Embedded base schema (replaces the fragile dual-path file lookup) ─────────
// This is the canonical schema for a fresh database.
// Append-only. Never mutate existing DDL — write a new migration instead.
const BASE_SCHEMA = /* sql */ `
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skills" TEXT[],
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gitBranch" TEXT NOT NULL DEFAULT 'main',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "gitBranch" TEXT NOT NULL DEFAULT 'main',
    "context" TEXT NOT NULL,
    "chosen" TEXT NOT NULL,
    "rejected" TEXT[],
    "reasoning" TEXT NOT NULL,
    "filePath" TEXT,
    "lineNumber" INTEGER,
    "symbolName" TEXT,
    "symbolType" TEXT,
    "symbolRange" TEXT,
    "issueRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT,
    "gitBranch" TEXT NOT NULL DEFAULT 'main',
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "filePath" TEXT,
    "lineNumber" INTEGER,
    "symbolName" TEXT,
    "symbolType" TEXT,
    "symbolRange" TEXT,
    "issueRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HealingEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "filePath" TEXT,
    "symbolName" TEXT,
    "strategy" TEXT NOT NULL,
    "patch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gitBranch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");
CREATE UNIQUE INDEX "Task_slug_key" ON "Task"("slug");

ALTER TABLE "Agent" ADD CONSTRAINT "Agent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HealingEvent" ADD CONSTRAINT "HealingEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;
const MIGRATIONS = [
    // v1–v12: All these columns are already in BASE_SCHEMA for new DBs.
    // They remain here for safe upgrade of instances created before the base schema was unified.
    {
        version: 1,
        description: 'Add AST anchor columns to Memory',
        sql: `
            ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
            ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "lineNumber" INTEGER;
            ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "symbolName" TEXT;
            ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "symbolType" TEXT;
            ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "symbolRange" TEXT;
            ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "issueRef" TEXT;
        `,
    },
    {
        version: 2,
        description: 'Add AST anchor columns to Decision',
        sql: `
            ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
            ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "lineNumber" INTEGER;
            ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "symbolName" TEXT;
            ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "symbolType" TEXT;
            ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "symbolRange" TEXT;
            ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "issueRef" TEXT;
        `,
    },
    {
        version: 3,
        description: 'Create HealingEvent table',
        sql: `
            CREATE TABLE IF NOT EXISTS "HealingEvent" (
                "id" TEXT NOT NULL,
                "projectId" TEXT NOT NULL,
                "trigger" TEXT NOT NULL,
                "source" TEXT NOT NULL,
                "diagnosis" TEXT NOT NULL,
                "filePath" TEXT,
                "symbolName" TEXT,
                "strategy" TEXT NOT NULL,
                "patch" TEXT,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "gitBranch" TEXT NOT NULL DEFAULT 'main',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "HealingEvent_pkey" PRIMARY KEY ("id")
            );
            ALTER TABLE "HealingEvent"
                ADD CONSTRAINT "HealingEvent_projectId_fkey"
                FOREIGN KEY ("projectId") REFERENCES "Project"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE
                NOT VALID;
        `,
    },
    // ── Add future migrations below ───────────────────────────────────────────
    // Template:
    // {
    //     version: 4,
    //     description: 'Your human-readable description',
    //     sql: `ALTER TABLE "Foo" ADD COLUMN IF NOT EXISTS "bar" TEXT;`,
    // },
];
// ── Migration runner ──────────────────────────────────────────────────────────
async function ensureMigrationTable() {
    await exports.client.exec(`
        CREATE TABLE IF NOT EXISTS "__aigit_migrations" (
            "version" INTEGER NOT NULL,
            "description" TEXT NOT NULL,
            "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "__aigit_migrations_pkey" PRIMARY KEY ("version")
        );
    `);
}
async function getAppliedVersions() {
    const result = await exports.client.query('SELECT version FROM "__aigit_migrations"');
    return new Set(result.rows.map(r => r.version));
}
async function applyMigrations() {
    await ensureMigrationTable();
    const applied = await getAppliedVersions();
    const pending = MIGRATIONS.filter(m => !applied.has(m.version)).sort((a, b) => a.version - b.version);
    for (const migration of pending) {
        try {
            await exports.client.exec(migration.sql);
            await exports.client.query(`INSERT INTO "__aigit_migrations" (version, description) VALUES ($1, $2)`, [migration.version, migration.description]);
            console.error(`[aigit] Migration v${migration.version} applied: ${migration.description}`);
        }
        catch (err) {
            // Graceful skip for idempotent failures (column already exists etc.)
            if (err.message?.includes('already exists')) {
                await exports.client.query(`INSERT INTO "__aigit_migrations" (version, description) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [migration.version, migration.description]);
            }
            else {
                console.error(`[aigit] Migration v${migration.version} failed: ${err.message}`);
            }
        }
    }
}
// ── Database initializer (called once at startup) ─────────────────────────────
async function initializeDatabase() {
    try {
        // Check if the Project table exists — if not, this is a fresh DB
        const result = await exports.client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'Project'
            );
        `);
        if (!result.rows[0].exists) {
            console.error('[aigit] Fresh database detected — applying base schema...');
            await exports.client.exec(BASE_SCHEMA);
        }
        // Always run incremental migrations (idempotent — skips already-applied ones)
        await applyMigrations();
    }
    catch (error) {
        console.error('[aigit] Error initializing database:', error);
    }
}
