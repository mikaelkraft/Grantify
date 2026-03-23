// Handler: /api/flags

import pool from '../db.js';

const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

const getClientIp = (req) => {
  const raw = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '';
  const first = Array.isArray(raw) ? raw[0] : String(raw);
  return first.split(',')[0].trim();
};

async function ensureFlagsSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS content_flags (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      reporter_key TEXT NOT NULL,
      reporter_ip TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )
  `);

  await client.query(`
    ALTER TABLE content_flags
      ADD COLUMN IF NOT EXISTS details TEXT,
      ADD COLUMN IF NOT EXISTS reporter_key TEXT,
      ADD COLUMN IF NOT EXISTS reporter_ip TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP
  `);

  await client.query('CREATE INDEX IF NOT EXISTS content_flags_status_created_at_idx ON content_flags (status, created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS content_flags_entity_idx ON content_flags (entity_type, entity_id)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS content_flags_unique_reporter_idx ON content_flags (entity_type, entity_id, reporter_key)');
}

const allowedEntityTypes = new Set(['blog_comment', 'provider_review']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    await ensureFlagsSchema(client);

    if (req.method === 'POST') {
      const { entityType, entityId, reason, details, userId } = (req.body && typeof req.body === 'object') ? req.body : {};

      const safeEntityType = toStr(entityType).trim();
      const safeEntityId = toStr(entityId).trim();
      const safeReason = toStr(reason).trim() || 'spam';
      const safeDetails = toStr(details).trim().slice(0, 500);
      const safeUserId = toStr(userId).trim();
      const ip = getClientIp(req);
      const reporterKey = safeUserId || ip || `unknown_${Date.now()}`;

      if (!allowedEntityTypes.has(safeEntityType)) return res.status(400).json({ error: 'Invalid entityType' });
      if (!safeEntityId) return res.status(400).json({ error: 'Missing entityId' });

      const id = `flag_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      await client.query(
        `INSERT INTO content_flags (id, entity_type, entity_id, reason, details, reporter_key, reporter_ip, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'open')
         ON CONFLICT (entity_type, entity_id, reporter_key) DO NOTHING`,
        [id, safeEntityType, safeEntityId, safeReason, safeDetails || null, reporterKey, ip || null]
      );

      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const status = toStr(req.query?.status).trim() || 'open';
      const safeStatus = (status === 'resolved') ? 'resolved' : 'open';

      const result = await client.query(
        `SELECT id, entity_type, entity_id, reason, details, status, created_at, resolved_at
         FROM content_flags
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT 250`,
        [safeStatus]
      );

      const flags = result.rows.map(r => ({
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at
      }));

      // Attach lightweight entity context for admin UX.
      // NOTE: This intentionally does not expose reporterKey/ip.
      const byType = flags.reduce((acc, f) => {
        (acc[f.entityType] ||= []).push(f.entityId);
        return acc;
      }, /** @type {Record<string, string[]>} */ ({}));

      const entities = {};

      if (byType.blog_comment?.length) {
        const ids = byType.blog_comment;
        const rows = await client.query(
          `SELECT c.id, c.post_id, c.name, c.content, c.created_at, c.parent_id, p.title
           FROM blog_comments c
           LEFT JOIN blog_posts p ON p.id = c.post_id
           WHERE c.id = ANY($1::text[])`,
          [ids]
        );
        for (const r of rows.rows) {
          entities[`blog_comment:${r.id}`] = {
            id: r.id,
            postId: r.post_id,
            postTitle: r.title || null,
            name: r.name,
            content: r.content,
            parentId: r.parent_id,
            createdAt: r.created_at
          };
        }
      }

      if (byType.provider_review?.length) {
        const ids = byType.provider_review;
        const rows = await client.query(
          `SELECT pr.id, pr.provider_id, pr.name, pr.content, pr.created_at, pr.parent_id, lp.name AS provider_name
           FROM provider_reviews pr
           LEFT JOIN loan_providers lp ON lp.id = pr.provider_id
           WHERE pr.id = ANY($1::text[])`,
          [ids]
        );
        for (const r of rows.rows) {
          entities[`provider_review:${r.id}`] = {
            id: r.id,
            providerId: r.provider_id,
            providerName: r.provider_name || null,
            name: r.name,
            content: r.content,
            parentId: r.parent_id,
            createdAt: r.created_at
          };
        }
      }

      return res.status(200).json({ flags, entities });
    }

    if (req.method === 'PUT') {
      const { action } = req.body || {};

      if (action === 'resolve') {
        const id = toStr(req.body?.id).trim();
        if (!id) return res.status(400).json({ error: 'Missing id' });

        await client.query(
          `UPDATE content_flags
           SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );
        return res.status(200).json({ success: true });
      }

      if (action === 'setHidden') {
        const entityType = toStr(req.body?.entityType).trim();
        const entityId = toStr(req.body?.entityId).trim();
        const hidden = Boolean(req.body?.hidden);

        if (!allowedEntityTypes.has(entityType)) return res.status(400).json({ error: 'Invalid entityType' });
        if (!entityId) return res.status(400).json({ error: 'Missing entityId' });

        if (entityType === 'blog_comment') {
          await client.query('UPDATE blog_comments SET is_hidden = $2 WHERE id = $1', [entityId, hidden]);
        } else if (entityType === 'provider_review') {
          await client.query('UPDATE provider_reviews SET is_hidden = $2 WHERE id = $1', [entityId, hidden]);
        }

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Flags handler error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  } finally {
    client.release();
  }
}
