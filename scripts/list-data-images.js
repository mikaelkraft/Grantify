import pg from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT id, title, left(image,200) AS image, left(content,300) AS snippet FROM blog_posts WHERE left(coalesce(image,''),5) = 'data:' OR content ILIKE '%data:%' ORDER BY created_at DESC"
    );
    const rows = res.rows || [];
    if (!rows.length) {
      console.log('No posts with data URI images found');
      return;
    }
    for (const r of rows) {
      console.log('---');
      console.log(`id: ${r.id}`);
      console.log(`title: ${r.title}`);
      console.log(`image: ${r.image}`);
      console.log(`snippet:\n${r.snippet}\n`);
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
