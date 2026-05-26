import fs from 'node:fs';
import pg from 'pg';

// Load .env if present
try {
  const envPath = new URL('../.env', import.meta.url);
  const env = fs.readFileSync(new URL('../.env', import.meta.url));
  env.toString().split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
} catch (e) {
  // ignore
}

const API_URL = process.env.API_URL || 'http://localhost:3001';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const r = await pool.query('SELECT id,password_hash FROM admin_users LIMIT 1');
    if (!r.rows || !r.rows[0]) {
      console.error('No admin user found');
      process.exit(1);
    }
    const sess = { id: String(r.rows[0].id), passwordHash: String(r.rows[0].password_hash) };
    const header = Buffer.from(JSON.stringify(sess)).toString('base64');

    const res = await fetch(`${API_URL}/api/uploads/status`, { headers: { 'X-Admin-Session': header } });
    const data = await res.json().catch(() => null);
    console.log('status:', data || (await res.text()));
  } catch (e) {
    console.error('ERR', e.message || e);
    process.exit(2);
  } finally {
    await pool.end();
  }
})();
