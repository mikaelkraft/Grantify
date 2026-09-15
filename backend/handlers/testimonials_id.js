// Handler: /api/testimonials/:id

import pool from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      const { likes, loves, claps, name, content, amount, status, image, date, fundingType, provider } = req.body;
      const fType = fundingType ? String(fundingType).toLowerCase() : null;

      await pool.query(
        `UPDATE testimonials 
         SET likes = COALESCE($1, likes),
             loves = COALESCE($2, loves),
             claps = COALESCE($3, claps),
             name = COALESCE($4, name),
             content = COALESCE($5, content),
             amount = COALESCE($6, amount),
             status = $7,
             image = COALESCE($8, image),
             date = COALESCE($9, date),
             funding_type = COALESCE($10, funding_type),
             provider = COALESCE($11, provider)
         WHERE id = $12`,
        [likes, loves, claps, name, content, amount, status || null, image, date, fType, provider, id]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Testimonial update handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
