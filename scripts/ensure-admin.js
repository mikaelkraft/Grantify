import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.error('Provide ADMIN_USERNAME and ADMIN_PASSWORD as env vars to create a test admin.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, username FROM admin_users LIMIT 1');
    if (res.rows.length > 0) {
      console.log('Admin user(s) already exist. No action taken.');
      console.table(res.rows);
      return;
    }

    const id = String(Date.now());
    const hash = await bcrypt.hash(password, 10);
    await client.query('INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)', [id, username, hash, 'owner', 'Migration Test Admin']);
    console.log('Inserted test admin:');
    console.log({ id, username });
    console.log('Use this admin to generate X-Admin-Session header for migration uploads.');
  } catch (err) {
    console.error('Error ensuring admin:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

ensureAdmin();
