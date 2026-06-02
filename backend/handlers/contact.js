// Handler: /api/contact

import pool from '../db.js';

const parseAdminSession = (req) => {
  try {
    const raw = req.headers['x-admin-session'];
    if (!raw) return null;
    const json = decodeURIComponent(escape(Buffer.from(String(raw), 'base64').toString('utf8')));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const requireValidAdmin = async (req) => {
  const session = parseAdminSession(req);
  if (!session?.id || !session?.passwordHash) return null;
  try {
    const res = await pool.query('SELECT id, password_hash FROM admin_users WHERE id = $1', [session.id]);
    const row = res.rows?.[0];
    if (!row) return null;
    if (String(row.password_hash) !== String(session.passwordHash)) return null;
    return session;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(String(req.query?.limit || '50'), 10) || 50, 1), 200);
      const result = await client.query(
        `SELECT id, name, email, phone, subject, message, created_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      return res.status(200).json(result.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        subject: r.subject,
        message: r.message,
        createdAt: r.created_at
      })));
    }

    if (req.method === 'DELETE') {
      const admin = await requireValidAdmin(req);
      if (!admin) return res.status(401).json({ error: 'Unauthorized' });

      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const del = await client.query('DELETE FROM contact_messages WHERE id = $1', [id]);
      return res.status(200).json({ success: true, deleted: del.rowCount || 0 });
    }

    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = Date.now().toString();
    await client.query(
      `INSERT INTO contact_messages (id, name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, String(name), String(email), phone ? String(phone) : null, String(subject), String(message)]
    );

    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
