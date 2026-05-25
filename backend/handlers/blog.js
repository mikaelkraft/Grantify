// Handler: /api/blog

import pool from '../db.js';

const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

const getClientIp = (req) => {
  const raw = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '';
  const first = Array.isArray(raw) ? raw[0] : String(raw);
  return first.split(',')[0].trim();
};

async function ensureBlogCommentSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS blog_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT REFERENCES blog_posts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      user_id TEXT,
      ip TEXT,
      is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    ALTER TABLE blog_comments
      ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS parent_id TEXT,
      ADD COLUMN IF NOT EXISTS user_id TEXT,
      ADD COLUMN IF NOT EXISTS ip TEXT,
      ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS blog_comment_likes (
      comment_id TEXT NOT NULL,
      user_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (comment_id, user_key)
    )
  `);

  await client.query('CREATE INDEX IF NOT EXISTS blog_comment_likes_comment_id_idx ON blog_comment_likes (comment_id)');
}

const sanitizePlainText = (value) => {
  const s = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
};

const containsLinkLikeText = (value) => {
  const s = String(value ?? '').toLowerCase();
  return /https?:\/\//.test(s) || /\bwww\./.test(s);
};

const extractFirstImageSrcFromHtml = (html) => {
  const s = String(html ?? '');
  if (!s) return '';
  const match = s.match(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const src = (match && (match[1] || match[2] || match[3])) ? String(match[1] || match[2] || match[3]) : '';
  return src.trim();
};

const stripDataImagesFromHtml = (html) => {
  const s = String(html ?? '');
  if (!s) return '';
  // Remove <img> tags whose src is a data: URL (base64 embeds).
  return s.replace(/<img\b[^>]*\bsrc\s*=\s*(?:"\s*data:[^"]*"|'\s*data:[^']*'|\s*data:[^\s>]+)[^>]*>/gi, '');
};

const isBadImageUrl = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return true;
  if (s.startsWith('data:')) return true;
  // Avoid pathological URLs that can bloat payloads or break rendering.
  if (s.length > 2048) return true;
  return false;
};

const deriveFeaturedImage = (explicitImage, content) => {
  const direct = String(explicitImage ?? '').trim();
  if (direct && !isBadImageUrl(direct)) return direct;
  const extracted = extractFirstImageSrcFromHtml(content) || '';
  return extracted && !isBadImageUrl(extracted) ? extracted : '';
};

// Reduce write amplification for view counters under traffic.
// (In-memory; best-effort in serverless, but still helps.)
const VIEW_TTL_MS = 10 * 60 * 1000;
const viewBucket = new Map();
const shouldCountView = (req, postId) => {
  const ip = getClientIp(req) || 'unknown';
  const key = `${ip}:${String(postId)}`;
  const now = Date.now();
  const last = viewBucket.get(key);
  if (last && (now - last) < VIEW_TTL_MS) return false;
  viewBucket.set(key, now);
  // Opportunistic cleanup.
  if (viewBucket.size > 20000) {
    for (const [k, t] of viewBucket.entries()) {
      if (!t || (now - t) > (VIEW_TTL_MS * 2)) viewBucket.delete(k);
    }
  }
  return true;
};

const BLOG_CACHE_TTL_MS = 30 * 1000;
const blogCache = new Map();

const getCacheEntry = (key) => {
  const entry = blogCache.get(key);
  if (!entry) return null;
  if ((Date.now() - entry.at) > BLOG_CACHE_TTL_MS) {
    blogCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCacheEntry = (key, value) => {
  blogCache.set(key, { at: Date.now(), value });
};

const clearBlogCache = () => {
  blogCache.clear();
};

const buildCacheKey = (req) => {
  const id = toStr(req?.query?.id).trim();
  const category = toStr(req?.query?.category).trim();
  const summary = toStr(req?.query?.summary).trim();
  const excludeId = toStr(req?.query?.excludeId).trim();
  const limit = toStr(req?.query?.limit).trim();
  const commentsSort = toStr(req?.query?.commentsSort).trim();
  const includeHidden = toStr(req?.query?.includeHidden).trim();
  if (id) return `id:${id}:sort:${commentsSort}:hidden:${includeHidden}`;
  if (summary === '1') return `summary:${category || 'all'}:exclude:${excludeId || ''}:limit:${limit || ''}`;
  return `list:${category || 'all'}`;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    await ensureBlogCommentSchema(client);

    if (req.method === 'GET') {
      const cacheKey = buildCacheKey(req);
      const cached = getCacheEntry(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }
        // Determine whether requester is an admin (X-Admin-Session header present).
        const isAdminRequest = Boolean(String(req.headers['x-admin-session'] || '').trim());

      const { id, category } = req.query;

      if (id) {
        const countView = shouldCountView(req, id);
        const postRes = countView
          ? await client.query(
            'UPDATE blog_posts SET views = COALESCE(views, 0) + 1 WHERE id = $1 RETURNING *',
            [id]
          )
          : await client.query(
            'SELECT * FROM blog_posts WHERE id = $1',
            [id]
          );
        if (postRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const post = postRes.rows[0];
        const commentsSort = toStr(req.query?.commentsSort).trim().toLowerCase();
        const includeHidden = toStr(req.query?.includeHidden).trim() === '1';

        const sortSql = (() => {
          if (commentsSort === 'helpful') return 'ORDER BY likes DESC, created_at DESC';
          if (commentsSort === 'newest') return 'ORDER BY created_at DESC';
          return 'ORDER BY created_at ASC';
        })();

        const whereSql = includeHidden
          ? 'WHERE post_id = $1'
          : 'WHERE post_id = $1 AND (is_hidden IS NOT TRUE)';

        const comments = await client.query(
          `SELECT id, post_id, name, content, likes, parent_id, user_id, created_at
           FROM blog_comments
           ${whereSql}
           ${sortSql}`,
          [id]
        );

        const payload = {
          ...post,
          id: post.id,
          title: post.title,
          content: post.content,
          author: post.author,
          authorRole: post.author_role,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
          tags: post.tags,
          sourceName: post.source_name,
          sourceUrl: post.source_url,
          likes: post.likes ?? 0,
          loves: post.loves ?? 0,
          claps: post.claps ?? 0,
          views: post.views ?? 0,
          comments: comments.rows.map(c => ({
            id: c.id,
            postId: c.post_id,
            name: c.name,
            content: c.content,
            likes: c.likes ?? 0,
            parentId: c.parent_id,
            userId: c.user_id || undefined,
            createdAt: c.created_at
          }))
        };
        setCacheEntry(cacheKey, payload);
        return res.status(200).json(payload);
      }

      const isSummary = toStr(req.query?.summary).trim() === '1';
      const excludeId = toStr(req.query?.excludeId).trim();
      const limitRaw = Number.parseInt(toStr(req.query?.limit).trim() || '0', 10);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 0;

      if (isSummary) {
        const params = [];
        let where = '';
        if (category) {
          params.push(category);
          where += `${where ? ' AND' : ' WHERE'} category = $${params.length}`;
        }
        // Exclude autodraft posts from public summaries unless admin request
        if (!isAdminRequest) {
          params.push('autodraft');
          where += `${where ? ' AND' : ' WHERE'} NOT (tags @> ARRAY[$${params.length}]::text[])`;
        }
        if (excludeId) {
          params.push(excludeId);
          where += `${where ? ' AND' : ' WHERE'} id <> $${params.length}`;
        }

        const limSql = limit ? ` LIMIT ${limit}` : '';
        const result = await client.query(
          `SELECT id, title, author, author_role, category, image, tags, source_name, source_url,
                  COALESCE(likes, 0) as likes, COALESCE(loves, 0) as loves, COALESCE(claps, 0) as claps, COALESCE(views, 0) as views,
                  created_at, updated_at,
                  (SELECT COUNT(*) FROM blog_comments WHERE post_id = blog_posts.id) as comments_count
           FROM blog_posts
           ${where}
           ORDER BY created_at DESC${limSql}`,
          params
        );

        const payload = result.rows.map(row => ({
          id: row.id,
          title: row.title,
          content: '',
          author: row.author,
          authorRole: row.author_role,
          image: row.image,
          category: row.category,
          tags: row.tags,
          sourceName: row.source_name,
          sourceUrl: row.source_url,
          likes: row.likes ?? 0,
          loves: row.loves ?? 0,
          claps: row.claps ?? 0,
          views: row.views ?? 0,
          commentsCount: parseInt(row.comments_count),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
        setCacheEntry(cacheKey, payload);
        return res.status(200).json(payload);
      }

      let query = 'SELECT *, (SELECT COUNT(*) FROM blog_comments WHERE post_id = blog_posts.id) as comments_count FROM blog_posts';
      const params = [];
      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }
      // Exclude autodraft posts from public lists unless admin request
      if (!category) {
        // no category filter yet
      }
      if (!isAdminRequest) {
        // add exclusion into WHERE clause gracefully
        if (params.length === 0) {
          query += ' WHERE NOT (tags @> ARRAY[$1]::text[])';
          params.push('autodraft');
        } else {
          query = query.replace(/ORDER BY/, ` AND NOT (tags @> ARRAY[$${params.length + 1}]::text[]) ORDER BY`);
          params.push('autodraft');
        }
      }
      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      const payload = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        author: row.author,
        authorRole: row.author_role,
        image: row.image,
        category: row.category,
        tags: row.tags,
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        likes: row.likes ?? 0,
        loves: row.loves ?? 0,
        claps: row.claps ?? 0,
        views: row.views ?? 0,
        commentsCount: parseInt(row.comments_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      setCacheEntry(cacheKey, payload);
      return res.status(200).json(payload);
    }

    if (req.method === 'POST') {
      const { action, postId, name, content, parentId, title, author, authorRole, category, image, tags, sourceName, sourceUrl, views, createdAt, likes, loves, claps } = req.body;

      if (action === 'comment') {
        if (!postId) return res.status(400).json({ error: 'Missing postId' });

        const safeUserId = sanitizePlainText(req.body?.userId).slice(0, 96);
        const ip = getClientIp(req);

        // Lightweight server-side cooldown (registration-free).
        const keyField = safeUserId ? 'user_id' : 'ip';
        const keyValue = safeUserId || ip;
        if (keyValue) {
          const last = await client.query(
            `SELECT created_at FROM blog_comments WHERE ${keyField} = $1 ORDER BY created_at DESC LIMIT 1`,
            [keyValue]
          );
          const lastAt = last.rows[0]?.created_at ? new Date(last.rows[0].created_at).getTime() : 0;
          if (lastAt && (Date.now() - lastAt) < 15000) {
            return res.status(429).json({ error: 'Please wait a moment before commenting again.' });
          }

          const burst = await client.query(
            `SELECT COUNT(*)::int AS c FROM blog_comments WHERE ${keyField} = $1 AND created_at > (CURRENT_TIMESTAMP - INTERVAL '10 minutes')`,
            [keyValue]
          );
          if ((burst.rows[0]?.c ?? 0) >= 12) {
            return res.status(429).json({ error: 'Too many comments in a short time. Please try again later.' });
          }
        }

        const safeName = sanitizePlainText(name).slice(0, 48);
        const safeContent = sanitizePlainText(content).slice(0, 1200);

        if (safeName.length < 2) return res.status(400).json({ error: 'Name is too short' });
        if (safeContent.length < 3) return res.status(400).json({ error: 'Comment is too short' });
        if (containsLinkLikeText(safeContent)) return res.status(400).json({ error: 'Links are not allowed in comments' });

        let validatedParentId = null;
        if (parentId) {
          const parentRes = await client.query('SELECT id, post_id, parent_id FROM blog_comments WHERE id = $1', [parentId]);
          const parent = parentRes.rows[0];
          if (!parent) return res.status(400).json({ error: 'Parent comment not found' });
          if (String(parent.post_id) !== String(postId)) return res.status(400).json({ error: 'Parent comment mismatch' });
          if (parent.parent_id) return res.status(400).json({ error: 'Nested replies are not supported' });
          validatedParentId = String(parent.id);
        }

        const id = Date.now().toString();
        await client.query(
          'INSERT INTO blog_comments (id, post_id, name, content, parent_id, user_id, ip, likes, is_hidden) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, FALSE)',
          [id, postId, safeName, safeContent, validatedParentId, safeUserId || null, ip || null]
        );
        return res.status(200).json({ success: true, id });
      }

      if (action === 'like') {
        await client.query('UPDATE blog_posts SET likes = likes + 1 WHERE id = $1', [postId]);
        return res.status(200).json({ success: true });
      }

      if (action === 'react') {
        const { userId, reactionType } = req.body;
        const allowed = new Set(['likes', 'loves', 'claps']);
        if (!postId || !userId || !reactionType || !allowed.has(reactionType)) {
          return res.status(400).json({ error: 'Invalid reaction request' });
        }

        const col = reactionType;
        await client.query('BEGIN');
        try {
          const existing = await client.query(
            'SELECT reaction_type FROM blog_post_reactions WHERE post_id = $1 AND user_id = $2',
            [postId, userId]
          );
          const prev = existing.rows[0]?.reaction_type || null;

          let myReaction = reactionType;
          let updated;

          if (prev === reactionType) {
            await client.query('DELETE FROM blog_post_reactions WHERE post_id = $1 AND user_id = $2', [postId, userId]);
            updated = await client.query(
              `UPDATE blog_posts
               SET ${col} = GREATEST(COALESCE(${col}, 0) - 1, 0)
               WHERE id = $1
               RETURNING likes, loves, claps`,
              [postId]
            );
            myReaction = null;
          } else if (prev) {
            await client.query(
              'UPDATE blog_post_reactions SET reaction_type = $3, updated_at = CURRENT_TIMESTAMP WHERE post_id = $1 AND user_id = $2',
              [postId, userId, reactionType]
            );
            if (!allowed.has(prev)) throw new Error('Invalid previous reaction type');
            updated = await client.query(
              `UPDATE blog_posts
               SET ${prev} = GREATEST(COALESCE(${prev}, 0) - 1, 0),
                   ${col} = COALESCE(${col}, 0) + 1
               WHERE id = $1
               RETURNING likes, loves, claps`,
              [postId]
            );
          } else {
            await client.query(
              `INSERT INTO blog_post_reactions (post_id, user_id, reaction_type)
               VALUES ($1, $2, $3)
               ON CONFLICT (post_id, user_id) DO UPDATE
               SET reaction_type = EXCLUDED.reaction_type, updated_at = CURRENT_TIMESTAMP`,
              [postId, userId, reactionType]
            );
            updated = await client.query(
              `UPDATE blog_posts
               SET ${col} = COALESCE(${col}, 0) + 1
               WHERE id = $1
               RETURNING likes, loves, claps`,
              [postId]
            );
          }

          await client.query('COMMIT');
          return res.status(200).json({
            success: true,
            likes: updated.rows[0]?.likes ?? 0,
            loves: updated.rows[0]?.loves ?? 0,
            claps: updated.rows[0]?.claps ?? 0,
            myReaction
          });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }

      if (action === 'likeComment') {
        const commentId = toStr(req.body?.commentId).trim();
        const safeUserId = sanitizePlainText(req.body?.userId).slice(0, 96);
        const ip = getClientIp(req);
        const userKey = safeUserId || ip;
        if (!commentId) return res.status(400).json({ error: 'Missing commentId' });
        if (!userKey) return res.status(400).json({ error: 'Missing user identity' });

        await client.query('BEGIN');
        try {
          const existing = await client.query(
            'SELECT 1 FROM blog_comment_likes WHERE comment_id = $1 AND user_key = $2',
            [commentId, userKey]
          );

          let liked = false;
          if (existing.rows.length > 0) {
            await client.query('DELETE FROM blog_comment_likes WHERE comment_id = $1 AND user_key = $2', [commentId, userKey]);
            await client.query(
              'UPDATE blog_comments SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1',
              [commentId]
            );
            liked = false;
          } else {
            await client.query(
              'INSERT INTO blog_comment_likes (comment_id, user_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [commentId, userKey]
            );
            await client.query(
              'UPDATE blog_comments SET likes = COALESCE(likes, 0) + 1 WHERE id = $1',
              [commentId]
            );
            liked = true;
          }

          const updated = await client.query('SELECT likes FROM blog_comments WHERE id = $1', [commentId]);
          await client.query('COMMIT');
          return res.status(200).json({ success: true, likes: updated.rows[0]?.likes ?? 0, liked });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }

      const id = Date.now().toString();
      const seededLikes = typeof likes === 'number' ? likes : Math.floor(12 + Math.random() * 64);
      const seededLoves = typeof loves === 'number' ? loves : Math.floor(6 + Math.random() * 28);
      const seededClaps = typeof claps === 'number' ? claps : Math.floor(3 + Math.random() * 18);
      const seededViews = typeof views === 'number' ? views : Math.floor(120 + Math.random() * 900);

      const cleanedContent = stripDataImagesFromHtml(content);
      const featuredImage = deriveFeaturedImage(image, cleanedContent);

      await client.query(
        `INSERT INTO blog_posts (id, title, content, author, author_role, category, image, tags, source_name, source_url, likes, loves, claps, views, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, CURRENT_TIMESTAMP))`,
        [id, title, cleanedContent, author, authorRole, category, featuredImage, tags || [], sourceName, sourceUrl, seededLikes, seededLoves, seededClaps, seededViews, createdAt || null]
      );

      clearBlogCache();

      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const { id, title, content, author, authorRole, category, image, tags, sourceName, sourceUrl, views, createdAt, likes, loves, claps } = req.body;

      const cleanedContent = stripDataImagesFromHtml(content);
      const featuredImage = deriveFeaturedImage(image, cleanedContent);
      await client.query(
        `UPDATE blog_posts
         SET title = $1,
             content = $2,
             author = $3,
             author_role = $4,
             category = $5,
             image = $6,
             tags = $7,
             source_name = $8,
             source_url = $9,
             views = COALESCE($10, views),
             created_at = COALESCE($11, created_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $12`,
        [title, cleanedContent, author, authorRole, category, featuredImage, tags || [], sourceName, sourceUrl, typeof views === 'number' ? views : null, createdAt || null, id]
      );

      clearBlogCache();

      if (typeof likes === 'number' || typeof loves === 'number' || typeof claps === 'number') {
        await client.query(
          `UPDATE blog_posts
           SET likes = COALESCE($1, likes),
               loves = COALESCE($2, loves),
               claps = COALESCE($3, claps)
           WHERE id = $4`,
          [typeof likes === 'number' ? likes : null, typeof loves === 'number' ? loves : null, typeof claps === 'number' ? claps : null, id]
        );
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.query('DELETE FROM blog_posts WHERE id = $1', [id]);
      clearBlogCache();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Blog handler error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
