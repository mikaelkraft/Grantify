import pg from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('Missing DATABASE_URL'); process.exit(1); }
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    // Use a simple query to be compatible with different SQL dialects
    const res = await client.query('SELECT id, password_hash FROM admin_users LIMIT 1');
    const row = res.rows?.[0];
    console.log('selected row:', row);
    if (!row || !row.id || !row.password_hash) { console.log('no session'); return; }
    const sess = { id: String(row.id), passwordHash: String(row.password_hash) };
    const raw = JSON.stringify(sess);
    const header = Buffer.from(raw,'utf8').toString('base64');
    console.log('header:', header);
    const decoded = JSON.parse(Buffer.from(header,'base64').toString('utf8'));
    console.log('decoded:', decoded);
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
})();
