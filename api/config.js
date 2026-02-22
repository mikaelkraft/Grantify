// API: /api/config - Unified Configuration Handler
// Handles: Ads and Repayment Content

import pool, { toCamelCase } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query;

  try {
    // --- ADS CONFIGURATION ---
    if (type === 'ads') {
      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM ads WHERE id=1');
        return res.status(200).json(result.rows.length > 0 ? toCamelCase(result.rows[0]) : {});
      }
      
      if (req.method === 'POST') {
        const { head, header, body, sidebar, footer, promo1Link, promo1Text, promo2Link, promo2Text } = req.body;
        
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

    // --- REPAYMENT CONTENT ---
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
    console.error('Config API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
