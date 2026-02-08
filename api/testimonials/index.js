// API: GET /api/testimonials - List all testimonials
// API: POST /api/testimonials - Bulk save testimonials (replace all)

import pool, { toCamelCase } from '../_db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
      return res.status(200).json(result.rows.map(toCamelCase));
    }
    
    if (req.method === 'POST') {
      const body = req.body;
      
      // Handle Single Submission (public form)
      if (body && !Array.isArray(body)) {
        await pool.query(
          `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [body.id, body.name, body.image, body.amount, body.content, body.likes, body.loves, body.claps, body.date, body.status || 'pending']
        );
        return res.status(200).json({ success: true, message: 'Submission received for review' });
      }

      // Handle Bulk Save (admin dashboard)
      if (Array.isArray(body)) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM testimonials');
          
          for (const t of body) {
            await client.query(
              `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [t.id, t.name, t.image, t.amount, t.content, t.likes, t.loves, t.claps, t.date, t.status || null]
            );
          }
          
          await client.query('COMMIT');
          return res.status(200).json({ success: true });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
      
      return res.status(400).json({ error: 'Expected array or object' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Testimonials API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
