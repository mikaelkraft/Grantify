// API: /api/blog - Manage community blog
import pool from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      const { id, category } = req.query;
      
      if (id) {
        // Fetch single post + increment views
        const postRes = await client.query(
          'UPDATE blog_posts SET views = COALESCE(views, 0) + 1 WHERE id = $1 RETURNING *',
          [id]
        );
        if (postRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        
        const post = postRes.rows[0];
        const comments = await client.query('SELECT * FROM blog_comments WHERE post_id = $1 ORDER BY created_at ASC', [id]);
        
        return res.status(200).json({
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
          views: post.views ?? 0,
          comments: comments.rows.map(c => ({
            id: c.id,
            postId: c.post_id,
            name: c.name,
            content: c.content,
            likes: c.likes,
            parentId: c.parent_id,
            createdAt: c.created_at
          }))
        });
      }

      // Fetch all posts
      let query = 'SELECT *, (SELECT COUNT(*) FROM blog_comments WHERE post_id = blog_posts.id) as comments_count FROM blog_posts';
      const params = [];
      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }
      query += ' ORDER BY created_at DESC';
      
      const result = await client.query(query, params);
      return res.status(200).json(result.rows.map(row => ({
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
        likes: row.likes,
        views: row.views ?? 0,
        commentsCount: parseInt(row.comments_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    }

    if (req.method === 'POST') {
      const { action, postId, name, content, parentId, title, author, authorRole, category, image, tags, sourceName, sourceUrl, views, createdAt } = req.body;

      if (action === 'comment') {
        const id = Date.now().toString();
        await client.query(
          'INSERT INTO blog_comments (id, post_id, name, content, parent_id) VALUES ($1, $2, $3, $4, $5)',
          [id, postId, name, content, parentId || null]
        );
        return res.status(200).json({ success: true, id });
      }

      if (action === 'like') {
        await client.query('UPDATE blog_posts SET likes = likes + 1 WHERE id = $1', [postId]);
        return res.status(200).json({ success: true });
      }

      if (action === 'likeComment') {
        const { commentId } = req.body;
        await client.query('UPDATE blog_comments SET likes = likes + 1 WHERE id = $1', [commentId]);
        return res.status(200).json({ success: true });
      }

      // Create new post (Admin)
      const id = Date.now().toString();
      const seededLikes = Math.floor(12 + Math.random() * 64); // 12..75
      const seededViews = typeof views === 'number' ? views : Math.floor(120 + Math.random() * 900); // 120..1019
      await client.query(
        `INSERT INTO blog_posts (id, title, content, author, author_role, category, image, tags, source_name, source_url, likes, views, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, CURRENT_TIMESTAMP))`,
        [id, title, content, author, authorRole, category, image, tags || [], sourceName, sourceUrl, seededLikes, seededViews, createdAt || null]
      );
      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const { id, title, content, author, authorRole, category, image, tags, sourceName, sourceUrl, views, createdAt } = req.body;
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
        [title, content, author, authorRole, category, image, tags || [], sourceName, sourceUrl, typeof views === 'number' ? views : null, createdAt || null, id]
      );
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.query('DELETE FROM blog_posts WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Blog API Error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
