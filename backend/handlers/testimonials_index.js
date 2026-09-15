// Handler: /api/testimonials

import pool, { toCamelCase } from '../db.js';

let tableMigrated = false;
async function ensureTestimonialColumns(clientOrPool) {
  if (tableMigrated) return;
  try {
    await clientOrPool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS funding_type TEXT DEFAULT 'grant'`);
    await clientOrPool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT ''`);
    tableMigrated = true;
  } catch (e) {
    console.warn('Testimonial columns migration notice:', e?.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTestimonialColumns(pool);

    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
      return res.status(200).json(result.rows.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const body = req.body;

      if (body && !Array.isArray(body)) {
        const fundingType = String(body.fundingType || body.funding_type || 'grant').toLowerCase();
        const provider = String(body.provider || '').trim();

        await pool.query(
          `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date, status, funding_type, provider)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            body.id, body.name, body.image, body.amount, body.content,
            body.likes, body.loves, body.claps, body.date,
            body.status || 'pending', fundingType, provider
          ]
        );
        return res.status(200).json({ success: true, message: 'Submission received for review' });
      }

      if (Array.isArray(body)) {
        const client = await pool.connect();
        try {
          await ensureTestimonialColumns(client);
          await client.query('BEGIN');
          await client.query('DELETE FROM testimonials');

          for (const t of body) {
            const fundingType = String(t.fundingType || t.funding_type || 'grant').toLowerCase();
            const provider = String(t.provider || '').trim();

            await client.query(
              `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date, status, funding_type, provider)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                t.id, t.name, t.image, t.amount, t.content,
                t.likes, t.loves, t.claps, t.date,
                t.status || null, fundingType, provider
              ]
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
    console.error('Testimonials handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
