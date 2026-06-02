#!/usr/bin/env node
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const pg = require('pg');

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Usage: node inspect-backup-and-db.js <path-to-backup.json>');
  process.exit(2);
}

(async () => {
  try {
    const raw = fs.readFileSync(backupPath, 'utf8');
    const payload = JSON.parse(raw);
    const ids = (payload.backups || []).map(b => String(b.id));
    if (!ids.length) {
      console.error('No backups found in file');
      process.exit(1);
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('Missing DATABASE_URL in env');
      process.exit(1);
    }

    const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT id, title, image, left(content, 800) AS snippet FROM blog_posts WHERE id = ANY($1::text[]) ORDER BY created_at DESC`,
        [ids]
      );

      const rows = res.rows || [];
      for (const r of rows) {
        console.log('---');
        console.log(`id: ${r.id}`);
        console.log(`title: ${r.title}`);
        console.log(`image: ${r.image || '(empty)'}`);
        console.log('snippet:');
        console.log(r.snippet.replace(/\n/g, ' '));
      }

      if (!rows.length) console.log('No matching posts found in DB for ids from backup.');
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
