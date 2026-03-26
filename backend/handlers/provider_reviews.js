// Handler: /api/provider_reviews

import pool from '../db.js';

const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

const getClientIp = (req) => {
  const raw = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '';
  const first = Array.isArray(raw) ? raw[0] : String(raw);
  return first.split(',')[0].trim();
};

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
      ADD COLUMN IF NOT EXISTS rating INTEGER,
      ADD COLUMN IF NOT EXISTS user_id TEXT,
      ADD COLUMN IF NOT EXISTS ip TEXT,
      ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await client.query('CREATE INDEX IF NOT EXISTS provider_reviews_provider_id_idx ON provider_reviews (provider_id)');
  await client.query('CREATE INDEX IF NOT EXISTS provider_reviews_parent_id_idx ON provider_reviews (parent_id)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS provider_review_likes (
      review_id TEXT NOT NULL,
      user_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (review_id, user_key)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS provider_review_likes_review_id_idx ON provider_review_likes (review_id)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS provider_review_dislikes (
      review_id TEXT NOT NULL,
      user_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (review_id, user_key)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS provider_review_dislikes_review_id_idx ON provider_review_dislikes (review_id)');
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
      const sort = toStr(req.query?.sort).trim().toLowerCase();
      const includeHidden = toStr(req.query?.includeHidden).trim() === '1';

      const whereParts = [];
      const params = [];

      if (providerId) {
        params.push(providerId);
        whereParts.push(`provider_id = $${params.length}`);
      }

      if (!includeHidden) {
        whereParts.push('(is_hidden IS NOT TRUE)');
      }

      const whereSql = whereParts.length ? ` WHERE ${whereParts.join(' AND ')}` : '';

      const orderSql = (() => {
        if (sort === 'helpful') return ' ORDER BY likes DESC, created_at DESC';
        if (sort === 'oldest') return ' ORDER BY created_at ASC';
        return ' ORDER BY created_at DESC';
      })();

      const query = `SELECT id, provider_id, name, rating, content, parent_id, created_at, user_id, likes, dislikes, is_hidden
             FROM provider_reviews${whereSql}${orderSql}`;

      const result = await client.query(query, params);
      const reviews = result.rows.map(row => ({
        id: row.id,
        providerId: row.provider_id,
        name: row.name,
        rating: row.rating,
        content: row.content,
        parentId: row.parent_id,
        createdAt: row.created_at,
        userId: row.user_id || undefined,
        likes: row.likes ?? 0,
        dislikes: row.dislikes ?? 0,
        isHidden: row.is_hidden === true
      }));

      return res.status(200).json(reviews);
    }

    if (req.method === 'POST') {
      const action = toStr(req.body?.action).trim();

      if (action === 'like') {
        const reviewId = toStr(req.body?.reviewId).trim();
        const safeUserId = toStr(req.body?.userId).trim().slice(0, 96);
        const ip = getClientIp(req);
        const userKey = safeUserId || ip;
        if (!reviewId) return res.status(400).json({ error: 'Missing reviewId' });
        if (!userKey) return res.status(400).json({ error: 'Missing user identity' });

        await client.query('BEGIN');
        try {
          const existing = await client.query(
            'SELECT 1 FROM provider_review_likes WHERE review_id = $1 AND user_key = $2',
            [reviewId, userKey]
          );

          let liked = false;
          if (existing.rows.length > 0) {
            await client.query('DELETE FROM provider_review_likes WHERE review_id = $1 AND user_key = $2', [reviewId, userKey]);
            await client.query(
              'UPDATE provider_reviews SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1',
              [reviewId]
            );
            liked = false;
          } else {
            await client.query(
              'INSERT INTO provider_review_likes (review_id, user_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [reviewId, userKey]
            );
            await client.query(
              'UPDATE provider_reviews SET likes = COALESCE(likes, 0) + 1 WHERE id = $1',
              [reviewId]
            );
            liked = true;
          }

          const updated = await client.query('SELECT likes FROM provider_reviews WHERE id = $1', [reviewId]);
          await client.query('COMMIT');
          return res.status(200).json({ success: true, likes: updated.rows[0]?.likes ?? 0, liked });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }

      if (action === 'dislike') {
        const reviewId = toStr(req.body?.reviewId).trim();
        const safeUserId = toStr(req.body?.userId).trim().slice(0, 96);
        const ip = getClientIp(req);
        const userKey = safeUserId || ip;
        if (!reviewId) return res.status(400).json({ error: 'Missing reviewId' });
        if (!userKey) return res.status(400).json({ error: 'Missing user identity' });

        await client.query('BEGIN');
        try {
          const existing = await client.query(
            'SELECT 1 FROM provider_review_dislikes WHERE review_id = $1 AND user_key = $2',
            [reviewId, userKey]
          );

          let disliked = false;
          if (existing.rows.length > 0) {
            await client.query('DELETE FROM provider_review_dislikes WHERE review_id = $1 AND user_key = $2', [reviewId, userKey]);
            await client.query(
              'UPDATE provider_reviews SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = $1',
              [reviewId]
            );
            disliked = false;
          } else {
            await client.query(
              'INSERT INTO provider_review_dislikes (review_id, user_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [reviewId, userKey]
            );
            await client.query(
              'UPDATE provider_reviews SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = $1',
              [reviewId]
            );
            disliked = true;
          }

          const updated = await client.query('SELECT dislikes FROM provider_reviews WHERE id = $1', [reviewId]);
          await client.query('COMMIT');
          return res.status(200).json({ success: true, dislikes: updated.rows[0]?.dislikes ?? 0, disliked });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }

      const { providerId, name, rating, content, parentId, userId } = req.body;
      if (!providerId || !name || !content) return res.status(400).json({ error: 'Missing required fields' });

      const safeName = String(name || '').trim();
      const safeContent = String(content || '').trim();
      const safeParentId = parentId ? String(parentId) : null;
      const safeUserId = toStr(userId).trim().slice(0, 96);
      const ip = getClientIp(req);

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

      // Lightweight server-side cooldown (registration-free).
      const keyField = safeUserId ? 'user_id' : 'ip';
      const keyValue = safeUserId || ip;
      if (keyValue) {
        const last = await client.query(
          `SELECT created_at FROM provider_reviews WHERE ${keyField} = $1 ORDER BY created_at DESC LIMIT 1`,
          [keyValue]
        );
        const lastAt = last.rows[0]?.created_at ? new Date(last.rows[0].created_at).getTime() : 0;
        if (lastAt && (Date.now() - lastAt) < 15000) {
          return res.status(429).json({ error: 'Please wait a moment before posting again.' });
        }

        const burst = await client.query(
          `SELECT COUNT(*)::int AS c FROM provider_reviews WHERE ${keyField} = $1 AND created_at > (CURRENT_TIMESTAMP - INTERVAL '10 minutes')`,
          [keyValue]
        );
        if ((burst.rows[0]?.c ?? 0) >= 12) {
          return res.status(429).json({ error: 'Too many posts in a short time. Please try again later.' });
        }
      }

      const id = Date.now().toString();
      await client.query(
        `INSERT INTO provider_reviews (id, provider_id, name, rating, content, parent_id, user_id, ip, likes, is_hidden)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, FALSE)`,
        [id, providerId, safeName, safeParentId ? 0 : (Number(rating) || 0), safeContent, safeParentId, safeUserId || null, ip || null]
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
