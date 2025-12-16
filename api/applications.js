// API: GET /api/applications - List all applications
// API: POST /api/applications - Submit new application

import pool, { toCamelCase } from './_db.js';

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
      const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
      return res.status(200).json(result.rows.map(toCamelCase));
    }
    
    if (req.method === 'POST') {
      const { id, fullName, phoneNumber, email, country, amount, purpose, type, repaymentAmount, durationMonths, status, dateApplied, referralCode } = req.body;
      
      await pool.query(
        `INSERT INTO applications (id, full_name, phone_number, email, country, amount, purpose, type, repayment_amount, duration_months, status, date_applied, referral_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, fullName, phoneNumber, email, country, amount, purpose, type, repaymentAmount, durationMonths, status, dateApplied, referralCode]
      );
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Applications API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
