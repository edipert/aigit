"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.client = void 0;
exports.initializeDatabase = initializeDatabase;
const client_1 = require("@prisma/client");
const pglite_1 = require("@electric-sql/pglite");
const pglite_prisma_adapter_1 = require("pglite-prisma-adapter");
// @ts-ignore - The pglite vector extension Typescript definitions are currently missing from the distribution
const vector_1 = require("@electric-sql/pglite/vector");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Check if we are starting MCP with a specific directory argument
let targetDir = process.cwd();
const args = process.argv.slice(2);
if (args[0] === 'mcp' && args[1]) {
    const potentialDir = args[1];
    if (path_1.default.isAbsolute(potentialDir)) {
        targetDir = potentialDir;
    }
    else {
        targetDir = path_1.default.resolve(process.cwd(), potentialDir);
    }
}
// Define the path to the embedded memory database
const AIGIT_DIR = path_1.default.join(targetDir, '.aigit');
const AIGIT_DB_PATH = path_1.default.join(AIGIT_DIR, 'memory.db');
if (!fs_1.default.existsSync(AIGIT_DIR)) {
    fs_1.default.mkdirSync(AIGIT_DIR, { recursive: true });
}
// Instantiate PGlite with the pgvector extension enabled
exports.client = new pglite_1.PGlite(AIGIT_DB_PATH, {
    extensions: {
        vector: vector_1.vector,
    },
});
const adapter = new pglite_prisma_adapter_1.PrismaPGlite(exports.client);
exports.prisma = new client_1.PrismaClient({ adapter });
async function initializeDatabase() {
    try {
        const result = await exports.client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'Project'
            );
        `);
        if (!result.rows[0].exists) {
            console.error('[AI Context Protocol Engine] Initializing bare PGlite database schema...');
            const schemaSqlPath = path_1.default.join(__dirname, '..', 'prisma', 'migrations', '20260226204239_add_git_branch', 'migration.sql');
            let schemaSql = '';
            try {
                schemaSql = fs_1.default.readFileSync(schemaSqlPath, 'utf8');
            }
            catch (err) {
                const fallbackPath = path_1.default.join(__dirname, '..', '..', 'prisma', 'migrations', '20260226204239_add_git_branch', 'migration.sql');
                if (fs_1.default.existsSync(fallbackPath)) {
                    schemaSql = fs_1.default.readFileSync(fallbackPath, 'utf8');
                }
                else {
                    console.error('[AI Context Protocol Engine] Could not find migration file at either location.');
                    return;
                }
            }
            await exports.client.exec(schemaSql);
        }
        // Phase 18: Auto-migrate existing databases to add new columns
        await applyColumnMigrations();
    }
    catch (error) {
        console.error('[AI Context Protocol Engine] Error initializing database schema:', error);
    }
}
async function applyColumnMigrations() {
    const migrations = [
        { table: '"Memory"', column: '"filePath"', type: 'TEXT' },
        { table: '"Memory"', column: '"lineNumber"', type: 'INTEGER' },
        { table: '"Memory"', column: '"symbolName"', type: 'TEXT' },
        { table: '"Memory"', column: '"symbolType"', type: 'TEXT' },
        { table: '"Memory"', column: '"symbolRange"', type: 'TEXT' },
        { table: '"Decision"', column: '"filePath"', type: 'TEXT' },
        { table: '"Decision"', column: '"lineNumber"', type: 'INTEGER' },
        { table: '"Decision"', column: '"symbolName"', type: 'TEXT' },
        { table: '"Decision"', column: '"symbolType"', type: 'TEXT' },
        { table: '"Decision"', column: '"symbolRange"', type: 'TEXT' },
    ];
    for (const m of migrations) {
        try {
            const check = await exports.client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = ${m.table.replace(/"/g, "'")}
                    AND column_name = ${m.column.replace(/"/g, "'")}
                );
            `);
            if (!check.rows[0].exists) {
                await exports.client.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type};`);
                console.error(`[aigit] Migration: Added ${m.column} to ${m.table}`);
            }
        }
        catch {
            // Column may already exist, safe to skip
        }
    }
    // Phase 28: Initialize HealingEvent table if it doesn't exist
    try {
        const check = await exports.client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'HealingEvent'
            );
        `);
        if (!check.rows[0].exists) {
            await exports.client.exec(`
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
                ALTER TABLE "HealingEvent" ADD CONSTRAINT "HealingEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            `);
            console.error(`[aigit] Migration: Created table HealingEvent`);
        }
    }
    catch (e) {
        console.error(`[aigit] Error creating HealingEvent table:`, e);
    }
}
