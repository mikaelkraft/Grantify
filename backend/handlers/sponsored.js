import pool from '../db.js';
import crypto from 'crypto';
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

async function ensureSponsoredMetricsSchema(client) {
  try {
    await client.query("ALTER TABLE sponsored_listings ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0");
    await client.query("ALTER TABLE sponsored_listings ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0");
  } catch (e) {
    // ignore
  }
}

// Simple sponsored listing handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    await ensureSponsoredMetricsSchema(client);
    if (req.method === 'GET') {
      const { what, active, action } = req.query || {};
      if (what === 'pricing') {
        const r = await client.query('SELECT id, tier_name, price_cents, duration_days, description FROM sponsored_pricing ORDER BY price_cents ASC');
        return res.status(200).json(r.rows.map(r => ({ id: r.id, tierName: r.tier_name, priceCents: r.price_cents, durationDays: r.duration_days, description: r.description })));
      }

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
            testimonials = [];
          }

          // Basic metrics
          const tot = await client.query("SELECT COUNT(*) FROM sponsored_listings WHERE payment_status = 'paid'");
          const totalPaid = Number(tot.rows[0]?.count || 0);

          let paymentGateways = null;
          try {
            const gwRes = await client.query('SELECT config_json FROM payment_gateways_config WHERE id=1');
            if (gwRes.rows?.[0]?.config_json) {
              const cfg = gwRes.rows[0].config_json;
              paymentGateways = {
                flutterwave: {
                  enabled: Boolean(cfg.flutterwave?.enabled),
                  mode: cfg.flutterwave?.mode || 'live',
                  hasKey: Boolean(
                    (cfg.flutterwave?.clientId && cfg.flutterwave?.clientSecret) ||
                    (process.env.FLW_CLIENT_ID && process.env.FLW_CLIENT_SECRET) ||
                    cfg.flutterwave?.publicKey ||
                    process.env.FLW_PUBLIC_KEY ||
                    process.env.FLUTTERWAVE_PUBLIC_KEY
                  )
                },
                opay: {
                  enabled: Boolean(cfg.opay?.enabled),
                  mode: cfg.opay?.mode || 'sandbox',
                  hasKey: Boolean(cfg.opay?.merchantId || process.env.OPAY_MERCHANT_ID)
                },
                paypal: {
                  enabled: Boolean(cfg.paypal?.enabled),
                  mode: cfg.paypal?.mode || 'sandbox',
                  hasKey: Boolean(cfg.paypal?.clientId || cfg.paypal?.paypalEmail || process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_EMAIL)
                },
                bankwire: {
                  enabled: Boolean(cfg.bankwire?.enabled !== false),
                  bankName: cfg.bankwire?.bankName || '',
                  accountName: cfg.bankwire?.accountName || '',
                  accountNumber: cfg.bankwire?.accountNumber || '',
                  instructions: cfg.bankwire?.instructions || ''
                }
              };
            }
          } catch {}

          if (!paymentGateways) {
            paymentGateways = {
              flutterwave: {
                enabled: Boolean(
                  (process.env.FLW_CLIENT_ID && process.env.FLW_CLIENT_SECRET) ||
                  process.env.FLW_PUBLIC_KEY ||
                  process.env.FLUTTERWAVE_PUBLIC_KEY
                ),
                mode: process.env.FLW_MODE || 'live'
              },
              opay: { enabled: false, mode: 'sandbox' },
              paypal: { enabled: false, mode: 'sandbox' },
              bankwire: { enabled: true }
            };
          }

          return res.status(200).json({ tiers, testimonials, metrics: { totalPaid }, paymentGateways });
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
        const q = `SELECT sl.*, lp.name as provider_name, lp.website as provider_website, sp.tier_name, sp.duration_days
                   FROM sponsored_listings sl
                   LEFT JOIN loan_providers lp ON lp.id = sl.provider_id
                   LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id
                   ${whereClause}
                   ORDER BY sl.created_at DESC`;
        const r = await client.query(q, params);

        const mappedRows = (r.rows || []).map(row => {
          let payer = {};
          if (row.payer_info) {
            try {
              payer = typeof row.payer_info === 'string' ? JSON.parse(row.payer_info) : row.payer_info;
            } catch (e) {
              payer = {};
            }
          }
          return {
            ...row,
            payer_name: payer.name || '',
            payer_email: payer.email || '',
            payer_company: payer.company || '',
            campaign_note: payer.note || '',
            provider_name: row.provider_name || payer.customPartnerName || '',
            provider_website: row.provider_website || payer.website || ''
          };
        });

        // Export CSV for admins
        if (String(action).toLowerCase() === 'export_csv') {
          // Require admin
          const session = parseAdminSession(req);
          if (!session?.id) return res.status(401).json({ error: 'Unauthorized' });

          const rows = mappedRows;
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

        return res.status(200).json(mappedRows);
      }

      return res.status(400).json({ error: 'Missing query parameter `what` (pricing|listings)' });
    }

    if (req.method === 'POST') {
      const { action } = req.query || {};
      if (action === 'track_click') {
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });
        await client.query("UPDATE sponsored_listings SET clicks = COALESCE(clicks, 0) + 1 WHERE id = $1", [id]);
        return res.status(200).json({ success: true });
      }

      if (action === 'track_conversion') {
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });
        await client.query("UPDATE sponsored_listings SET conversions = COALESCE(conversions, 0) + 1 WHERE id = $1", [id]);
        return res.status(200).json({ success: true });
      }

      if (action === 'create') {
        const { providerId, tierId, payerInfo } = req.body || {};
        if (providerId === undefined || !tierId) return res.status(400).json({ error: 'providerId (can be null) and tierId are required' });

        const tierRes = await client.query('SELECT id, price_cents FROM sponsored_pricing WHERE id = $1', [tierId]);
        if (tierRes.rows.length === 0) return res.status(400).json({ error: 'Invalid tier' });

        const amount = tierRes.rows[0].price_cents || 0;
        const insert = await client.query(
          `INSERT INTO sponsored_listings (provider_id, tier_id, amount_cents, payer_info, payment_status)
           VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
          [providerId, tierId, amount, payerInfo ? JSON.stringify(payerInfo) : null]
        );
        const id = insert.rows[0].id;

        // Build payment URLs dynamically from gateway configs or env fallback
        let paymentUrl = null;
        try {
          const provider = String(payerInfo?.paymentProvider || 'bankwire').toLowerCase();
          const amountUSD = (amount / 100 / 800).toFixed(2); // Rough NGN to USD conversion
          const baseUrl = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || 'http://localhost:3001');
          const returnUrl = `${baseUrl}/api/sponsored/webhook?provider=${provider}&listingId=${id}`;

          let gwConfig = null;
          try {
            const gwRes = await client.query('SELECT config_json FROM payment_gateways_config WHERE id=1');
            if (gwRes.rows?.[0]?.config_json) gwConfig = gwRes.rows[0].config_json;
          } catch {}

          if (provider === 'flutterwave') {
            const flwClientId = (gwConfig?.flutterwave?.clientId || process.env.FLW_CLIENT_ID || process.env.FLUTTERWAVE_CLIENT_ID || '').trim();
            const flwClientSecret = (gwConfig?.flutterwave?.clientSecret || process.env.FLW_CLIENT_SECRET || process.env.FLUTTERWAVE_CLIENT_SECRET || '').trim();
            const fwKey = (gwConfig?.flutterwave?.publicKey || process.env.FLW_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY || '').trim();
            const fwSecret = (gwConfig?.flutterwave?.secretKey || process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
            const flwMode = (gwConfig?.flutterwave?.mode || process.env.FLW_MODE || 'live').toLowerCase();
            const isLive = flwMode === 'live' || flwMode === 'production';
            const txRef = `SPO-${id}-${Date.now()}`;

            // 1. If v4 Client ID & Client Secret are configured, authenticate via official v4 OAuth2
            let bearerToken = fwSecret || null;
            if (flwClientId && flwClientSecret) {
              try {
                const oauthBase = isLive
                  ? 'https://f4bexperience.flutterwave.com'
                  : 'https://developersandbox-api.flutterwave.com';
                const tokenResp = await fetch(`${oauthBase}/realms/flutterwave/protocol/openid-connect/token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: flwClientId,
                    client_secret: flwClientSecret
                  }).toString()
                });
                const tokenData = await tokenResp.json();
                if (tokenData?.access_token) {
                  bearerToken = tokenData.access_token;
                }
              } catch (tErr) {
                console.warn('Flutterwave v4 token exchange:', tErr?.message || tErr);
              }
            }

            // 2. Initiate session with Bearer token (v4 access token or secret key)
            if (bearerToken) {
              try {
                const flwResp = await fetch('https://api.flutterwave.com/v3/payments', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    tx_ref: txRef,
                    amount: amount / 100,
                    currency: 'NGN',
                    redirect_url: returnUrl,
                    customer: {
                      email: payerInfo?.email || 'sponsor@grantify.help',
                      name: payerInfo?.name || 'Grantify Sponsor'
                    },
                    customizations: {
                      title: 'Grantify Nigeria',
                      description: `Sponsored Listing #${id}`,
                      logo: 'https://grantify.help/logo.png'
                    },
                    meta: {
                      listing_id: id,
                      tier_id: tierId
                    }
                  })
                });
                const flwData = await flwResp.json();
                if (flwData?.status === 'success' && flwData?.data?.link) {
                  paymentUrl = flwData.data.link;
                } else {
                  console.warn('Flutterwave payments API response:', flwData?.message || flwData);
                }
              } catch (flwApiErr) {
                console.warn('Flutterwave API network error, falling back:', flwApiErr?.message || flwApiErr);
              }
            }

            // 3. Fallback to hosted checkout pay link if API link was not generated but client ID / public key exists
            const hostedKey = fwKey || flwClientId;
            if (!paymentUrl && hostedKey) {
              const fwUrl = new URL('https://checkout.flutterwave.com/v3/hosted/pay');
              fwUrl.searchParams.set('public_key', String(hostedKey));
              fwUrl.searchParams.set('tx_ref', txRef);
              fwUrl.searchParams.set('amount', String(amount / 100));
              fwUrl.searchParams.set('currency', 'NGN');
              fwUrl.searchParams.set('customer[email]', payerInfo?.email || '');
              fwUrl.searchParams.set('customer[name]', payerInfo?.name || 'Customer');
              fwUrl.searchParams.set('redirect_url', returnUrl);
              paymentUrl = fwUrl.toString();
            } else if (!paymentUrl && !bearerToken) {
              console.warn('Flutterwave v4 credentials not found in DB config or .env');
            }
          } else if (provider === 'opay') {
            const oPayMode = gwConfig?.opay?.mode || process.env.OPAY_MODE || 'sandbox';
            const oPayMerchantId = gwConfig?.opay?.merchantId || process.env.OPAY_MERCHANT_ID || '';
            const oPayEnv = oPayMode === 'live' ? 'api.opaycheckout.com' : 'sandbox.opaycheckout.com';
            const oPayUrl = new URL(`https://${oPayEnv}/checkout`);
            oPayUrl.searchParams.set('merchantId', String(oPayMerchantId));
            oPayUrl.searchParams.set('amount', String(amount));
            oPayUrl.searchParams.set('currency', 'NGN');
            oPayUrl.searchParams.set('reference', `SPO-${id}`);
            oPayUrl.searchParams.set('returnUrl', returnUrl);
            oPayUrl.searchParams.set('customerName', payerInfo?.name || 'Customer');
            oPayUrl.searchParams.set('customerEmail', payerInfo?.email || '');
            paymentUrl = oPayUrl.toString();
          } else if (provider === 'paypal') {
            const ppMode = gwConfig?.paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
            const ppBusiness = gwConfig?.paypal?.paypalEmail || gwConfig?.paypal?.clientId || process.env.PAYPAL_EMAIL || process.env.PAYPAL_MERCHANT_ID || '';
            const ppEnv = ppMode === 'live' ? 'checkout.paypal.com' : 'sandbox.paypal.com';
            const ppUrl = new URL(`https://${ppEnv}/cgi-bin/webscr`);
            ppUrl.searchParams.set('cmd', '_xclick');
            ppUrl.searchParams.set('business', String(ppBusiness));
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

    // Webhook and redirect return handlers for payment confirmations
    const isWebhookPath = Boolean(req.path?.includes('/webhook') || req.url?.includes('/webhook'));
    if (isWebhookPath) {
      let gwConfig = null;
      try {
        const gwRes = await client.query('SELECT config_json FROM payment_gateways_config WHERE id=1');
        if (gwRes.rows?.[0]?.config_json) gwConfig = gwRes.rows[0].config_json;
      } catch {}

      const baseUrl = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || 'http://localhost:3001');

      // Helper to activate a listing
      const activateListing = async (listingId) => {
        const r = await client.query(
          'SELECT sl.*, sp.duration_days FROM sponsored_listings sl LEFT JOIN sponsored_pricing sp ON sp.id = sl.tier_id WHERE sl.id = $1',
          [listingId]
        );
        if (r.rows.length === 0) return null;
        const listing = r.rows[0];
        const duration = listing.duration_days || 30;

        await client.query('BEGIN');
        const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${listingId}`;
        await client.query(
          `UPDATE sponsored_listings 
           SET payment_status = 'paid', 
               start_at = NOW(), 
               end_at = NOW() + ($1 || '1 day')::interval, 
               invoice_number = COALESCE(invoice_number, $3), 
               invoice_issued_at = COALESCE(invoice_issued_at, NOW()), 
               invoice_due_date = COALESCE(invoice_due_date, NOW() + INTERVAL '14 days'), 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [`${duration} days`, listingId, invoiceNumber]
        );
        if (listing.provider_id) {
          await client.query('UPDATE loan_providers SET is_recommended = TRUE WHERE id = $1', [listing.provider_id]);
        }
        await client.query('COMMIT');
        return listing;
      };

      // 1. GET Request: Customer browser returning from checkout redirect
      if (req.method === 'GET') {
        const { provider, listingId, status, tx_ref, transaction_id } = req.query || {};

        // Parse listing id from query param or from tx_ref (e.g. SPO-12-1698234)
        let id = Number(listingId);
        if (!id && tx_ref) {
          const match = String(tx_ref).match(/SPO-(\d+)/);
          if (match) id = Number(match[1]);
        }

        if (!id) return res.status(400).json({ error: 'listingId required' });

        // Handle cancellations or failures reported in query parameters
        const statusLower = String(status || '').toLowerCase();
        if (statusLower === 'cancelled' || statusLower === 'failed') {
          if (req.headers.accept?.includes('text/html')) {
            return res.redirect(`${baseUrl}/sponsor?payment_failed=1&id=${id}`);
          }
          return res.status(400).json({ error: 'Payment was cancelled or failed' });
        }

        // Verify Flutterwave transaction if transaction_id and secret key are available
        if (String(provider || '').toLowerCase() === 'flutterwave' && transaction_id) {
          const fwSecret = (gwConfig?.flutterwave?.secretKey || process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
          if (fwSecret) {
            try {
              const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${fwSecret}`,
                  'Content-Type': 'application/json'
                }
              });
              const verifyData = await verifyRes.json();
              if (verifyData?.status !== 'success' || verifyData?.data?.status !== 'successful') {
                console.warn('Flutterwave transaction verification unsuccessful:', verifyData);
                if (req.headers.accept?.includes('text/html')) {
                  return res.redirect(`${baseUrl}/sponsor?payment_failed=1&id=${id}`);
                }
                return res.status(400).json({ error: 'Transaction verification unsuccessful' });
              }
            } catch (vErr) {
              console.warn('Flutterwave verification request error (proceeding with fallback):', vErr?.message || vErr);
            }
          }
        }

        try {
          await activateListing(id);
          if (req.headers.accept?.includes('text/html')) {
            return res.redirect(`${baseUrl}/sponsor?payment_success=1&id=${id}`);
          }
          return res.status(200).json({ success: true, message: 'Listing activated' });
        } catch (err) {
          try { await client.query('ROLLBACK'); } catch {}
          console.error('Redirect return activation error', err);
          return res.status(500).json({ error: 'Failed to activate listing' });
        }
      }

      // 2. POST Request: Server-to-server asynchronous webhook notifications (Flutterwave, PayPal, OPay)
      if (req.method === 'POST') {
        const body = req.body || {};

        // --- Flutterwave Webhook Processing ---
        const flwSignature = req.headers['flutterwave-signature'];
        const verifHash = req.headers['verif-hash'];
        const secretHash = (gwConfig?.flutterwave?.secretHash || process.env.FLW_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_HASH || '').trim();

        if (flwSignature || verifHash || body?.event?.startsWith?.('charge.') || body?.type?.startsWith?.('charge.')) {
          // Signature verification
          if (secretHash) {
            let isValidSig = false;
            if (flwSignature) {
              // Flutterwave v4 HMAC-SHA256 verification
              const raw = req.rawBody || JSON.stringify(body);
              const computed = crypto.createHmac('sha256', secretHash).update(raw).digest('base64');
              if (computed === flwSignature) isValidSig = true;
            } else if (verifHash && verifHash === secretHash) {
              // Flutterwave v3 secret hash header check
              isValidSig = true;
            }

            if (!isValidSig && (flwSignature || verifHash)) {
              console.warn('Flutterwave webhook signature mismatch rejected');
              return res.status(401).json({ error: 'Invalid webhook signature' });
            }
          }

          const data = body.data || {};
          const status = String(data.status || '').toLowerCase();
          if (status === 'successful' || status === 'succeeded') {
            const txRef = String(data.tx_ref || data.reference || '');
            const match = txRef.match(/SPO-(\d+)/);
            const id = Number(data.meta?.listing_id || (match ? match[1] : null));

            if (id) {
              try {
                await activateListing(id);
                return res.status(200).json({ status: 'success', message: `Listing ${id} activated via webhook` });
              } catch (err) {
                console.error('Failed to activate listing from Flutterwave webhook', err);
                return res.status(500).json({ error: 'Database update failed' });
              }
            }
          }
          return res.status(200).json({ status: 'ignored', message: 'Event not applicable or listing not found' });
        }

        return res.status(200).json({ status: 'received' });
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
