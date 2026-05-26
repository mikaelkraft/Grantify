import pg from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('Missing DATABASE_URL'); process.exit(1); }
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, username, role, name, password_hash FROM admin_users');
    console.log('admin_users:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
})();
