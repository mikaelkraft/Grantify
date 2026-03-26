// Handler: /api/config

import pool, { toCamelCase } from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Config values (including ad HTML) are expected to change from the Admin UI.
  // Avoid intermediary caching that can cause stale ad wiring after updates.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query;

  try {
    if (type === 'autoblog') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS autoblog_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT single_row_autoblog_config CHECK (id = 1)
        )
      `);
      await pool.query('INSERT INTO autoblog_config (id, enabled) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING');

      if (req.method === 'GET') {
        const result = await pool.query('SELECT enabled, updated_at FROM autoblog_config WHERE id=1');
        const row = result.rows?.[0];
        return res.status(200).json({ enabled: Boolean(row?.enabled), updatedAt: row?.updated_at || null });
      }

      if (req.method === 'POST') {
        const enabled = Boolean(req.body?.enabled);
        await pool.query(
          `UPDATE autoblog_config
           SET enabled = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = 1`,
          [enabled]
        );
        return res.status(200).json({ success: true, enabled });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (type === 'ads') {
      // Ensure base table exists for fresh databases/environments.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ads (
          id INTEGER PRIMARY KEY,
          head TEXT,
          header TEXT,
          body TEXT,
          sidebar TEXT,
          footer TEXT,
          promo1_link TEXT,
          promo1_text TEXT,
          promo2_link TEXT,
          promo2_text TEXT
        )
      `);
      await pool.query('INSERT INTO ads (id) VALUES (1) ON CONFLICT (id) DO NOTHING');

      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM ads WHERE id=1');
        return res.status(200).json(result.rows.length > 0 ? toCamelCase(result.rows[0]) : {});
      }

      if (req.method === 'POST') {
        const { head, header, body, sidebar, footer, promo1Link, promo1Text, promo2Link, promo2Text } = req.body;

        // Backward-compatible: older DBs may not have promo columns.
        await pool.query(`
          ALTER TABLE ads 
          ADD COLUMN IF NOT EXISTS promo1_link TEXT,
          ADD COLUMN IF NOT EXISTS promo1_text TEXT,
          ADD COLUMN IF NOT EXISTS promo2_link TEXT,
          ADD COLUMN IF NOT EXISTS promo2_text TEXT
        `);

        await pool.query(
          `INSERT INTO ads (id, head, header, body, sidebar, footer, promo1_link, promo1_text, promo2_link, promo2_text)
           VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
           head = EXCLUDED.head, header = EXCLUDED.header, body = EXCLUDED.body, 
           sidebar = EXCLUDED.sidebar, footer = EXCLUDED.footer,
           promo1_link = EXCLUDED.promo1_link, promo1_text = EXCLUDED.promo1_text,
           promo2_link = EXCLUDED.promo2_link, promo2_text = EXCLUDED.promo2_text`,
          [head, header, body, sidebar, footer, promo1Link, promo1Text, promo2Link, promo2Text]
        );

        return res.status(200).json({ success: true });
      }
    }

    if (type === 'repayment') {
      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM repayment_content WHERE id=1');
        if (result.rows.length > 0) {
          return res.status(200).json({
            introText: result.rows[0].intro_text,
            standardNote: result.rows[0].standard_note,
            fastTrackNote: result.rows[0].fast_track_note
          });
        }
        return res.status(200).json({});
      }

      if (req.method === 'POST') {
        const { introText, standardNote, fastTrackNote } = req.body;
        await pool.query(
          `INSERT INTO repayment_content (id, intro_text, standard_note, fast_track_note)
           VALUES (1, $1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET
           intro_text = EXCLUDED.intro_text, standard_note = EXCLUDED.standard_note, fast_track_note = EXCLUDED.fast_track_note`,
          [introText, standardNote, fastTrackNote]
        );
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed or invalid type' });
  } catch (err) {
    console.error('Config handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
