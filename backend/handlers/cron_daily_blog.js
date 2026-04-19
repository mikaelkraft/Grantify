// Handler: /api/cron/daily-blog

import pool from '../db.js';

const fetchUnsplashImage = async (query) => {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const q = String(query || '').trim();
  if (!q) return '';

  if (!key) {
    return `https://source.unsplash.com/1600x900/?${encodeURIComponent(q)}`;
  }

  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: {
        'Accept-Version': 'v1',
        'Authorization': `Client-ID ${key}`
      }
    });
    if (!res.ok) return '';
    const data = await res.json();
    const imageUrl = data?.urls?.regular || data?.urls?.small || '';
    return typeof imageUrl === 'string' ? imageUrl : '';
  } catch {
    return '';
  }
};

const fetchNewsItems = async (query) => {
  const q = `${String(query || '').trim()} Nigeria`.trim();
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`;

  const res = await fetch(url, { headers: { 'User-Agent': 'GrantifyCron/1.0' } });
  if (!res.ok) return [];
  const xml = await res.text();

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) && items.length < 6) {
    const itemXml = match[1];
    const title = (itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || itemXml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1];
    const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1];
    if (!title || !link) continue;
    items.push({
      title: String(title).replace(/<[^>]+>/g, '').trim(),
      link: String(link).trim(),
      pubDate: pubDate ? String(pubDate).trim() : ''
    });
  }
  return items;
};

const buildSourcesHtml = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const safeItems = items
    .filter((i) => i && typeof i.title === 'string' && typeof i.link === 'string')
    .slice(0, 3);
  if (safeItems.length === 0) return '';

  const listItems = safeItems
    .map((i) => {
      const title = i.title.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
      const href = String(i.link).replace(/"/g, '&quot;').trim();
      return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
    })
    .join('');

  return `<h3>Sources</h3><ul>${listItems}</ul>`;
};

const extractTitleFromHtml = (html) => {
  try {
    const m = String(html || '').match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!m) return null;
    return String(m[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
};

const stripDatesFromTitle = (title) => {
  const input = String(title || '').trim();
  if (!input) return '';

  // Remove common date patterns anywhere in the title.
  let t = input
    // ISO-like: 2026-03-29 or 2026/03/29
    .replace(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g, '')
    // Month name: March 29, 2026
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/gi, '')
    // Short month: Mar 29, 2026
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},\s*20\d{2}\b/gi, '');

  // Clean dangling separators / empty parentheses.
  t = t
    .replace(/\(\s*\)/g, '')
    .replace(/\s*[-–|:]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return t;
};

const bestEffortLogCronRun = async ({
  cronName,
  status,
  reason,
  detail,
  isVercelCron,
}) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS cron_runs (
          id TEXT PRIMARY KEY,
          cron_name TEXT NOT NULL,
          status TEXT NOT NULL,
          reason TEXT,
          detail TEXT,
          is_vercel_cron BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const runId = Date.now().toString();
      await client.query(
        `INSERT INTO cron_runs (id, cron_name, status, reason, detail, is_vercel_cron)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          runId,
          String(cronName || 'daily-blog'),
          String(status || 'unknown'),
          reason ? String(reason) : null,
          detail ? String(detail) : null,
          Boolean(isVercelCron),
        ]
      );
    } finally {
      client.release();
    }
  } catch {
    // no-op
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const isVercelCron = Boolean(req.headers['x-vercel-cron']);

  if (String(process.env.AUTOBLOG_ENABLED || '').toLowerCase() !== 'true') {
    await bestEffortLogCronRun({
      cronName: 'daily-blog',
      status: 'skipped',
      reason: 'AUTOBLOG_ENABLED is not true',
      detail: null,
      isVercelCron,
    });
    return res.status(200).json({ success: true, skipped: true, reason: 'AUTOBLOG_ENABLED is not true' });
  }

  // Vercel Cron Jobs can automatically send `Authorization: Bearer <CRON_SECRET>`
  // when you define `CRON_SECRET` in the Vercel Environment Variables.
  // For backward compatibility we also support BLOG_CRON_SECRET.
  const expected = process.env.CRON_SECRET || process.env.BLOG_CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const key = String(req.query?.key || '');
  const hasValidSecret = expected ? (bearer === expected || key === expected) : false;

  // Require a secret if one is configured. This is the safest mode and works with Vercel Cron Jobs
  // when CRON_SECRET is set in your project settings.
  if (expected && !hasValidSecret) {
    await bestEffortLogCronRun({
      cronName: 'daily-blog',
      status: 'unauthorized',
      reason: 'invalid/missing cron secret',
      detail: `${String(req.headers.host || '')} ${String(req.method || '')} ${String(req.url || '')}`.trim() || null,
      isVercelCron,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // If no secret is configured, allow only if Vercel explicitly marks it as a cron.
  if (!expected && !isVercelCron) {
    await bestEffortLogCronRun({
      cronName: 'daily-blog',
      status: 'unauthorized',
      reason: 'no secret configured and missing x-vercel-cron header',
      detail: `${String(req.headers.host || '')} ${String(req.method || '')} ${String(req.url || '')}`.trim() || null,
      isVercelCron,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    await bestEffortLogCronRun({
      cronName: 'daily-blog',
      status: 'error',
      reason: 'GROQ_API_KEY is not configured',
      detail: null,
      isVercelCron,
    });
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  const client = await pool.connect();
  try {
    // Run log table (helps verify if Vercel cron is actually firing).
    await client.query(`
      CREATE TABLE IF NOT EXISTS cron_runs (
        id TEXT PRIMARY KEY,
        cron_name TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        detail TEXT,
        is_vercel_cron BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const runId = Date.now().toString();
    const logRun = async (status, reason, detail) => {
      try {
        await client.query(
          `INSERT INTO cron_runs (id, cron_name, status, reason, detail, is_vercel_cron)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [runId, 'daily-blog', String(status), reason ? String(reason) : null, detail ? String(detail) : null, Boolean(isVercelCron)]
        );
      } catch {
        // no-op
      }
    };

    await client.query(`
      CREATE TABLE IF NOT EXISTS autoblog_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_row_autoblog_config CHECK (id = 1)
      )
    `);
    await client.query('INSERT INTO autoblog_config (id, enabled) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING');

    const cfg = await client.query('SELECT enabled FROM autoblog_config WHERE id=1');
    const isEnabledInDb = Boolean(cfg.rows?.[0]?.enabled);
    if (!isEnabledInDb) {
      await logRun('skipped', 'autoblog is disabled', null);
      return res.status(200).json({ success: true, skipped: true, reason: 'autoblog is disabled' });
    }

    const existing = await client.query(
      `SELECT id FROM blog_posts WHERE tags @> ARRAY['daily']::text[] AND created_at::date = CURRENT_DATE LIMIT 1`
    );
    if (existing.rows.length > 0) {
      await logRun('skipped', 'already posted today', String(existing.rows[0].id));
      return res.status(200).json({ success: true, skipped: true, id: existing.rows[0].id });
    }

    const newsItems = await fetchNewsItems('funding grants loans opportunities technology health agriculture education energy manufacturing SMEs');
    const newsContext = newsItems
      .map((i, idx) => `${idx + 1}. ${i.title}${i.pubDate ? ` (${i.pubDate})` : ''} - ${i.link}`)
      .join('\n');

    const systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
Write an authoritative, human-sounding 650-900 word article in HTML format.

  TITLE RULE:
  - The first <h2> is the title. Do NOT include any date in the title.

CRITICAL CONTENT RULES:
1. NEVER use em dashes (—). Use commas, colons, or periods instead.
2. AVOID generic AI openings or conclusions.
2b. Do NOT include a "Conclusion" section or wrap-up paragraph. End with concrete next steps.
3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
4. SOUND like a person, not a textbook. Be strategic and actionable.
5. LINKS: Do NOT include raw URLs in the body. Do NOT add a Sources section or citations.
6. AVOID too much use of Additionally
7. FORMAT: Use <h2>, <h3>, <p>, <strong>, <ul>, <li>, and <a> tags only.`;

    const userPrompt = `Write today's Nigeria Funding & Opportunities Briefing.\n\nCover a mix of sectors where funding is needed (examples: technology, healthcare, agriculture, education, manufacturing, clean energy, creative economy).\n\nInclude:\n- 3-5 practical moves readers can take today\n- A short section on avoiding scams\n- Clear next steps\n\nTopic direction: fresh opportunities (grants/loans/accelerators/market programs) and policy-related updates (if relevant).`;

    const messages = [
      { role: 'system', content: systemInstruction },
      ...(newsContext
        ? [{ role: 'user', content: `Use these recent headlines and links as context (do not invent facts beyond them):\n${newsContext}` }]
        : []),
      { role: 'user', content: userPrompt }
    ];

    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const aiRes = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.75
      })
    });

    if (!aiRes.ok) {
      const msg = await aiRes.text().catch(() => '');
      throw new Error(`Groq API error: ${aiRes.status} ${msg}`);
    }

    const data = await aiRes.json();
    const html = data.choices?.[0]?.message?.content || '';
    const extractedTitle = extractTitleFromHtml(html) || '';
    const title = stripDatesFromTitle(extractedTitle) || 'Nigeria Funding & Opportunities Briefing';

    const image = await fetchUnsplashImage(`${title} Nigeria business`);

    const sourcesHtml = buildSourcesHtml(newsItems);
    const finalHtml = sourcesHtml && !String(html).includes('<h3>Sources</h3>')
      ? `${html}\n${sourcesHtml}`
      : html;

    const id = Date.now().toString();
    const author = 'Grantify Editorial';
    const authorRole = 'Editor';
    const category = 'Grants';
    const tags = ['daily', 'nigeria', 'funding'];

    await client.query(
      `INSERT INTO blog_posts (id, title, content, author, author_role, category, image, tags, source_name, source_url, likes, loves, claps, views, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)`,
      [
        id,
        title,
        finalHtml,
        author,
        authorRole,
        category,
        image || '',
        tags,
        newsItems.length ? 'Google News (RSS)' : '',
        newsItems.length
          ? 'https://news.google.com/rss/search?q=funding%20grants%20loans%20opportunities%20technology%20health%20agriculture%20education%20energy%20manufacturing%20SMEs%20Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
          : '',
        Math.floor(12 + Math.random() * 64),
        Math.floor(6 + Math.random() * 28),
        Math.floor(3 + Math.random() * 18),
        Math.floor(120 + Math.random() * 900)
      ]
    );

    await logRun('success', 'posted', id);
    return res.status(200).json({ success: true, id, title, sourcesCount: newsItems.length });
  } catch (e) {
    console.error('daily-blog cron error:', e);
    try {
      // best-effort log
      const runId = Date.now().toString();
      await client.query(
        `INSERT INTO cron_runs (id, cron_name, status, reason, detail, is_vercel_cron)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [runId, 'daily-blog', 'error', 'exception', e instanceof Error ? e.message : String(e), Boolean(isVercelCron)]
      );
    } catch {
      // no-op
    }
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  } finally {
    client.release();
  }
}
