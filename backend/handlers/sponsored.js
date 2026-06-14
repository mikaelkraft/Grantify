import pool from '../db.js';
<<<<<<< HEAD
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
=======
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94

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

<<<<<<< HEAD
      if (what === 'meta') {
        // Return availability per tier, recent testimonials (if available), and simple metrics for the Sponsor page
        try {
          // Attempt to include max_slots if the column exists; fallback when it doesn't
          let tiersRaw;
          try {
            tiersRaw = await client.query('SELECT id, tier_name, price_cents, duration_days, max_slots FROM sponsored_pricing ORDER BY price_cents ASC');
          } catch (e) {
            tiersRaw = await client.query('SELECT id, tier_name, price_cents, duration_days FROM sponsored_pricing ORDER BY price_cents ASC');
          }

          const tiers = [];
          for (const t of tiersRaw.rows) {
            const cnt = await client.query("SELECT COUNT(*) FROM sponsored_listings WHERE tier_id = $1 AND payment_status = 'paid' AND (end_at IS NULL OR end_at > NOW())", [t.id]);
            const activeCount = Number(cnt.rows[0]?.count || 0);
            const maxSlots = ('max_slots' in t) ? (typeof t.max_slots === 'number' ? t.max_slots : (t.max_slots === null ? null : Number(t.max_slots))) : null;
            const slotsLeft = (maxSlots === null || maxSlots === undefined || Number.isNaN(Number(maxSlots))) ? null : Math.max(0, Number(maxSlots) - activeCount);
            tiers.push({ id: t.id, tierName: t.tier_name, priceCents: t.price_cents, durationDays: t.duration_days, maxSlots: maxSlots, activeCount, slotsLeft });
          }

          // Try to fetch sponsor testimonials from a table if present
          let testimonials = [];
          try {
            const tt = await client.query('SELECT id, author, quote, provider_id FROM sponsor_testimonials ORDER BY created_at DESC LIMIT 6');
            testimonials = tt.rows.map(r => ({ id: r.id, author: r.author, quote: r.quote, providerId: r.provider_id }));
          } catch (e) {
            // Fallback to an inline sample testimonial if table doesn't exist
            testimonials = [
              { id: 'sample-1', author: 'Acme Corp', quote: 'We saw a 3x uplift in referrals after sponsoring Grantify.', providerId: null },
              { id: 'sample-2', author: 'StartUp Hub', quote: 'Great targeted audience and fast activation.', providerId: null }
            ];
          }

          // Basic metrics
          const tot = await client.query("SELECT COUNT(*) FROM sponsored_listings WHERE payment_status = 'paid'");
          const totalPaid = Number(tot.rows[0]?.count || 0);

          return res.status(200).json({ tiers, testimonials, metrics: { totalPaid } });
        } catch (err) {
          console.error('Failed to build sponsor meta', err);
          return res.status(500).json({ error: 'Failed to fetch sponsor meta' });
        }
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

=======
      if (what === 'listings') {
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94
        const q = `SELECT sl.*, lp.name as provider_name, sp.tier_name, sp.duration_days
                   FROM sponsored_listings sl
                   LEFT JOIN loan_providers lp ON lp.id = sl.provider_id
                   LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id
<<<<<<< HEAD
                   ${whereClause}
=======
                   ${active ? "WHERE sl.payment_status='paid' AND (sl.end_at IS NULL OR sl.end_at > NOW())" : ''}
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94
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

<<<<<<< HEAD
        // Build payment URLs for PayPal or OPay
        let paymentUrl = null;
        try {
          const provider = String(payerInfo?.paymentProvider || 'paypal').toLowerCase();
          const amountUSD = (amount / 100 / 800).toFixed(2); // Rough NGN to USD conversion
          const baseUrl = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || 'http://localhost:3001');
          const returnUrl = `${baseUrl}/api/sponsored/webhook?provider=${provider}&listingId=${id}`;

          if (provider === 'opay') {
            // OPay checkout: redirect to OPay sandbox or live
            const oPayEnv = process.env.OPAY_MODE === 'live' ? 'api.opaycheckout.com' : 'sandbox.opaycheckout.com';
            const oPayUrl = new URL(`https://${oPayEnv}/checkout`);
            oPayUrl.searchParams.set('merchantId', String(process.env.OPAY_MERCHANT_ID || ''));
            oPayUrl.searchParams.set('amount', String(amount));
            oPayUrl.searchParams.set('currency', 'NGN');
            oPayUrl.searchParams.set('reference', `SPO-${id}`);
            oPayUrl.searchParams.set('returnUrl', returnUrl);
            oPayUrl.searchParams.set('customerName', payerInfo?.name || 'Customer');
            oPayUrl.searchParams.set('customerEmail', payerInfo?.email || '');
            paymentUrl = oPayUrl.toString();
          } else {
            // PayPal checkout (default)
            const ppEnv = process.env.PAYPAL_MODE === 'live' ? 'checkout.paypal.com' : 'sandbox.paypal.com';
            const ppUrl = new URL(`https://${ppEnv}/cgi-bin/webscr`);
            ppUrl.searchParams.set('cmd', '_xclick');
            ppUrl.searchParams.set('business', String(process.env.PAYPAL_EMAIL || process.env.PAYPAL_MERCHANT_ID || ''));
            ppUrl.searchParams.set('item_name', `Grantify Sponsor: Listing #${id}`);
            ppUrl.searchParams.set('item_number', `SPO-${id}`);
            ppUrl.searchParams.set('amount', amountUSD);
            ppUrl.searchParams.set('currency_code', 'USD');
            ppUrl.searchParams.set('return', returnUrl);
            ppUrl.searchParams.set('cancel_return', `${baseUrl}/sponsor?cancelled=1`);
            ppUrl.searchParams.set('notify_url', `${baseUrl}/api/sponsored/webhook`);
            paymentUrl = ppUrl.toString();
          }
        } catch (e) {
          console.warn('Failed to build payment URL', e);
        }

        return res.status(200).json({ id, paymentUrl, amountCents: amount });
      }

      // Admin actions to manage tiers and listings
      if (action === 'update_tier_slots') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });
        const { id, maxSlots } = req.body || {};
        if (!id) return res.status(400).json({ error: 'tier id required' });

        // Ensure column exists
        try {
          await client.query("ALTER TABLE sponsored_pricing ADD COLUMN IF NOT EXISTS max_slots INTEGER");
        } catch (e) { /* ignore */ }

        await client.query('UPDATE sponsored_pricing SET max_slots = $1 WHERE id = $2', [maxSlots === null ? null : Number(maxSlots), id]);
        return res.status(200).json({ success: true });
      }

      if (action === 'publish_now') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });

        const r = await client.query('SELECT sl.*, sp.duration_days FROM sponsored_listings sl LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id WHERE sl.id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
        const listing = r.rows[0];
        const duration = listing.duration_days || 30;

        await client.query('BEGIN');
        const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id}`;
        await client.query(`UPDATE sponsored_listings SET payment_status = $1, start_at = NOW(), end_at = NOW() + ($2 || '1 day')::interval, invoice_number = COALESCE(invoice_number, $4), invoice_issued_at = COALESCE(invoice_issued_at, NOW()), invoice_due_date = COALESCE(invoice_due_date, NOW() + INTERVAL '14 days'), updated_at = CURRENT_TIMESTAMP WHERE id = $3`, ['paid', `${duration} days`, id, invoiceNumber]);
        if (listing.provider_id) {
          await client.query('UPDATE loan_providers SET is_recommended = TRUE WHERE id = $1', [listing.provider_id]);
        }
        await client.query('COMMIT');
        return res.status(200).json({ success: true });
      }

      if (action === 'schedule_publish') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });
        const { id, startAt, endAt, adminNote } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });

        const updates = [];
        const params = [];
        let idx = 1;
        if (startAt !== undefined) { updates.push(`start_at = $${idx++}`); params.push(startAt); }
        if (endAt !== undefined) { updates.push(`end_at = $${idx++}`); params.push(endAt); }
        if (adminNote !== undefined) { updates.push(`admin_note = $${idx++}`); params.push(adminNote); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        params.push(id);
        const sql = `UPDATE sponsored_listings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`;
        await client.query(sql, params);
        return res.status(200).json({ success: true });
      }

      // Sponsor testimonials CRUD (admin)
      if (action === 'add_sponsor_testimonial') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });
        const { author, quote, providerId } = req.body || {};
        if (!author || !quote) return res.status(400).json({ error: 'author and quote required' });
        try {
          await client.query(`CREATE TABLE IF NOT EXISTS sponsor_testimonials (
            id SERIAL PRIMARY KEY,
            author TEXT NOT NULL,
            quote TEXT NOT NULL,
            provider_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`);
        } catch (e) { /* ignore */ }
        const ins = await client.query('INSERT INTO sponsor_testimonials (author, quote, provider_id) VALUES ($1, $2, $3) RETURNING id, author, quote, provider_id', [author, quote, providerId || null]);
        return res.status(200).json(ins.rows[0]);
      }

      if (action === 'update_sponsor_testimonial') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });
        const { id, author, quote } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });
        await client.query('UPDATE sponsor_testimonials SET author = COALESCE($1, author), quote = COALESCE($2, quote) WHERE id = $3', [author || null, quote || null, id]);
        return res.status(200).json({ success: true });
      }

      if (action === 'delete_sponsor_testimonial') {
        const session = parseAdminSession(req);
        if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });
        await client.query('DELETE FROM sponsor_testimonials WHERE id = $1', [id]);
        return res.status(200).json({ success: true });
=======
        // In a production flow this would return a Stripe/Paystack checkout URL. For now return a stub and the record id.
        return res.status(200).json({ id, paymentUrl: null, amountCents: amount });
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94
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
<<<<<<< HEAD
        // Auto-generate invoice number and set invoice dates if not present
        const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id}`;
        await client.query(
          `UPDATE sponsored_listings SET payment_status = $1, start_at = NOW(), end_at = NOW() + ($2 || '1 day')::interval, invoice_number = COALESCE(invoice_number, $4), invoice_issued_at = COALESCE(invoice_issued_at, NOW()), invoice_due_date = COALESCE(invoice_due_date, NOW() + INTERVAL '14 days'), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          ['paid', `${duration} days`, id, invoiceNumber]
        );
=======
        await client.query('UPDATE sponsored_listings SET payment_status = $1, start_at = NOW(), end_at = NOW() + ($2 || "1 day")::interval, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['paid', `${duration} days`, id]);
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94

        // Mark provider as recommended/featured
        if (listing.provider_id) {
          await client.query('UPDATE loan_providers SET is_recommended = TRUE WHERE id = $1', [listing.provider_id]);
        }

        await client.query('COMMIT');
        return res.status(200).json({ success: true });
      }

<<<<<<< HEAD
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

=======
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94
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

<<<<<<< HEAD
    // Webhook handlers for payment confirmations
    if (req.method === 'GET' && req.path?.includes('/webhook')) {
      const { provider, listingId } = req.query || {};
      const id = Number(listingId);
      if (!id) return res.status(400).json({ error: 'listingId required' });

      try {
        // Mark the listing as paid
        const r = await client.query('SELECT sl.*, sp.duration_days FROM sponsored_listings sl LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id WHERE sl.id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
        const listing = r.rows[0];
        const duration = listing.duration_days || 30;

        await client.query('BEGIN');
        const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id}`;
        await client.query(`UPDATE sponsored_listings SET payment_status = 'paid', start_at = NOW(), end_at = NOW() + ($1 || '1 day')::interval, invoice_number = COALESCE(invoice_number, $3), invoice_issued_at = COALESCE(invoice_issued_at, NOW()), invoice_due_date = COALESCE(invoice_due_date, NOW() + INTERVAL '14 days'), updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [`${duration} days`, id, invoiceNumber]);
        if (listing.provider_id) {
          await client.query('UPDATE loan_providers SET is_recommended = TRUE WHERE id = $1', [listing.provider_id]);
        }
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Listing activated' });
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Webhook handler error', err);
        return res.status(500).json({ error: 'Failed to activate listing' });
      }
    }

=======
>>>>>>> 87fea6116f9d05541a0d8f6f9e499688217a0a94
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Sponsored handler error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  } finally {
    client.release();
  }
}
