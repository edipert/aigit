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
                // If __dirname is inside src, fallback 
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
    } catch (error) {
        console.error('[AI Context Protocol Engine] Error initializing database schema:', error);
    }
}
