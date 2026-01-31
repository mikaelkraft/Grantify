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
        // Fetch single post
        const postRes = await client.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
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
        likes: row.likes,
        commentsCount: parseInt(row.comments_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    }

    if (req.method === 'POST') {
      const { action, postId, name, content, parentId, title, author, authorRole, category, image } = req.body;

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
      await client.query(
        `INSERT INTO blog_posts (id, title, content, author, author_role, category, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, title, content, author, authorRole, category, image]
      );
      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const { id, title, content, author, authorRole, category, image } = req.body;
      await client.query(
        `UPDATE blog_posts SET title = $1, content = $2, author = $3, author_role = $4, category = $5, image = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [title, content, author, authorRole, category, image, id]
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
