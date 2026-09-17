// Handler: /api/config

import pool, { toCamelCase } from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Config values (including ad HTML) are expected to change from the Admin UI.
  // Avoid intermediary caching that can cause stale ad wiring after updates.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query;

  try {
    if (type === 'autoblog') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS autoblog_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT single_row_autoblog_config CHECK (id = 1)
        )
      `);
      await pool.query('INSERT INTO autoblog_config (id, enabled) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING');

      if (req.method === 'GET') {
        let lastRun = null;
        let lastSuccessRun = null;
        let lastErrorRun = null;
        try {
          const [last, lastSuccess, lastError] = await Promise.all([
            pool.query(
              `SELECT status, reason, detail, is_vercel_cron, created_at
               FROM cron_runs
               WHERE cron_name = 'daily-blog'
               ORDER BY created_at DESC
               LIMIT 1`
            ),
            pool.query(
              `SELECT status, reason, detail, is_vercel_cron, created_at
               FROM cron_runs
               WHERE cron_name = 'daily-blog' AND status = 'success'
               ORDER BY created_at DESC
               LIMIT 1`
            ),
            pool.query(
              `SELECT status, reason, detail, is_vercel_cron, created_at
               FROM cron_runs
               WHERE cron_name = 'daily-blog' AND status = 'error'
               ORDER BY created_at DESC
               LIMIT 1`
            ),
          ]);
          lastRun = last.rows?.[0] ?? null;
          lastSuccessRun = lastSuccess.rows?.[0] ?? null;
          lastErrorRun = lastError.rows?.[0] ?? null;
        } catch {
          // cron_runs may not exist yet; ignore
        }

        const result = await pool.query('SELECT enabled, updated_at FROM autoblog_config WHERE id=1');
        const row = result.rows?.[0];
        return res.status(200).json({
          enabled: Boolean(row?.enabled),
          updatedAt: row?.updated_at || null,
          lastRun,
          lastSuccessRun,
          lastErrorRun,
        });
      }

      if (req.method === 'POST') {
        const enabled = Boolean(req.body?.enabled);
        await pool.query(
          `UPDATE autoblog_config
           SET enabled = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = 1`,
          [enabled]
        );
        return res.status(200).json({ success: true, enabled });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (type === 'ads') {
      // Ensure base table exists for fresh databases/environments.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ads (
          id INTEGER PRIMARY KEY,
          head TEXT,
          header TEXT,
          body TEXT,
          sidebar TEXT,
          footer TEXT,
          promo1_link TEXT,
          promo1_text TEXT,
          promo2_link TEXT,
          promo2_text TEXT
        )
      `);
      await pool.query('INSERT INTO ads (id) VALUES (1) ON CONFLICT (id) DO NOTHING');

      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM ads WHERE id=1');
        return res.status(200).json(result.rows.length > 0 ? toCamelCase(result.rows[0]) : {});
      }

      if (req.method === 'POST') {
        const { head, header, body, sidebar, footer, promo1Link, promo1Text, promo2Link, promo2Text } = req.body;

        // Backward-compatible: older DBs may not have promo columns.
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

    if (type === 'whatsapp') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          phone_number TEXT NOT NULL DEFAULT '',
          button_label TEXT NOT NULL DEFAULT '',
          pre_filled_text TEXT NOT NULL DEFAULT '',
          CONSTRAINT single_row_whatsapp_config CHECK (id = 1)
        )
      `);
      await pool.query(`
        INSERT INTO whatsapp_config (id, is_enabled, phone_number, button_label, pre_filled_text)
        VALUES (1, FALSE, '', 'Chat with an Expert', 'Hello Grantify, I want to inquire about grant opportunities.')
        ON CONFLICT (id) DO NOTHING
      `);

      if (req.method === 'GET') {
        const result = await pool.query('SELECT * FROM whatsapp_config WHERE id=1');
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return res.status(200).json({
            isEnabled: Boolean(row.is_enabled),
            phoneNumber: String(row.phone_number || ''),
            buttonLabel: String(row.button_label || ''),
            preFilledText: String(row.pre_filled_text || '')
          });
        }
        return res.status(200).json({
          isEnabled: false,
          phoneNumber: '',
          buttonLabel: 'Chat with an Expert',
          preFilledText: 'Hello Grantify, I want to inquire about grant opportunities.'
        });
      }

      if (req.method === 'POST') {
        const { isEnabled, phoneNumber, buttonLabel, preFilledText } = req.body;
        await pool.query(
          `INSERT INTO whatsapp_config (id, is_enabled, phone_number, button_label, pre_filled_text)
           VALUES (1, $1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
           is_enabled = EXCLUDED.is_enabled,
           phone_number = EXCLUDED.phone_number,
           button_label = EXCLUDED.button_label,
           pre_filled_text = EXCLUDED.pre_filled_text`,
          [Boolean(isEnabled), String(phoneNumber || ''), String(buttonLabel || ''), String(preFilledText || '')]
        );
        return res.status(200).json({ success: true });
      }
    }

    if (type === 'social_links') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS social_links_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT single_row_social_links CHECK (id = 1)
        )
      `);

      const defaultSocialLinks = {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        tiktok: '',
        telegram: '',
        whatsapp: ''
      };

      if (req.method === 'GET') {
        const result = await pool.query('SELECT config_json FROM social_links_config WHERE id = 1');
        const saved = result.rows?.[0]?.config_json || {};
        return res.status(200).json({ ...defaultSocialLinks, ...saved });
      }

      if (req.method === 'POST') {
        const incoming = req.body || {};
        const sanitized = {
          facebook: String(incoming.facebook || '').trim(),
          twitter: String(incoming.twitter || incoming.x || '').trim(),
          instagram: String(incoming.instagram || '').trim(),
          linkedin: String(incoming.linkedin || '').trim(),
          youtube: String(incoming.youtube || '').trim(),
          tiktok: String(incoming.tiktok || '').trim(),
          telegram: String(incoming.telegram || '').trim(),
          whatsapp: String(incoming.whatsapp || '').trim()
        };

        await pool.query(
          `INSERT INTO social_links_config (id, config_json, updated_at)
           VALUES (1, $1::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
           config_json = EXCLUDED.config_json,
           updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(sanitized)]
        );

        return res.status(200).json({ success: true, socialLinks: sanitized });
      }
    }

    if (type === 'payment_gateways') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_gateways_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT single_row_payment_gateways CHECK (id = 1)
        )
      `);

      const defaultGatewayConfig = {
        flutterwave: {
          enabled: process.env.FLW_ENABLED === 'true' || process.env.FLUTTERWAVE_ENABLED === 'true' || false,
          publicKey: (process.env.FLW_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY || '').trim(),
          secretKey: (process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim(),
          encryptionKey: (process.env.FLW_ENCRYPTION_KEY || process.env.FLUTTERWAVE_ENCRYPTION_KEY || '').trim(),
          secretHash: (process.env.FLW_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_HASH || '').trim(),
          clientId: (process.env.FLW_CLIENT_ID || process.env.FLUTTERWAVE_CLIENT_ID || '').trim(),
          clientSecret: (process.env.FLW_CLIENT_SECRET || process.env.FLUTTERWAVE_CLIENT_SECRET || '').trim(),
          mode: process.env.FLW_MODE === 'live' || process.env.FLUTTERWAVE_MODE === 'live' ? 'live' : 'test'
        },
        opay: {
          enabled: process.env.OPAY_ENABLED === 'true' || false,
          merchantId: (process.env.OPAY_MERCHANT_ID || '').trim(),
          publicKey: (process.env.OPAY_PUBLIC_KEY || '').trim(),
          secretKey: (process.env.OPAY_SECRET_KEY || '').trim(),
          mode: process.env.OPAY_MODE === 'live' ? 'live' : 'sandbox'
        },
        paypal: {
          enabled: process.env.PAYPAL_ENABLED === 'true' || false,
          clientId: (process.env.PAYPAL_CLIENT_ID || '').trim(),
          clientSecret: (process.env.PAYPAL_CLIENT_SECRET || '').trim(),
          paypalEmail: (process.env.PAYPAL_EMAIL || '').trim(),
          mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
        },
        bankwire: {
          enabled: true,
          bankName: (process.env.BANK_NAME || '').trim(),
          accountName: (process.env.BANK_ACCOUNT_NAME || '').trim(),
          accountNumber: (process.env.BANK_ACCOUNT_NUMBER || '').trim(),
          sortCodeSwift: (process.env.BANK_SWIFT_CODE || '').trim(),
          instructions: 'Official VAT-compliant proforma invoice with bank settlement instructions will be dispatched to your billing email upon request.',
          invoiceNote: 'Payment is required within 7 business days to secure slot reservation.'
        }
      };

      await pool.query(`
        INSERT INTO payment_gateways_config (id, config_json)
        VALUES (1, $1)
        ON CONFLICT (id) DO NOTHING
      `, [JSON.stringify(defaultGatewayConfig)]);

      if (req.method === 'GET') {
        const result = await pool.query('SELECT config_json, updated_at FROM payment_gateways_config WHERE id=1');
        const row = result.rows[0];
        const savedConfig = (row && row.config_json) ? row.config_json : {};
        // Merge with defaults to ensure all keys and environment fallback keys exist
        const merged = {
          flutterwave: {
            ...defaultGatewayConfig.flutterwave,
            ...(savedConfig.flutterwave || {}),
            clientId: (savedConfig.flutterwave?.clientId || savedConfig.flutterwave?.publicKey || defaultGatewayConfig.flutterwave.clientId || '').trim(),
            clientSecret: (savedConfig.flutterwave?.clientSecret || savedConfig.flutterwave?.secretKey || defaultGatewayConfig.flutterwave.clientSecret || '').trim(),
            encryptionKey: (savedConfig.flutterwave?.encryptionKey || defaultGatewayConfig.flutterwave.encryptionKey || '').trim(),
            secretHash: (savedConfig.flutterwave?.secretHash || defaultGatewayConfig.flutterwave.secretHash || '').trim(),
            publicKey: (savedConfig.flutterwave?.publicKey || savedConfig.flutterwave?.clientId || defaultGatewayConfig.flutterwave.publicKey || '').trim(),
            secretKey: (savedConfig.flutterwave?.secretKey || savedConfig.flutterwave?.clientSecret || defaultGatewayConfig.flutterwave.secretKey || '').trim(),
            mode: savedConfig.flutterwave?.mode || defaultGatewayConfig.flutterwave.mode || 'live'
          },
          opay: {
            ...defaultGatewayConfig.opay,
            ...(savedConfig.opay || {}),
            merchantId: (savedConfig.opay?.merchantId || defaultGatewayConfig.opay.merchantId || '').trim(),
            publicKey: (savedConfig.opay?.publicKey || defaultGatewayConfig.opay.publicKey || '').trim(),
            secretKey: (savedConfig.opay?.secretKey || defaultGatewayConfig.opay.secretKey || '').trim(),
            mode: savedConfig.opay?.mode || defaultGatewayConfig.opay.mode || 'sandbox'
          },
          paypal: {
            ...defaultGatewayConfig.paypal,
            ...(savedConfig.paypal || {}),
            clientId: (savedConfig.paypal?.clientId || defaultGatewayConfig.paypal.clientId || '').trim(),
            clientSecret: (savedConfig.paypal?.clientSecret || defaultGatewayConfig.paypal.clientSecret || '').trim(),
            paypalEmail: (savedConfig.paypal?.paypalEmail || defaultGatewayConfig.paypal.paypalEmail || '').trim(),
            mode: savedConfig.paypal?.mode || defaultGatewayConfig.paypal.mode || 'sandbox'
          },
          bankwire: {
            ...defaultGatewayConfig.bankwire,
            ...(savedConfig.bankwire || {})
          },
        };
        return res.status(200).json({
          gateways: merged,
          updatedAt: row?.updated_at || null
        });
      }

      if (req.method === 'POST') {
        const payload = req.body?.gateways || req.body || {};
        const safeConfig = {
          flutterwave: {
            enabled: Boolean(payload.flutterwave?.enabled),
            publicKey: String(payload.flutterwave?.publicKey || '').trim(),
            secretKey: String(payload.flutterwave?.secretKey || '').trim(),
            encryptionKey: String(payload.flutterwave?.encryptionKey || '').trim(),
            mode: payload.flutterwave?.mode === 'live' ? 'live' : 'test'
          },
          opay: {
            enabled: Boolean(payload.opay?.enabled),
            merchantId: String(payload.opay?.merchantId || '').trim(),
            publicKey: String(payload.opay?.publicKey || '').trim(),
            secretKey: String(payload.opay?.secretKey || '').trim(),
            mode: payload.opay?.mode === 'live' ? 'live' : 'sandbox'
          },
          paypal: {
            enabled: Boolean(payload.paypal?.enabled),
            clientId: String(payload.paypal?.clientId || '').trim(),
            clientSecret: String(payload.paypal?.clientSecret || '').trim(),
            paypalEmail: String(payload.paypal?.paypalEmail || '').trim(),
            mode: payload.paypal?.mode === 'live' ? 'live' : 'sandbox'
          },
          bankwire: {
            enabled: payload.bankwire?.enabled !== undefined ? Boolean(payload.bankwire.enabled) : true,
            bankName: String(payload.bankwire?.bankName || '').trim(),
            accountName: String(payload.bankwire?.accountName || '').trim(),
            accountNumber: String(payload.bankwire?.accountNumber || '').trim(),
            sortCodeSwift: String(payload.bankwire?.sortCodeSwift || '').trim(),
            instructions: String(payload.bankwire?.instructions || defaultGatewayConfig.bankwire.instructions).trim(),
            invoiceNote: String(payload.bankwire?.invoiceNote || defaultGatewayConfig.bankwire.invoiceNote).trim()
          }
        };

        await pool.query(
          `INSERT INTO payment_gateways_config (id, config_json, updated_at)
           VALUES (1, $1, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
           config_json = EXCLUDED.config_json,
           updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(safeConfig)]
        );

        return res.status(200).json({ success: true, gateways: safeConfig });
      }
    }

    return res.status(405).json({ error: 'Method not allowed or invalid type' });
  } catch (err) {
    console.error('Config handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
