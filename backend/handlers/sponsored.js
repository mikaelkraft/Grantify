import pool from '../db.js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

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

// Simple sponsored listing handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    if (req.method === 'GET') {
      const { what, active, action } = req.query || {};
      if (what === 'pricing') {
        const r = await client.query('SELECT id, tier_name, price_cents, duration_days, description FROM sponsored_pricing ORDER BY price_cents ASC');
        return res.status(200).json(r.rows.map(r => ({ id: r.id, tierName: r.tier_name, priceCents: r.price_cents, durationDays: r.duration_days, description: r.description })));
      }

      if (what === 'listings') {
        // Apply optional date/status filters for CSV export and listing fetch
        const filters = [];
        const params = [];
        let idx = 1;
        if (active) {
          filters.push("sl.payment_status='paid' AND (sl.end_at IS NULL OR sl.end_at > NOW())");
        }
        if (req.query.status) {
          filters.push(`sl.payment_status = $${idx++}`);
          params.push(String(req.query.status));
        }
        if (req.query.startDate) {
          filters.push(`sl.created_at >= $${idx++}`);
          params.push(String(req.query.startDate));
        }
        if (req.query.endDate) {
          filters.push(`sl.created_at <= $${idx++}`);
          params.push(String(req.query.endDate));
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const q = `SELECT sl.*, lp.name as provider_name, sp.tier_name, sp.duration_days
                   FROM sponsored_listings sl
                   LEFT JOIN loan_providers lp ON lp.id = sl.provider_id
                   LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id
                   ${whereClause}
                   ORDER BY sl.created_at DESC`;
        const r = await client.query(q);

        // Export CSV for admins
        if (String(action).toLowerCase() === 'export_csv') {
          // Require admin
          const session = parseAdminSession(req);
          if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

          const rows = r.rows || [];
          const cols = [
            'id','provider_id','provider_name','tier_id','tier_name','amount_cents','payment_status','start_at','end_at','created_at','updated_at','payer_info','invoice_number','billing_info','offline_payment_method','invoice_issued_at','invoice_due_date','admin_note'
          ];

          const esc = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'object') v = JSON.stringify(v);
            return '"' + String(v).replace(/"/g, '""') + '"';
          };

          const header = cols.join(',') + '\n';
          const body = rows.map(rw => cols.map(c => esc(rw[c])).join(',')).join('\n');
          const csv = header + body;

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="sponsored_listings.csv"');
          return res.status(200).send(csv);
        }

        return res.status(200).json(r.rows);
      }

      return res.status(400).json({ error: 'Missing query parameter `what` (pricing|listings)' });
    }

    if (req.method === 'POST') {
      const { action } = req.query || {};
      if (action === 'create') {
        const { providerId, tierId, payerInfo } = req.body || {};
        if (!providerId || !tierId) return res.status(400).json({ error: 'providerId and tierId are required' });

        const tierRes = await client.query('SELECT id, price_cents FROM sponsored_pricing WHERE id = $1', [tierId]);
        if (tierRes.rows.length === 0) return res.status(400).json({ error: 'Invalid tier' });

        const amount = tierRes.rows[0].price_cents || 0;
        const insert = await client.query(
          `INSERT INTO sponsored_listings (provider_id, tier_id, amount_cents, payer_info, payment_status)
           VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
          [providerId, tierId, amount, payerInfo ? JSON.stringify(payerInfo) : null]
        );
        const id = insert.rows[0].id;

        // In a production flow this would return a Stripe/Paystack checkout URL. For now return a stub and the record id.
        return res.status(200).json({ id, paymentUrl: null, amountCents: amount });
      }

      if (action === 'mark_paid') {
        const sessionRaw = req.headers['x-admin-session'];
        const session = parseAdminSession ? parseAdminSession(req) : null;
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });

        // Fetch listing and its tier
        const r = await client.query('SELECT sl.*, sp.duration_days FROM sponsored_listings sl LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id WHERE sl.id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
        const listing = r.rows[0];
        const duration = listing.duration_days || 30;

        await client.query('BEGIN');
        // Auto-generate invoice number and set invoice dates if not present
        const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id}`;
        await client.query(
          `UPDATE sponsored_listings SET payment_status = $1, start_at = NOW(), end_at = NOW() + ($2 || '1 day')::interval, invoice_number = COALESCE(invoice_number, $4), invoice_issued_at = COALESCE(invoice_issued_at, NOW()), invoice_due_date = COALESCE(invoice_due_date, NOW() + INTERVAL '14 days'), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          ['paid', `${duration} days`, id, invoiceNumber]
        );

        // Mark provider as recommended/featured
        if (listing.provider_id) {
          await client.query('UPDATE loan_providers SET is_recommended = TRUE WHERE id = $1', [listing.provider_id]);
        }

        await client.query('COMMIT');
        return res.status(200).json({ success: true });
      }

      if (action === 'generate_invoice_pdf' || action === 'send_invoice_email') {
        // Admin only
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

        const { id, emailTo, send } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });

        const r = await client.query('SELECT sl.*, lp.name as provider_name, sp.tier_name FROM sponsored_listings sl LEFT JOIN loan_providers lp ON lp.id = sl.provider_id LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id WHERE sl.id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
        const listing = r.rows[0];

        // Build invoice HTML / PDF using PDFKit
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          const pdfData = Buffer.concat(buffers);
          if (action === 'send_invoice_email' && emailTo) {
            // Send email with attachment
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: Boolean(process.env.SMTP_SECURE === 'true'),
              auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
            });
            const mailOpts = {
              from: process.env.FROM_EMAIL || process.env.SMTP_USER,
              to: emailTo,
              subject: `Invoice ${listing.invoice_number || 'invoice'}`,
              text: `Please find attached invoice ${listing.invoice_number || ''}`,
              attachments: [{ filename: `${listing.invoice_number || 'invoice'}.pdf`, content: pdfData }]
            };
            try {
              await transporter.sendMail(mailOpts);
            } catch (err) {
              console.error('Failed to send invoice email', err);
              return res.status(500).json({ error: 'Failed to send email' });
            }
            return res.status(200).json({ success: true });
          }

          // Return PDF
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${listing.invoice_number || 'invoice'}.pdf"`);
          return res.status(200).send(pdfData);
        });

        // PDF content
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice: ${listing.invoice_number || ''}`);
        doc.text(`Date Issued: ${listing.invoice_issued_at ? new Date(listing.invoice_issued_at).toLocaleDateString() : new Date().toLocaleDateString()}`);
        if (listing.invoice_due_date) doc.text(`Due Date: ${new Date(listing.invoice_due_date).toLocaleDateString()}`);
        doc.moveDown();
        doc.text(`Provider: ${listing.provider_name || listing.provider_id}`);
        doc.text(`Tier: ${listing.tier_name || listing.tier_id}`);
        doc.text(`Amount: ${(listing.amount_cents||0)/100} `);
        doc.moveDown();
        doc.text('Billing Info:');
        doc.text(JSON.stringify(listing.billing_info || listing.payer_info || {}, null, 2));
        doc.end();
        return; // response handled in 'end' listener
      }

      if (action === 'update_invoice') {
        // Admin-only: update invoice/billing details for a sponsored listing
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

        const { id, invoiceNumber, billingInfo, offlinePaymentMethod, invoiceIssuedAt, invoiceDueDate, adminNote } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });

        const updates = [];
        const params = [];
        let idx = 1;
        if (invoiceNumber !== undefined) { updates.push(`invoice_number = $${idx++}`); params.push(invoiceNumber); }
        if (billingInfo !== undefined) { updates.push(`billing_info = $${idx++}`); params.push(billingInfo ? JSON.stringify(billingInfo) : null); }
        if (offlinePaymentMethod !== undefined) { updates.push(`offline_payment_method = $${idx++}`); params.push(offlinePaymentMethod); }
        if (invoiceIssuedAt !== undefined) { updates.push(`invoice_issued_at = $${idx++}`); params.push(invoiceIssuedAt); }
        if (invoiceDueDate !== undefined) { updates.push(`invoice_due_date = $${idx++}`); params.push(invoiceDueDate); }
        if (adminNote !== undefined) { updates.push(`admin_note = $${idx++}`); params.push(adminNote); }

        if (updates.length === 0) return res.status(400).json({ error: 'No invoice fields provided' });

        params.push(id);
        const sql = `UPDATE sponsored_listings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`;
        await client.query(sql, params);
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Sponsored handler error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  } finally {
    client.release();
  }
}
