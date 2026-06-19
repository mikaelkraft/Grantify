// Handler: /api/leads

import pool, { toCamelCase } from '../db.js';

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
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query;

  try {
    if (type === 'applications') {
      if (req.method === 'GET') {
        const isStats = req.query.stats === '1' || req.query.stats === 'true';
        if (isStats) {
          const result = await pool.query(
            'SELECT COUNT(*)::int AS applications_count, COALESCE(SUM(amount), 0) AS total_requested_amount FROM applications'
          );
          const row = result.rows[0] || { applications_count: 0, total_requested_amount: 0 };
          return res.status(200).json({
            applicationsCount: Number(row.applications_count) || 0,
            totalRequestedAmount: Number(row.total_requested_amount) || 0
          });
        }

        const isPublic = req.query.public === '1' || req.query.public === 'true';
        if (isPublic) {
          const result = await pool.query('SELECT id, full_name FROM applications ORDER BY date_applied DESC');
          return res.status(200).json(result.rows.map(row => ({
            id: row.id,
            fullName: row.full_name
          })));
        }

        const result = await pool.query('SELECT * FROM applications ORDER BY date_applied DESC');
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

      if (req.method === 'PUT') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

        const app = req.body;
        const appId = req.query.id || app.id;
        if (!appId) return res.status(400).json({ error: 'Application ID is required' });

        await pool.query(
          `UPDATE applications SET 
            full_name = $1, phone_number = $2, email = $3, country = $4,
            amount = $5, purpose = $6, business_type = $7, matched_network = $8, type = $9,
            repayment_amount = $10, duration_months = $11, status = $12, date_applied = $13, referral_code = $14
           WHERE id = $15`,
          [
            app.fullName, app.phoneNumber, app.email, app.country,
            app.amount, app.purpose, app.businessType, app.matchedNetwork, app.type,
            app.repaymentAmount, app.durationMonths, app.status, app.dateApplied, app.referralCode,
            appId
          ]
        );
        return res.status(200).json({ success: true });
      }

      if (req.method === 'DELETE') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

        const appId = req.query.id;
        if (!appId) return res.status(400).json({ error: 'Application ID is required' });

        await pool.query('DELETE FROM applications WHERE id = $1', [appId]);
        return res.status(200).json({ success: true });
      }
    }

    if (type === 'qualified') {
      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM qualified_persons');
        return res.status(200).json(result.rows.map(toCamelCase));
      }

      if (req.method === 'POST') {
        const items = req.body;
        if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array' });

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM qualified_persons');
          for (const q of items) {
            await client.query(
              'INSERT INTO qualified_persons (id, name, amount, status, notes) VALUES ($1, $2, $3, $4, $5)',
              [q.id, q.name, q.amount, q.status, q.notes]
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
    }

    return res.status(405).json({ error: 'Method not allowed or invalid type' });
  } catch (err) {
    console.error('Leads handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
