import { client, initializeDatabase } from './src/db';

async function run() {
  await initializeDatabase();
  const res = await client.query<{table_name: string}>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log(res.rows.map(r => r.table_name));
}

run().catch(console.error);
