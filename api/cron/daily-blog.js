// API: /api/cron/daily-blog
// Generates and publishes a daily blog post.
// Intended to be called by Vercel Cron (or a scheduler calling this endpoint).

import pool from '../_db.js';

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
    .slice(0, 8);
  if (safeItems.length === 0) return '';

  const listItems = safeItems
    .map((i) => {
      const title = i.title.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
      const href = i.link.replace(/"/g, '&quot;').trim();
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

export default async function handler(req, res) {
  // Allow GET for cron schedulers.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (String(process.env.AUTOBLOG_ENABLED || '').toLowerCase() !== 'true') {
    return res.status(200).json({ success: true, skipped: true, reason: 'AUTOBLOG_ENABLED is not true' });
  }

  // Vercel Cron calls include an x-vercel-cron header. We allow that.
  const isVercelCron = Boolean(req.headers['x-vercel-cron']);

  // Optional manual trigger secret (for local testing / one-off runs)
  const expected = process.env.BLOG_CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const key = String(req.query?.key || '');
  const hasValidSecret = expected ? (bearer === expected || key === expected) : false;

  if (!isVercelCron && !hasValidSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  const client = await pool.connect();
  try {
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10);

    // Prevent duplicate daily posts.
    const existing = await client.query(
      `SELECT id FROM blog_posts WHERE tags @> ARRAY['daily']::text[] AND created_at::date = CURRENT_DATE LIMIT 1`
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ success: true, skipped: true, id: existing.rows[0].id });
    }

    const newsItems = await fetchNewsItems('SME grants loans funding entrepreneurship');
    const newsContext = newsItems
      .map((i, idx) => `${idx + 1}. ${i.title}${i.pubDate ? ` (${i.pubDate})` : ''} - ${i.link}`)
      .join('\n');

    const systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
  Write an authoritative, human-sounding 650-900 word article in HTML format.

  CRITICAL CONTENT RULES:
  1. NEVER use em dashes (—). Use commas, colons, or periods instead.
  2. AVOID generic AI openings or conclusions.
  3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
  4. SOUND like a person, not a textbook. Be strategic and actionable.
  5. LINKS: Use named anchors (descriptive link text). Do NOT show raw URLs in the body.
  6. FORMAT: Use <h2>, <h3>, <p>, <strong>, <ul>, <li>, and <a> tags only.`;

    const userPrompt = `Write today's (\"${isoDate}\") Nigeria Funding & Grants Briefing for entrepreneurs.\n\nInclude:\n- 3-5 practical moves founders can take today\n- A short section on avoiding scams\n- Clear next steps\n\nTopic direction: fresh grant/loan opportunities and policy-related updates (if relevant).`;

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
    const title = extractTitleFromHtml(html) || `Nigeria Funding Briefing (${isoDate})`;

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
        '',
        tags,
        newsItems.length ? 'Google News (RSS)' : '',
        newsItems.length
          ? 'https://news.google.com/rss/search?q=SME%20grants%20loans%20funding%20entrepreneurship%20Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
          : '',
        Math.floor(12 + Math.random() * 64),
        Math.floor(6 + Math.random() * 28),
        Math.floor(3 + Math.random() * 18),
        Math.floor(120 + Math.random() * 900)
      ]
    );

    return res.status(200).json({ success: true, id, title, sourcesCount: newsItems.length });
  } catch (e) {
    console.error('daily-blog cron error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  } finally {
    client.release();
  }
}
