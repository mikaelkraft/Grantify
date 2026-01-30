// API: /api/provider_reviews - Manage loan provider reviews
import pool from './_db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      const { providerId } = req.query;
      
      let query = 'SELECT * FROM provider_reviews';
      const params = [];

      if (providerId) {
        query += ' WHERE provider_id = $1';
        params.push(providerId);
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      
      // Map to camelCase
      const reviews = result.rows.map(row => ({
        id: row.id,
        providerId: row.provider_id,
        name: row.name,
        rating: row.rating,
        content: row.content,
        parentId: row.parent_id,
        createdAt: row.created_at
      }));
      
      return res.status(200).json(reviews);
    } 

    if (req.method === 'POST') {
      const { providerId, name, rating, content, parentId } = req.body;
      
      if (!providerId || !name || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const id = Date.now().toString();
      
      await client.query(
        `INSERT INTO provider_reviews (id, provider_id, name, rating, content, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, providerId, name, rating || 0, content, parentId || null]
      );
      
      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });
      
      await client.query('DELETE FROM provider_reviews WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Provider Reviews API Error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
