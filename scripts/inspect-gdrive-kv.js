import fs from 'node:fs';
import pg from 'pg';

try {
  const env = fs.readFileSync(new URL('../.env', import.meta.url));
  env.toString().split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
} catch (e) {}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const r = await pool.query("SELECT key, value FROM app_kv WHERE key LIKE 'gdrive%'");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error('ERR', e.message || e);
  } finally {
    await pool.end();
  }
})();
