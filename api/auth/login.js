// API: POST /api/auth/login - Admin login

import pool from '../_db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const { username, password } = req.body;
      
      const result = await pool.query(
        'SELECT * FROM admin_users WHERE username = $1 AND password_hash = $2',
        [username, password]
      );
      
      if (result.rows.length > 0) {
        const u = result.rows[0];
        return res.status(200).json({
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          passwordHash: u.password_hash
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Auth Login API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
