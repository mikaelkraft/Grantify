import pool from '../db.js';
import { randomUUID } from 'crypto';

const WORD_LIMIT = 100;
const MAX_NAME_LEN = 80;

const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

async function ensurePitchTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS pitch_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      content TEXT NOT NULL,
      claps INTEGER DEFAULT 0,
      is_winner BOOLEAN DEFAULT FALSE,
      week_label TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Add week_label column if missing (migration for older installs)
  await client.query(`ALTER TABLE pitch_entries ADD COLUMN IF NOT EXISTS week_label TEXT DEFAULT ''`);
  await client.query(`ALTER TABLE pitch_entries ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const client = await pool.connect();
  try {
    await ensurePitchTable(client);

    const segments = (() => {
      const raw = req?.query?.path;
      const pathStr = Array.isArray(raw) ? raw.join('/') : String(raw || '');
      return pathStr.split('/').filter(Boolean);
    })();

    // POST /api/pitch/:id/clap
    if (req.method === 'POST' && segments[1] && segments[2] === 'clap') {
      const id = segments[1];
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

      // Simple in-memory rate limiting via a clap_log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS pitch_clap_log (
          pitch_id TEXT NOT NULL,
          ip TEXT NOT NULL,
          clapped_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (pitch_id, ip)
        )
      `);

      const alreadyClapped = await client.query(
        `SELECT 1 FROM pitch_clap_log WHERE pitch_id = $1 AND ip = $2`,
        [id, ip]
      );
      if (alreadyClapped.rows.length > 0) {
        return res.status(409).json({ error: 'You already clapped for this pitch.' });
      }

      await client.query(`INSERT INTO pitch_clap_log (pitch_id, ip) VALUES ($1, $2)`, [id, ip]);
      const result = await client.query(
        `UPDATE pitch_entries SET claps = COALESCE(claps, 0) + 1 WHERE id = $1 RETURNING claps`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pitch not found.' });
      return res.json({ claps: result.rows[0].claps });
    }

    // GET /api/pitch — list pitches
    if (req.method === 'GET' && segments.length <= 1) {
      const rows = await client.query(
        `SELECT id, name, sector, content, claps, is_winner, week_label, created_at
         FROM pitch_entries
         ORDER BY is_winner DESC, claps DESC, created_at DESC
         LIMIT 50`
      );
      return res.json({ pitches: rows.rows });
    }

    // POST /api/pitch — submit a pitch
    if (req.method === 'POST' && segments.length === 1) {
      const { name, sector, content } = req.body || {};

      if (!name || !sector || !content) {
        return res.status(400).json({ error: 'Name, sector, and pitch content are required.' });
      }
      if (String(name).length > MAX_NAME_LEN) {
        return res.status(400).json({ error: `Name must be ${MAX_NAME_LEN} characters or less.` });
      }
      const wordCount = countWords(content);
      if (wordCount > WORD_LIMIT) {
        return res.status(400).json({ error: `Pitch must be ${WORD_LIMIT} words or less. You have ${wordCount} words.` });
      }
      if (wordCount < 10) {
        return res.status(400).json({ error: 'Pitch must be at least 10 words.' });
      }

      const VALID_SECTORS = ['Agriculture', 'Tech', 'Trade', 'Creative', 'Manufacturing', 'Health', 'Education', 'Finance', 'Other'];
      const cleanSector = VALID_SECTORS.includes(sector) ? sector : 'Other';

      // Generate current week label (e.g. "Week 25, 2026")
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
      const weekLabel = `Week ${weekNum}, ${now.getFullYear()}`;

      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO pitch_entries (id, name, sector, content, week_label)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, String(name).trim().slice(0, MAX_NAME_LEN), cleanSector, String(content).trim(), weekLabel]
      );
      return res.status(201).json({ pitch: result.rows[0] });
    }

    // POST /api/pitch/:id/winner — Admin: mark as winner
    if (req.method === 'POST' && segments[1] && segments[2] === 'winner') {
      const parseAdminSession = (req) => {
        try {
          const raw = req.headers['x-admin-session'];
          if (!raw) return null;
          const json = decodeURIComponent(escape(Buffer.from(String(raw), 'base64').toString('utf8')));
          return JSON.parse(json);
        } catch { return null; }
      };
      if (!parseAdminSession(req)) return res.status(401).json({ error: 'Admin access required.' });

      const id = segments[1];
      // Clear existing winners first (only one winner at a time)
      await client.query(`UPDATE pitch_entries SET is_winner = FALSE WHERE is_winner = TRUE`);
      const result = await client.query(
        `UPDATE pitch_entries SET is_winner = TRUE WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Pitch not found.' });
      return res.json({ pitch: result.rows[0] });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Pitch handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}
