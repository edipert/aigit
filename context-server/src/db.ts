import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
// @ts-ignore - The pglite vector extension Typescript definitions are currently missing from the distribution
import { vector } from '@electric-sql/pglite/vector';
import path from 'path';
import fs from 'fs';

// Define the path to the embedded global database
const AIGIT_DIR = path.join(process.cwd(), '.aigit');
const AIGIT_DB_PATH = path.join(AIGIT_DIR, 'memory.db');

if (!fs.existsSync(AIGIT_DIR)) {
    fs.mkdirSync(AIGIT_DIR, { recursive: true });
}

// Instantiate PGlite with the pgvector extension enabled
export const client = new PGlite(AIGIT_DB_PATH, {
    extensions: {
        vector,
    },
});

const adapter = new PrismaPGlite(client);
export const prisma = new PrismaClient({ adapter });

export async function initializeDatabase() {
    try {
        const result = await client.query<{ exists: boolean }>(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'Project'
            );
        `);
        if (!result.rows[0].exists) {
            console.error('[AI Context Protocol Engine] Initializing bare PGlite database schema...');
            const schemaSqlPath = path.join(__dirname, '..', 'prisma', 'migrations', '20260226204239_add_git_branch', 'migration.sql');
            let schemaSql = '';

            try {
                schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
            } catch (err) {
                const fallbackPath = path.join(__dirname, '..', '..', 'prisma', 'migrations', '20260226204239_add_git_branch', 'migration.sql');
                if (fs.existsSync(fallbackPath)) {
                    schemaSql = fs.readFileSync(fallbackPath, 'utf8');
                } else {
                    console.error('[AI Context Protocol Engine] Could not find migration file at either location.');
                    return;
                }
            }

            await client.exec(schemaSql);
        }

        // Phase 18: Auto-migrate existing databases to add new columns
        await applyColumnMigrations();
    } catch (error) {
        console.error('[AI Context Protocol Engine] Error initializing database schema:', error);
    }
}

async function applyColumnMigrations() {
    const migrations: { table: string; column: string; type: string }[] = [
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
            const check = await client.query<{ exists: boolean }>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = ${m.table.replace(/"/g, "'")}
                    AND column_name = ${m.column.replace(/"/g, "'")}
                );
            `);
            if (!check.rows[0].exists) {
                await client.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type};`);
                console.error(`[aigit] Migration: Added ${m.column} to ${m.table}`);
            }
        } catch {
            // Column may already exist, safe to skip
        }
    }

    // Phase 28: Initialize HealingEvent table if it doesn't exist
    try {
        const check = await client.query<{ exists: boolean }>(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'HealingEvent'
            );
        `);
        if (!check.rows[0].exists) {
            await client.exec(`
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
    } catch (e) {
        console.error(`[aigit] Error creating HealingEvent table:`, e);
    }
}
