import express from 'express';
import cors from 'cors';

import apiRouter from '../api/index.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());

// Most handlers expect JSON bodies.
app.use(express.json({ limit: '10mb' }));

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Vercel rewrites: /api/* -> /api/index?path=*
// For local dev, emulate that by populating req.query.path.
app.all(/^\/api\/(.*)/, async (req, res) => {
  const proxiedReq = Object.create(req);
  Object.defineProperty(proxiedReq, 'query', {
    value: { ...(req.query || {}), path: req.params[0] },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  return apiRouter(proxiedReq, res);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${port}`);

  // Safety: warn when autoblog or offsite uploads are enabled in non-production
  try {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const autoblog = String(process.env.AUTOBLOG_ENABLED || '').toLowerCase() === 'true';
    const uploads = String(process.env.OFFSITE_UPLOADS_ENABLED || '').toLowerCase() === 'true';
    if (!isProd && autoblog) {
      console.warn('WARNING: AUTOBLOG_ENABLED=true in non-production. This can publish daily posts locally.');
    }
    if (!isProd && uploads) {
      console.warn('WARNING: OFFSITE_UPLOADS_ENABLED=true in non-production. This can upload files to offsite storage.');
    }
  } catch (e) {
    /* ignore */
  }
});
/*
  try {
    const bcrypt = await import('bcryptjs').then(m => m.default);
    const saltRounds = 10;
    await client.query('BEGIN');
    await client.query('DELETE FROM admin_users');
    for (const a of items) {
      const passwordHash = a.passwordHash?.startsWith('$2')
        ? a.passwordHash
        : await bcrypt.hash(a.passwordHash, saltRounds);
      await client.query(
        `INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)`,
        [a.id, a.username, passwordHash, a.role, a.name]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const bcrypt = await import('bcryptjs').then(m => m.default);
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const u = result.rows[0];
    const isHashed = u.password_hash?.startsWith('$2');
    let isMatch = false;

    if (isHashed) {
      isMatch = await bcrypt.compare(password, u.password_hash);
    } else {
      isMatch = password === u.password_hash;
      if (isMatch) {
        const saltRounds = 10;
        const upgradedHash = await bcrypt.hash(password, saltRounds);
        await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [upgradedHash, u.id]);
        u.password_hash = upgradedHash;
      }
    }

    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      passwordHash: u.password_hash
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Repayment Content
app.get('/api/content/repayment', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM repayment_content WHERE id=1');
    if (result.rows.length > 0) {
      res.json({
        introText: result.rows[0].intro_text,
        standardNote: result.rows[0].standard_note,
        fastTrackNote: result.rows[0].fast_track_note
      });
    } else {
      res.json({});
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/content/repayment', async (req, res) => {
  const { introText, standardNote, fastTrackNote } = req.body;
  try {
    await pool.query(
      `INSERT INTO repayment_content (id, intro_text, standard_note, fast_track_note)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
       intro_text = EXCLUDED.intro_text, standard_note = EXCLUDED.standard_note, fast_track_note = EXCLUDED.fast_track_note`,
      [introText, standardNote, fastTrackNote]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Database Seeding Endpoint
// This endpoint seeds the database with initial mock data if tables are empty
app.post('/api/seed', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Initial Seed Data
    const initialTestimonials = [
      { id: '1', name: 'Chinedu Okeke', image: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?fit=crop&w=150&h=150&q=80', amount: 200000, content: 'Grantify really came through for my grocery business. The 5% interest rate is unbeatable!', likes: 124, loves: 45, claps: 12, date: '2025-10-15' },
      { id: '2', name: 'Amina Yusuf', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?fit=crop&w=150&h=150&q=80', amount: 500000, content: 'I was skeptical at first, but the process was transparent. I received my funds within 48 hours of verification.', likes: 89, loves: 120, claps: 30, date: '2025-11-20' },
      { id: '3', name: 'Tunde Bakare', image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?fit=crop&w=150&h=150&q=80', amount: 150000, content: 'Perfect for small business owners. The repayment plan is very flexible.', likes: 45, loves: 10, claps: 5, date: '2025-10-22' },
      { id: '4', name: 'Grace Eze', image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?fit=crop&w=150&h=150&q=80', amount: 1000000, content: 'The Fast-Track option is real! Paid the processing fee and got my loan sorted for my boutique expansion.', likes: 210, loves: 55, claps: 40, date: '2025-10-15' },
      { id: '5', name: 'Yusuf Ibrahim', image: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?fit=crop&w=150&h=150&q=80', amount: 350000, content: 'The customer service is excellent. They guided me through the NIN verification process smoothly.', likes: 78, loves: 15, claps: 8, date: '2025-11-12' },
      { id: '6', name: 'Ngozi Obi', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?fit=crop&w=150&h=150&q=80', amount: 800000, content: 'Applied on Monday, got credited on Wednesday. Highly recommended for traders.', likes: 156, loves: 89, claps: 22, date: '2025-10-30' }
    ];

    const initialQualified = [
      { id: '1', name: 'Emeka Uche', amount: 300000, status: 'Contacted', notes: 'Verification complete' },
      { id: '2', name: 'Sarah Johnson', amount: 150000, status: 'Pending', notes: 'Waiting for NIN' },
      { id: '3', name: 'Kabir Musa', amount: 500000, status: 'Disbursed', notes: 'Funds sent' },
      { id: '4', name: 'Chioma Obi', amount: 200000, status: 'Contacted', notes: 'Documents received' },
      { id: '5', name: 'Emmanuel Bassey', amount: 100000, status: 'Pending', notes: 'Reviewing application' },
      { id: '6', name: 'Funke Adebayo', amount: 450000, status: 'Disbursed', notes: 'Success' },
      { id: '7', name: 'Ibrahim Sani', amount: 250000, status: 'Pending', notes: 'Processing' },
      { id: '8', name: 'Ada Williams', amount: 180000, status: 'Contacted', notes: 'Call scheduled' }
    ];

    const initialAds = {
      head: '<!-- Google Tag Manager -->',
      header: '<div style="background:#eee; padding:10px; text-align:center; color:#666; font-size:12px;">Header Ad Space (728x90)</div>',
      body: '<div style="background:#f0fdf4; border:1px dashed #006400; padding:20px; text-align:center; color:#006400;">Sponsored Content Space</div>',
      sidebar: '<div style="background:#eee; height:250px; display:flex; align-items:center; justify-content:center; color:#666;">Sidebar Ad (300x250)</div>',
      footer: '<div style="background:#333; color:#fff; padding:10px; text-align:center;">Footer Ad Space</div>'
    };

    const initialRepayment = {
      introText: "We believe in transparent, easy-to-understand repayment terms. No hidden fees, just a flat interest rate.",
      standardNote: "Standard loans are designed for quick turnaround and small business support.",
      fastTrackNote: "Fast-track loans support larger capital requirements with a longer repayment duration."
    };

    const initialAdmins = [
      { 
        id: '1', 
        username: process.env.SEED_ADMIN_USERNAME || 'admin', 
        passwordHash: process.env.SEED_ADMIN_PASSWORD || 'Admin123', 
        role: 'SUPER_ADMIN', 
        name: 'Super Admin' 
      },
      { 
        id: '2', 
        username: process.env.SEED_STAFF_USERNAME || 'staff', 
        passwordHash: process.env.SEED_STAFF_PASSWORD || 'staff123', 
        role: 'FLOOR_ADMIN', 
        name: 'Floor Staff' 
      }
    ];

    const seeded = { testimonials: false, qualified: false, ads: false, repayment: false, admins: false };

    // Seed Testimonials if empty
    const testimonialsCount = await client.query('SELECT COUNT(*) FROM testimonials');
    if (parseInt(testimonialsCount.rows[0].count) === 0) {
      for (const t of initialTestimonials) {
        await client.query(
          `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [t.id, t.name, t.image, t.amount, t.content, t.likes, t.loves, t.claps, t.date]
        );
      }
      seeded.testimonials = true;
    }

    // Seed Qualified Persons if empty
    const qualifiedCount = await client.query('SELECT COUNT(*) FROM qualified_persons');
    if (parseInt(qualifiedCount.rows[0].count) === 0) {
      for (const q of initialQualified) {
        await client.query(
          `INSERT INTO qualified_persons (id, name, amount, status, notes) VALUES ($1, $2, $3, $4, $5)`,
          [q.id, q.name, q.amount, q.status, q.notes]
        );
      }
      seeded.qualified = true;
    }

    // Seed Ads if empty (check if default empty values or NULL)
    const adsResult = await client.query('SELECT * FROM ads WHERE id=1');
    if (adsResult.rows.length === 0 || (!adsResult.rows[0].head && !adsResult.rows[0].header)) {
      await client.query(
        `INSERT INTO ads (id, head, header, body, sidebar, footer)
         VALUES (1, $1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
         head = EXCLUDED.head, header = EXCLUDED.header, body = EXCLUDED.body, sidebar = EXCLUDED.sidebar, footer = EXCLUDED.footer`,
        [initialAds.head, initialAds.header, initialAds.body, initialAds.sidebar, initialAds.footer]
      );
      seeded.ads = true;
    }

    // Seed Repayment Content if empty (check if default empty values or NULL)
    const repaymentResult = await client.query('SELECT * FROM repayment_content WHERE id=1');
    if (repaymentResult.rows.length === 0 || (!repaymentResult.rows[0].intro_text && !repaymentResult.rows[0].standard_note)) {
      await client.query(
        `INSERT INTO repayment_content (id, intro_text, standard_note, fast_track_note)
         VALUES (1, $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
         intro_text = EXCLUDED.intro_text, standard_note = EXCLUDED.standard_note, fast_track_note = EXCLUDED.fast_track_note`,
        [initialRepayment.introText, initialRepayment.standardNote, initialRepayment.fastTrackNote]
      );
      seeded.repayment = true;
    }

    // Seed Admin Users if empty
    const adminsCount = await client.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminsCount.rows[0].count) === 0) {
      for (const a of initialAdmins) {
        await client.query(
          `INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)`,
          [a.id, a.username, a.passwordHash, a.role, a.name]
        );
      }
      seeded.admins = true;
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Database seeded successfully', seeded });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 8. AI Endpoint (Groq / HROQ)
app.post('/api/ai', async (req, res) => {
  const { prompt, type, history } = req.body || {};
  const groqKey = process.env.GROQ_API_KEY;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  if (!groqKey) {
    if (type === 'blog') {
      return res.status(200).json({
        content: `<h2>${prompt}</h2><p>This is a human-optimized article about <strong>${prompt}</strong>. It avoids common AI traits and focuses on the Nigerian business context. To enable live generation, add GROQ_API_KEY to the environment.</p>`
      });
    }
    return res.status(200).json({
      text: `Hi, I'm your Grantify Concierge on https://grantify.help. Live AI responses are currently offline on this deployment. You can still browse the Community Blog and the Loan Providers & Reviews pages, and I can guide you on what to check next.`
    });
  }

  const postProcessAnchors = (text) => {
    const s = String(text || '');
    return s.replace(/(<a\s+[^>]*href="([^"]+)"[^>]*>)(https?:\/\/[^<]+)(<\/a>)/gi, (m, open, href, inner, close) => {
      try {
        const u = new URL(href);
        return `${open}${u.hostname}${close}`;
      } catch {
        return m;
      }
    });
  };

  try {
    let systemInstruction = '';
    let userPrompt = prompt;

    if (type === 'blog') {
      systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
      Write an authoritative, human-sounding 600-word article in HTML format.
      
      CRITICAL CONTENT RULES:
      1. NEVER use em dashes (—). Use commas, colons, or periods instead.
      2. AVOID generic AI openings or conclusions.
      2b. Do NOT include a "Conclusion" section or wrap-up paragraph. End with concrete next steps.
      3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
      4. SOUND like a person, not a textbook. Be strategic and actionable.
      5. Do NOT add a "Sources" section or citations in the article body.
      6. Do NOT include raw URLs.
      7. FORMAT: Use <h2>, <h3>, <p>, <strong>, and <ul> tags only.`;

      userPrompt = `Topic: "${prompt}". Write a deep-dive strategy article for Nigerian entrepreneurs.`;
    } else {
      systemInstruction = `You are the Grantify Concierge, embedded inside Grantify (https://grantify.help).

      Your job: help users navigate Grantify's on-site content (Community Blog posts, Loan Providers & Reviews) and guide them to reputable Nigeria-focused grants and loan options.

      STYLE RULES:
      - No em dashes (—). Use commas, colons, or periods.
      - Be concise and practical. Ask at most 1 clarifying question when needed.
      - Be resolute: when you have enough info, give a direct answer. Do not hedge.
      - Do NOT say you are a "text-based assistant" or that you're on "no website". You are on Grantify.

      LINK RULES:
      - Never show raw URLs as visible text.
      - When linking, use: <a href="...">descriptive text</a>.
      - Max 2 links per message.
      - Only include internal Grantify links when the user asked where to click or asked you to reference on-site content.
      - Do not include external links unless explicitly requested.`;
    }

    const normalizedHistory = Array.isArray(history)
      ? history
          .slice(-12)
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const messages = type === 'blog'
      ? [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ]
      : [
          { role: 'system', content: systemInstruction },
          ...normalizedHistory,
          { role: 'user', content: userPrompt }
        ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.8
      })
    });

    if (!response.ok) throw new Error('Groq API Error');
    const data = await response.json();
    const aiText = postProcessAnchors(data.choices?.[0]?.message?.content || 'No response generated.');
    return res.status(200).json(type === 'blog' ? { content: aiText } : { text: aiText });
  } catch (err) {
    console.error('AI API Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
*/
