// API: GET /api/ads - Get ad configuration
// API: POST /api/ads - Update ad configuration

import pool, { toCamelCase } from './_db.js';

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
      const result = await pool.query('SELECT * FROM ads WHERE id=1');
      if (result.rows.length > 0) {
        return res.status(200).json(toCamelCase(result.rows[0]));
      }
      return res.status(200).json({});
    }
    
    if (req.method === 'POST') {
      const { head, header, body, sidebar, footer } = req.body;
      
      await pool.query(
        `INSERT INTO ads (id, head, header, body, sidebar, footer)
         VALUES (1, $1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
         head = EXCLUDED.head, header = EXCLUDED.header, body = EXCLUDED.body, sidebar = EXCLUDED.sidebar, footer = EXCLUDED.footer`,
        [head, header, body, sidebar, footer]
      );
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Ads API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
