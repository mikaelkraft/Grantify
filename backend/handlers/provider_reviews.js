// Handler: /api/provider_reviews

import pool from '../db.js';

async function ensureProviderReviewsSchema(client) {
  // Create table if it doesn't exist yet.
  await client.query(`
    CREATE TABLE IF NOT EXISTS provider_reviews (
      id TEXT PRIMARY KEY,
      provider_id INTEGER REFERENCES loan_providers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      rating INTEGER,
      content TEXT NOT NULL,
      parent_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Make older production schemas forward-compatible.
  await client.query(`
    ALTER TABLE provider_reviews
      ADD COLUMN IF NOT EXISTS parent_id TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rating INTEGER
  `);

  await client.query('CREATE INDEX IF NOT EXISTS provider_reviews_provider_id_idx ON provider_reviews (provider_id)');
  await client.query('CREATE INDEX IF NOT EXISTS provider_reviews_parent_id_idx ON provider_reviews (parent_id)');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    await ensureProviderReviewsSchema(client);

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
      if (!providerId || !name || !content) return res.status(400).json({ error: 'Missing required fields' });

      const safeName = String(name || '').trim();
      const safeContent = String(content || '').trim();
      const safeParentId = parentId ? String(parentId) : null;

      if (!safeName || !safeContent) return res.status(400).json({ error: 'Missing required fields' });

      // Keep review threads clean; mirror blog comment anti-spam rule.
      if (/(https?:\/\/|\bwww\.)/i.test(safeContent)) {
        return res.status(400).json({ error: 'Links are not allowed in reviews. Please remove any URLs and try again.' });
      }

      // Validate parent reply (must exist and be for the same provider).
      if (safeParentId) {
        const parent = await client.query(
          'SELECT id, provider_id FROM provider_reviews WHERE id = $1',
          [safeParentId]
        );
        if (parent.rows.length === 0) return res.status(400).json({ error: 'Parent review not found' });
        if (String(parent.rows[0].provider_id) !== String(providerId)) {
          return res.status(400).json({ error: 'Parent review does not belong to this provider' });
        }
      }

      const id = Date.now().toString();
      await client.query(
        `INSERT INTO provider_reviews (id, provider_id, name, rating, content, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, providerId, safeName, safeParentId ? 0 : (Number(rating) || 0), safeContent, safeParentId]
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
    console.error('Provider reviews handler error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
