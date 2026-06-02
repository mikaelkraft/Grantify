import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const API_URL = String(process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

const makeAdminSessionHeader = async (client) => {
  try {
    const res = await client.query('SELECT id, password_hash FROM admin_users LIMIT 1');
    const row = res.rows?.[0];
    if (!row || !row.id || !row.password_hash) return null;
    const sess = { id: String(row.id), passwordHash: String(row.password_hash) };
    const raw = JSON.stringify(sess);
    return Buffer.from(raw, 'utf8').toString('base64');
  } catch (e) {
    return null;
  }
};

async function preview() {
  const client = await pool.connect();
  try {
    const adminHeader = await makeAdminSessionHeader(client);
    if (!adminHeader) {
      console.log('No admin session available. Create an admin or set ADMIN_USERNAME/ADMIN_PASSWORD and run scripts/ensure-admin.js');
      return;
    }

    // Broad match for data: URIs in image field or content
    const res = await client.query("SELECT id, image, content FROM blog_posts WHERE (image IS NOT NULL AND image LIKE 'data:%') OR (content LIKE '%data:%') LIMIT 200");
    if (!res.rows.length) {
      console.log('No data-URI images found in posts.');
      return;
    }

    console.log(`Found ${res.rows.length} posts with data-URI images. Attempting presign (no upload)...`);

    for (const row of res.rows) {
      const ids = [];
      if (row.image && String(row.image).startsWith('data:')) ids.push({ type: 'image', data: row.image, name: `post-${row.id}.png` });
      const imgRegex = /<img[^>]+src=["'](data:[^"']+)["'][^>]*>/gi;
      let m;
      while ((m = imgRegex.exec(String(row.content || ''))) !== null) {
        ids.push({ type: 'embedded', data: m[1], name: `post-${row.id}-${Math.floor(Math.random()*10000)}.png` });
      }

      if (ids.length === 0) continue;
      console.log(`\nPost ${row.id} -> ${ids.length} data-uri(s)`);

      for (const item of ids) {
        try {
          const resp = await fetch(`${API_URL}/api/uploads/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Session': adminHeader },
            body: JSON.stringify({ filename: item.name, contentType: 'image/png', folder: 'blog-images' }),
            timeout: 15000,
          });
          const data = await resp.json().catch(() => null);
          console.log(' presign ->', resp.status, data && data.provider ? `${data.provider} ${data.publicUrl || data.uploadUrl}` : JSON.stringify(data));
        } catch (e) {
          console.log(' presign error:', String(e));
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

preview();
