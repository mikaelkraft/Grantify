// API: GET /api/admins - List admin users
// API: POST /api/admins - Bulk save admin users (replace all)

import pool from './_db.js';

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
      const result = await pool.query('SELECT id, username, role, name, password_hash FROM admin_users');
      return res.status(200).json(result.rows.map(r => ({
        id: r.id,
        username: r.username,
        role: r.role,
        name: r.name,
        passwordHash: r.password_hash // Match frontend types
      })));
    }
    
    if (req.method === 'POST') {
      const { action } = req.query;

      // Handle Login
      if (action === 'login') {
        const { username, password } = req.body;
        console.log(`Login attempt for username: ${username}`);
        
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password required' });
        }

        const bcrypt = await import('bcryptjs').then(m => m.default);
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        
        if (result.rows.length > 0) {
          const u = result.rows[0];
          
          // Check for bcrypt hash format ($2a$, $2b$, or $2y$)
          const isHashed = u.password_hash?.startsWith('$2');
          let isMatch = false;

          if (isHashed) {
            isMatch = await bcrypt.compare(password, u.password_hash);
          } else {
            // Fallback for plaintext (transition period)
            isMatch = (password === u.password_hash);
            console.warn(`Plaintext password match for ${username}. Please secure this account.`);
          }

          if (isMatch) {
             console.log(`Successful login for ${username}`);
             return res.status(200).json({
              id: u.id,
              username: u.username,
              name: u.name,
              role: u.role,
              passwordHash: u.password_hash
            });
          } else {
            console.warn(`Password mismatch for ${username}`);
          }
        } else {
          console.warn(`User not found: ${username}`);
        }
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Handle Bulk Save
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected array' });
      }
      
      const bcrypt = await import('bcryptjs').then(m => m.default);
      const saltRounds = 10;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM admin_users');
        
        for (const a of items) {
          // Only hash if it's not already a bcrypt hash (starts with $2a$ or $2b$)
          const passwordHash = a.passwordHash.startsWith('$2a$') || a.passwordHash.startsWith('$2b$')
            ? a.passwordHash
            : await bcrypt.hash(a.passwordHash, saltRounds);

          await client.query(
            `INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)`,
            [a.id, a.username, passwordHash, a.role, a.name]
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
    console.error('Admins API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
