import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

const filePath = process.argv[2] || 'migration_fix.sql';
const sql = fs.readFileSync(filePath, 'utf8');
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async function run() {
  const client = await pool.connect();
  try {
    console.log('Applying SQL file:', filePath);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL applied successfully');
  } catch (err) {
    console.error('Failed to apply SQL file:', err);
    try { await client.query('ROLLBACK'); } catch {}
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
