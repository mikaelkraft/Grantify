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
      const result = await pool.query('SELECT * FROM applications ORDER BY date_applied DESC');
      // Map back to camelCase
      const apps = result.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        phoneNumber: row.phone_number,
        email: row.email,
        country: row.country,
        amount: row.amount,
        purpose: row.purpose,
        businessType: row.business_type,
        matchedNetwork: row.matched_network,
        type: row.type,
        repaymentAmount: row.repayment_amount,
        durationMonths: row.duration_months,
        status: row.status,
        dateApplied: row.date_applied,
        referralCode: row.referral_code
      }));
      return res.status(200).json(apps);
    } 

    if (req.method === 'POST') {
      const app = req.body;
      await pool.query(
        `INSERT INTO applications (
          id, full_name, phone_number, email, country, 
          amount, purpose, business_type, matched_network, type, 
          repayment_amount, duration_months, status, date_applied, referral_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          app.id, app.fullName, app.phoneNumber, app.email, app.country, 
          app.amount, app.purpose, app.businessType, app.matchedNetwork, app.type, 
          app.repaymentAmount, app.durationMonths, app.status, app.dateApplied, app.referralCode
        ]
      );
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Applications API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
