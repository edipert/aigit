const { PGlite } = require('@electric-sql/pglite');

async function main() {
    const db = new PGlite('../.aigit/memory.db');
    const res = await db.query('SELECT id, content, "symbolName", "filePath", type FROM "Memory";');
    console.log(JSON.stringify(res.rows, null, 2));
}

main().catch(console.error);
