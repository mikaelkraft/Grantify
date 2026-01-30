// API: /api/loan_providers - Manage loan providers
import pool from './_db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      const result = await client.query('SELECT * FROM loan_providers ORDER BY id ASC');
      // Map to camelCase
      const providers = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        loanRange: row.loan_range,
        interestRange: row.interest_range,
        tenure: row.tenure,
        website: row.website,
        playStoreUrl: row.play_store_url,
        tag: row.tag,
        rating: row.rating ? parseFloat(row.rating) : 0,
        requirements: row.requirements,
        isRecommended: row.is_recommended
      }));
      return res.status(200).json(providers);
    } 

    if (req.method === 'POST') {
      const providers = req.body;
      if (!Array.isArray(providers)) {
        return res.status(400).json({ error: 'Body must be an array of providers' });
      }

      await client.query('BEGIN');
      
      await client.query('DELETE FROM loan_providers');
      
      for (const p of providers) {
        await client.query(
          `INSERT INTO loan_providers (name, description, loan_range, interest_range, tenure, website, play_store_url, tag, rating, requirements, is_recommended)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [p.name, p.description, p.loanRange, p.interestRange, p.tenure, p.website, p.playStoreUrl, p.tag, p.rating, p.requirements, p.isRecommended]
        );
      }
      
      await client.query('COMMIT');
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });
      
      await client.query('DELETE FROM loan_providers WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (req.method === 'POST') await client.query('ROLLBACK');
    console.error('Loan Providers API Error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
