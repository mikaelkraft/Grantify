// API: GET /api/content/repayment - Get repayment page content
// API: POST /api/content/repayment - Update repayment page content

import pool from '../_db.js';

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
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Repayment Content API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
