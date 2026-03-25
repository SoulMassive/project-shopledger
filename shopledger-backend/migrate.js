import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function runMigrations() {
  await client.connect();
  console.log('Connected to DB');

  const files = ['001_public_schema.sql', '002_tenant_schema.sql'];
  for (const f of files) {
    const p = path.join('db/migrations', f);
    const sql = fs.readFileSync(p, 'utf8');
    console.log(`Running migration: ${f}...`);
    await client.query(sql);
    console.log(`Finished migration: ${f}`);
  }

  await client.end();
}

runMigrations().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
