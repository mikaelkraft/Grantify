import fs from 'fs/promises';
import pg from 'pg';
const { Pool } = pg;

const id = process.argv[2];
if (!id) {
  console.error('Usage: node generate-post-preview.js <postId>');
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, title, content FROM blog_posts WHERE id = $1', [String(id)]);
    if (!res.rows.length) {
      console.error('Post not found:', id);
      process.exit(1);
    }
    const row = res.rows[0];
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(row.title).replace(/</g,'&lt;')}</title><link rel="stylesheet" href="https://unpkg.com/tailwindcss@^3/dist/tailwind.min.css"></head><body class="bg-white text-gray-900"><main class="max-w-3xl mx-auto p-8">` +
      `<h1 class="text-3xl font-bold mb-4">${String(row.title)}</h1>` +
      `<article class="prose">${row.content}</article>` +
      `</main></body></html>`;

    const outPath = `.tmp-post-preview-${id}.html`;
    await fs.writeFile(outPath, html, 'utf8');
    console.log('Preview written:', outPath);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
