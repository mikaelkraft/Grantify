// API: GET /api/qualified - List qualified persons
// API: POST /api/qualified - Bulk save qualified persons (replace all)

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
      const result = await pool.query('SELECT * FROM qualified_persons');
      return res.status(200).json(result.rows.map(toCamelCase));
    }
    
    if (req.method === 'POST') {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected array' });
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM qualified_persons');
        
        for (const q of items) {
          await client.query(
            `INSERT INTO qualified_persons (id, name, amount, status, notes) VALUES ($1, $2, $3, $4, $5)`,
            [q.id, q.name, q.amount, q.status, q.notes]
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
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Qualified Persons API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
