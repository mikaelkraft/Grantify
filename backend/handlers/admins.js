// Handler: /api/admins

import pool from '../db.js';

const parseAdminSession = (req) => {
  try {
    const raw = req.headers['x-admin-session'];
    if (!raw) return null;
    const json = decodeURIComponent(escape(Buffer.from(String(raw), 'base64').toString('utf8')));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
const requireValidAdmin = async (req) => {
  const session = parseAdminSession(req);
  if (!session?.id || !session?.passwordHash) return null;
  try {
    const res = await pool.query('SELECT id, username, role, name, password_hash FROM admin_users WHERE id = $1', [session.id]);
    const row = res.rows?.[0];
    if (!row) return null;
    if (String(row.password_hash) !== String(session.passwordHash)) return null;
    return row;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const admin = await requireValidAdmin(req);
      if (!admin) return res.status(401).json({ error: 'Unauthorized: Admin session required' });

      // NEVER return password_hash over the network
      const result = await pool.query('SELECT id, username, role, name FROM admin_users ORDER BY id ASC');
      return res.status(200).json(result.rows.map(r => ({
        id: r.id,
        username: r.username,
        role: r.role,
        name: r.name
      })));
    }

    if (req.method === 'POST') {
      const { action } = req.query;

      if (action === 'login') {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const bcrypt = await import('bcryptjs').then(m => m.default);
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const u = result.rows[0];
        const isHashed = u.password_hash?.startsWith('$2');
        let isMatch = false;

        if (isHashed) {
          isMatch = await bcrypt.compare(password, u.password_hash);
        } else {
          isMatch = password === u.password_hash;
          if (isMatch) {
            const saltRounds = 10;
            const upgradedHash = await bcrypt.hash(password, saltRounds);
            await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [upgradedHash, u.id]);
            u.password_hash = upgradedHash;
          }
        }

        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        return res.status(200).json({
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          passwordHash: u.password_hash
        });
      }

      if (action === 'updateProfile') {
        const session = parseAdminSession(req);
        if (!session?.id || !session?.passwordHash) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, username, currentPassword, newPassword } = req.body || {};

        const bcrypt = await import('bcryptjs').then(m => m.default);
        const existingRes = await pool.query(
          'SELECT id, username, role, name, password_hash FROM admin_users WHERE id = $1',
          [session.id]
        );
        if (existingRes.rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });

        const existing = existingRes.rows[0];
        if (String(existing.password_hash) !== String(session.passwordHash)) {
          return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        const nextName = typeof name === 'string' ? name.trim() : existing.name;
        const nextUsername = typeof username === 'string' ? username.trim() : existing.username;
        if (!nextUsername) return res.status(400).json({ error: 'Username is required' });

        if (nextUsername !== existing.username) {
          const check = await pool.query('SELECT id FROM admin_users WHERE username = $1 AND id <> $2', [nextUsername, existing.id]);
          if (check.rows.length > 0) return res.status(409).json({ error: 'That username is already in use' });
        }

        const wantsPasswordChange = Boolean(newPassword);
        let nextPasswordHash = String(existing.password_hash);

        if (wantsPasswordChange) {
          const cur = String(currentPassword || '');
          const nextPw = String(newPassword || '');
          if (!cur) return res.status(400).json({ error: 'Current password is required to change your password' });
          if (nextPw.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

          const isHashed = nextPasswordHash.startsWith('$2');
          let isMatch = false;
          if (isHashed) {
            isMatch = await bcrypt.compare(cur, nextPasswordHash);
          } else {
            isMatch = cur === nextPasswordHash;
            if (isMatch) {
              const upgradedHash = await bcrypt.hash(cur, 10);
              await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [upgradedHash, existing.id]);
              nextPasswordHash = upgradedHash;
            }
          }

          if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

          nextPasswordHash = await bcrypt.hash(nextPw, 10);
        }

        const updatedRes = await pool.query(
          'UPDATE admin_users SET name = $1, username = $2, password_hash = $3 WHERE id = $4 RETURNING id, username, role, name, password_hash',
          [nextName, nextUsername, nextPasswordHash, existing.id]
        );
        const u = updatedRes.rows[0];

        return res.status(200).json({
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          passwordHash: u.password_hash,
        });
      }

      const admin = await requireValidAdmin(req);
      if (!admin) return res.status(401).json({ error: 'Unauthorized: Admin session required' });
      const isSuper = String(admin.role).toLowerCase() === 'owner' || String(admin.role).toUpperCase() === 'SUPER_ADMIN';
      if (!isSuper) return res.status(403).json({ error: 'Forbidden: Super Admin access required to manage admin accounts' });

      const items = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array' });

      const bcrypt = await import('bcryptjs').then(m => m.default);
      const saltRounds = 10;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const existingRes = await client.query('SELECT id, password_hash FROM admin_users');
        const existingMap = new Map(existingRes.rows.map(r => [String(r.id), r.password_hash]));

        await client.query('DELETE FROM admin_users');

        for (const a of items) {
          let passwordHash = '';
          if (a.passwordHash && typeof a.passwordHash === 'string' && a.passwordHash.trim()) {
            passwordHash = a.passwordHash.startsWith('$2')
              ? a.passwordHash
              : await bcrypt.hash(a.passwordHash, saltRounds);
          } else if (existingMap.has(String(a.id))) {
            passwordHash = existingMap.get(String(a.id));
          } else {
            // Fallback for new admin without password provided
            const tempPass = Math.random().toString(36).slice(2) + '!Admin123';
            passwordHash = await bcrypt.hash(tempPass, saltRounds);
          }

          await client.query(
            'INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)',
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
    console.error('Admins handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
