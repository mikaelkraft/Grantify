// API: PUT /api/testimonials/[id] - Update a single testimonial

import pool from '../_db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      const { likes, loves, claps, name, content, amount, status } = req.body;
      
      await pool.query(
        `UPDATE testimonials SET likes=$1, loves=$2, claps=$3, name=$4, content=$5, amount=$6, status=$7 WHERE id=$8`,
        [likes, loves, claps, name, content, amount, status || null, id]
      );
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Testimonial Update API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
