// Handler: /api/loan_provider_submissions

import pool from '../db.js';

const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

const pickProviderFields = (body) => {
  const obj = (body && typeof body === 'object') ? body : {};
  return {
    name: toStr(obj.name).trim(),
    description: toStr(obj.description).trim(),
    loanRange: toStr(obj.loanRange).trim(),
    interestRange: toStr(obj.interestRange).trim(),
    tenure: toStr(obj.tenure).trim(),
    website: toStr(obj.website).trim(),
    playStoreUrl: toStr(obj.playStoreUrl).trim(),
    tag: toStr(obj.tag).trim(),
    rating: obj.rating === null || obj.rating === undefined || obj.rating === '' ? null : Number(obj.rating),
    requirements: toStr(obj.requirements).trim(),
    logo: toStr(obj.logo).trim(),
  };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_provider_submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        loan_range TEXT,
        interest_range TEXT,
        tenure TEXT,
        website TEXT NOT NULL,
        logo_url TEXT,
        play_store_url TEXT,
        tag TEXT,
        rating DECIMAL(2,1),
        requirements TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (req.method === 'GET') {
      const status = toStr(req.query?.status).trim();
      const where = status ? 'WHERE status = $1' : '';
      const params = status ? [status] : [];
      const result = await client.query(
        `SELECT id, name, description, loan_range, interest_range, tenure, website, play_store_url, tag, rating, requirements, logo_url, status, created_at
         FROM loan_provider_submissions
         ${where}
         ORDER BY created_at DESC`,
        params
      );

      return res.status(200).json(result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        loanRange: r.loan_range || '',
        interestRange: r.interest_range || '',
        tenure: r.tenure || '',
        website: r.website || '',
        playStoreUrl: r.play_store_url || '',
        tag: r.tag || '',
        rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
        requirements: r.requirements || '',
        logo: r.logo_url || '',
        status: r.status,
        createdAt: r.created_at
      })));
    }

    if (req.method === 'POST') {
      const p = pickProviderFields(req.body);

      if (!p.name) return res.status(400).json({ error: 'name is required' });
      if (!p.description) return res.status(400).json({ error: 'description is required' });
      if (!p.website) return res.status(400).json({ error: 'website is required' });

      const id = `lps_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      await client.query(
        `INSERT INTO loan_provider_submissions (
          id, name, description, loan_range, interest_range, tenure, website, play_store_url, tag, rating, requirements, logo_url, status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending'
        )`,
        [
          id,
          p.name,
          p.description,
          p.loanRange,
          p.interestRange,
          p.tenure,
          p.website,
          p.playStoreUrl,
          p.tag,
          (typeof p.rating === 'number' && Number.isFinite(p.rating)) ? p.rating : null,
          p.requirements,
          p.logo
        ]
      );

      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const id = toStr(req.query?.id).trim();
      const status = toStr(req.body?.status).trim();

      if (!id) return res.status(400).json({ error: 'id is required' });
      if (!status) return res.status(400).json({ error: 'status is required' });
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'invalid status' });
      }

      await client.query('UPDATE loan_provider_submissions SET status = $1 WHERE id = $2', [status, id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Loan provider submissions handler error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  } finally {
    client.release();
  }
}
