// Handler: /api/contact

import pool from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

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
