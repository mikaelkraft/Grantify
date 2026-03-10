// API: POST /api/contact - Store contact form submissions
import pool from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    const id = Date.now().toString();
    await client.query(
      `INSERT INTO contact_messages (id, name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, String(name), String(email), phone ? String(phone) : null, String(subject), String(message)]
    );
    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('Contact API Error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
