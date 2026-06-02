import fs from 'fs/promises';
import pg from 'pg';
const { Pool } = pg;

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Usage: node show-backup-diffs.js <backup.json>');
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  const raw = await fs.readFile(backupPath, 'utf8');
  const payload = JSON.parse(raw);
  const items = payload.backups || [];
  if (!items.length) {
    console.log('No backups in file');
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    for (const it of items) {
      const id = String(it.id);
      const before = it.before || {};
      const res = await client.query('SELECT id, title, content, image, category, tags, source_name AS "sourceName", source_url AS "sourceUrl" FROM blog_posts WHERE id = $1', [id]);
      const row = res.rows[0];
      console.log('---');
      console.log(`id: ${id}`);
      console.log(`title: ${it.title}`);

      const showField = (label, a, b) => {
        if (JSON.stringify(a) === JSON.stringify(b)) {
          console.log(`${label}: (unchanged)`);
          return;
        }
        console.log(`${label}:`);
        console.log('  - before:');
        console.log('    ' + String(a).slice(0, 400).replace(/\n/g, '\n    '));
        console.log('  - after:');
        console.log('    ' + String(b).slice(0, 400).replace(/\n/g, '\n    '));
      };

      showField('category', before.category || '', row?.category || '');
      showField('tags', before.tags || [], row?.tags || []);
      showField('image', before.image || '', row?.image || '');
      showField('sourceName', before.sourceName || '', row?.sourceName || '');
      showField('sourceUrl', before.sourceUrl || '', row?.sourceUrl || '');
      showField('content (snippet)', (before.content || '').slice(0, 800), (row?.content || '').slice(0, 800));
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
