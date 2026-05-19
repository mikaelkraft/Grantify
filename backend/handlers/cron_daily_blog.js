// Handler: /api/cron/daily-blog

import pool from '../db.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ANGLES = [
  {
    key: 'sme-cashflow',
    label: 'SME cashflow and working capital without getting scammed',
    newsQuery: 'Nigeria SME working capital funding microfinance BOI CBN intervention'
  },
  {
    key: 'agri-value-chain',
    label: 'Agribusiness value chain funding, equipment, and off-take contracts',
    newsQuery: 'Nigeria agriculture funding grants loans equipment off-take contracts'
  },
  {
    key: 'women-youth',
    label: 'Women and youth founder opportunities plus practical application tactics',
    newsQuery: 'Nigeria women youth entrepreneurship funding grants accelerators'
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing scale-up: power costs, equipment financing, and export readiness',
    newsQuery: 'Nigeria manufacturing funding equipment financing export incentives'
  },
  {
    key: 'health-ed',
    label: 'Healthcare and education operators: growth capital and compliance moves',
    newsQuery: 'Nigeria healthcare education funding grants loans compliance'
  },
  {
    key: 'clean-energy',
    label: 'Clean energy and climate programs: solar, mini-grids, and impact capital',
    newsQuery: 'Nigeria clean energy climate funding solar mini-grid impact capital'
  },
  {
    key: 'creative-economy',
    label: 'Creative economy: monetization, IP, distribution, and brand partnerships',
    newsQuery: 'Nigeria creative economy funding film music fashion grants programs'
  },
  {
    key: 'tech-startups',
    label: 'Tech operators: B2B SaaS, product traction, and runway in a tight funding market',
    newsQuery: 'Nigeria startups technology funding venture capital accelerator seed'
  },
  {
    key: 'fintech-credit',
    label: 'Fintech, credit products, and merchant lending under Nigerian regulation',
    newsQuery: 'Nigeria fintech credit regulation CBN lending MSME'
  }
];

const STORY_SEEDS = [
  'A fashion entrepreneur in Yaba trying to stabilize cashflow after a viral week',
  'A rice mill operator in Kano balancing equipment repairs and working capital',
  'A pharmacy owner in Enugu navigating compliance costs and restocking cycles',
  'A small solar installer in Kaduna chasing large contracts with delayed payments',
  'A furniture maker in Aba struggling with generator costs and bulk orders',
  'A catering business in Ibadan trying to move from cash to invoices with SMEs',
  'A fish farmer in Ogun scaling feed supply and cold-chain logistics'
];

// Keep the "recent" window smaller than the number of available angles,
// so we always have at least one non-recent candidate to choose from.
const RECENT_ANGLE_WINDOW = Math.max(0, Math.min(5, Math.max(0, ANGLES.length - 1)));
const RECENT_SEED_WINDOW = Math.max(0, Math.min(4, Math.max(0, STORY_SEEDS.length - 1)));

const buildGroqMessages = ({ angleLabel, storySeed, recentTitles, newsContext }) => {
  const systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
  Write an authoritative, human-sounding 950-1400 word article in HTML format.

  TITLE RULE:
  - The first <h2> is the title. Do NOT include any date in the title.

CRITICAL CONTENT RULES:
1. NEVER use em dashes (—). Use commas, colons, or periods instead.
2. AVOID generic AI openings or conclusions.
2b. Do NOT include a "Conclusion" section or wrap-up paragraph. End with concrete next steps.
3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
4. SOUND like a person, not a textbook. Be strategic and actionable.
5. LINKS: Do NOT include raw external URLs in the body. Internal links are allowed only as relative links like /blog/<slug>.
  Do NOT add a Sources section or citations. We will append Sources separately.
6. AVOID too much use of Additionally
7. FORMAT: Use <h2>, <h3>, <p>, <strong>, <ul>, <li>, and <a> tags only.
8. PROFESSIONAL TONE: write like a newsroom + operator, not an ad.
9. SPECIFICITY: include at least 1 short Nigeria-specific mini example (2-4 sentences) to ground the piece.
10. STORYTELLING: Open with a 3-5 sentence narrative hook about a realistic operator (fictional, but plausible), then connect to the analysis.
11. FRESHNESS: Do not repeat story setup, sections, or titles from recent daily posts.`;

  const safeAngle = String(angleLabel || '').trim();
  const safeSeed = String(storySeed || '').trim();

  const titles = Array.isArray(recentTitles) ? recentTitles : [];
  const recentBlock = titles.length
    ? titles.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(none available)';

  const userPrompt = `Write a Nigeria Funding & Growth Briefing with this angle: ${safeAngle}.

Story seed (use this as the opening vignette, fictional but realistic): ${safeSeed}

Avoid repeating these recent daily post titles:
${recentBlock}

Structure:
- <h2> punchy title (no date)
- 1 narrative hook paragraph that starts with a real moment, then zooms out to the problem
- 4-6 <h3> sections with crisp subheads
- Include at least 2 short "micro-scenes" (1-2 sentences each) that make the advice feel lived-in
- A "Avoiding scams" section with concrete red flags
- A "What to do this week" section with 5-7 bullet next steps

Traffic + SEO:
- Use 2-3 natural anchor phrases that could link to related articles, do not include the links yourself.

Use the headlines context for timely specifics when possible, but do not invent facts.`;

  const messages = [
    { role: 'system', content: systemInstruction },
    ...(newsContext
      ? [{ role: 'user', content: `Use these recent headlines and links as context (do not invent facts beyond them):\n${newsContext}` }]
      : []),
    { role: 'user', content: userPrompt }
  ];

  return messages;
};

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

const requireValidAdmin = async (req) => {
  const session = parseAdminSession(req);
  if (!session?.id || !session?.passwordHash) return null;
  try {
    const res = await pool.query('SELECT id, password_hash FROM admin_users WHERE id = $1', [session.id]);
    const row = res.rows?.[0];
    if (!row) return null;
    if (String(row.password_hash) !== String(session.passwordHash)) return null;
    return session;
  } catch {
    return null;
  }
};

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

const buildUnsplashQuery = ({ title, newsItems }) => {
  const text = [title, ...(Array.isArray(newsItems) ? newsItems.map(i => i?.title).filter(Boolean) : [])]
    .map(v => String(v || ''))
    .join(' ')
    .toLowerCase();

  const has = (...needles) => needles.some(n => text.includes(String(n).toLowerCase()));

  const themes = [
    { when: () => has('agric', 'farm', 'rice', 'maize', 'cassava'), q: 'nigerian agriculture farmers' },
    { when: () => has('health', 'hospital', 'clinic', 'medical'), q: 'nigeria healthcare clinic' },
    { when: () => has('education', 'school', 'students', 'university'), q: 'nigeria education classroom' },
    { when: () => has('solar', 'renewable', 'energy', 'power'), q: 'nigeria renewable energy solar' },
    { when: () => has('manufactur', 'factory', 'industrial'), q: 'nigeria manufacturing factory' },
    { when: () => has('fintech', 'bank', 'cbn', 'loan', 'credit', 'microfinance'), q: 'nigeria finance fintech startup' },
    { when: () => has('startup', 'tech', 'software', 'ai', 'innovation'), q: 'nigeria tech startup entrepreneurs' },
    { when: () => has('women', 'female', 'girl'), q: 'nigerian women entrepreneurs' },
    { when: () => has('youth', 'students', 'graduates'), q: 'nigerian youth entrepreneurship' },
  ];

  const picked = themes.find(t => t.when());
  if (picked) return picked.q;

  const cleanedTitle = String(title || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\b(briefing|today|daily|nigeria|nigerian|funding|opportunities|update|updates)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const short = cleanedTitle.split(' ').slice(0, 6).join(' ').trim();
  return short ? `nigeria entrepreneurs ${short}` : 'nigeria entrepreneurs funding';
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

const resolveFinalUrl = async (url, { timeoutMs = 3000 } = {}) => {
  const s = String(url || '').trim();
  if (!s) return '';

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(s, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'GrantifyAutoblog/1.0 (+https://grantify.app)' },
    });
    return String(res?.url || s);
  } catch {
    return s;
  } finally {
    clearTimeout(t);
  }
};

const buildSourcesHtml = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const safeItems = items
    .filter((i) => i && typeof i.title === 'string' && typeof i.link === 'string')
    .slice(0, 2);
  if (safeItems.length === 0) return '';

  const resolvedItems = [];
  for (const i of safeItems) {
    const title = i.title.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const rawHref = String(i.link).replace(/"/g, '&quot;').trim();
    const href = /news\.google\.com/i.test(rawHref) ? await resolveFinalUrl(rawHref) : rawHref;
    resolvedItems.push({ title, href });
  }

  const listItems = resolvedItems
    .map((i) => `<li><a href="${i.href}" target="_blank" rel="noopener noreferrer">${i.title}</a></li>`)
    .join('');

  return `<h3>Sources</h3><ul>${listItems}</ul>`;
};

const stripLeadingH2 = (html) => {
  const s = String(html || '');
  return s.replace(/^\s*<h2\b[^>]*>[\s\S]*?<\/h2>\s*/i, '');
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

const slugifyTitle = (title) => {
  const input = String(title || '').trim();
  if (!input) return 'post';

  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const cleaned = ascii
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

  return cleaned || 'post';
};

const makeBlogSlug = (title, id) => {
  const slugPart = slugifyTitle(title);
  const idPart = encodeURIComponent(String(id));
  return `${slugPart}~${idPart}`;
};

const injectAlsoReadInline = (html, relatedPosts) => {
  const raw = String(html || '');
  const posts = Array.isArray(relatedPosts) ? relatedPosts.filter(Boolean) : [];
  if (!posts.length) return raw;

  const base = raw.replace(/<h3\b[^>]*>\s*(Related reads|Also read|Also reads)\s*<\/h3>\s*<ul>[\s\S]*?<\/ul>/i, '');

  const safeTitle = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

  const links = posts
    .slice(0, 3)
    .map((p) => ({
      href: `/blog/${makeBlogSlug(String(p.title || ''), String(p.id || ''))}`,
      title: safeTitle(p.title),
    }))
    .filter((l) => l.title && l.href);

  if (!links.length) return base;

  const paraRe = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  const paras = Array.from(base.matchAll(paraRe));
  if (paras.length === 0) {
    const tail = links
      .map((l) => `<p>&nbsp;&nbsp;<strong>Also read:</strong> <a href="${l.href}">${l.title}</a></p>`)
      .join('\n');
    return `${base}\n${tail}`;
  }

  // One link per paragraph, up to 3 placements.
  const maxPlacements = Math.min(3, links.length);
  const insertAfter = [];
  if (paras.length >= 6) {
    insertAfter.push(1, 3, 5);
  } else {
    for (let i = 0; i < Math.min(maxPlacements, paras.length); i += 1) insertAfter.push(i);
  }

  const insertSet = new Set(insertAfter.slice(0, maxPlacements));
  let out = '';
  let last = 0;
  let used = 0;

  for (let i = 0; i < paras.length; i += 1) {
    const m = paras[i];
    const start = m.index ?? 0;
    const end = start + String(m[0] || '').length;
    out += base.slice(last, end);
    last = end;

    if (insertSet.has(i) && used < maxPlacements) {
      const l = links[used];
      out += `\n<p>&nbsp;&nbsp;<strong>Also read:</strong> <a href="${l.href}">${l.title}</a></p>\n`;
      used += 1;
    }
  }

  out += base.slice(last);
  return out;
};

const deriveCategory = ({ angleKey, title }) => {
  const k = String(angleKey || '').trim();
  if (k === 'clean-energy') return 'Energy';
  if (k === 'agri-value-chain') return 'Agriculture';
  if (k === 'women-youth') return 'Women & Youth';
  if (k === 'manufacturing') return 'Manufacturing';
  if (k === 'health-ed') return 'Health & Education';
  if (k === 'creative-economy') return 'Creative Economy';
  if (k === 'tech-startups') return 'Technology';
  if (k === 'fintech-credit') return 'Finance';

  const t = String(title || '').toLowerCase();
  if (/(solar|mini-?grid|energy|power)/.test(t)) return 'Energy';
  if (/(agric|farm|rice|maize|cassava|livestock|fish)/.test(t)) return 'Agriculture';
  if (/(health|hospital|clinic|pharma|medical)/.test(t)) return 'Health';
  if (/(school|education|university|students)/.test(t)) return 'Education';
  if (/(fintech|bank|credit|loan|lending|microfinance)/.test(t)) return 'Finance';
  if (/(startup|tech|software|saas|ai|digital)/.test(t)) return 'Technology';
  if (/(factory|manufactur|export|industrial)/.test(t)) return 'Manufacturing';
  if (/(film|music|fashion|creative|media|brand)/.test(t)) return 'Creative Economy';
  return 'Funding';
};

const deriveTags = ({ angleKey, title, html, newsItems }) => {
  const tags = new Set();
  const t = String(title || '').toLowerCase();
  const body = String(html || '').replace(/<[^>]+>/g, ' ').toLowerCase();
  const news = Array.isArray(newsItems) ? newsItems.map((i) => String(i?.title || '')).join(' ').toLowerCase() : '';
  const text = `${t} ${body} ${news}`;

  // Always keep 1-2 stable anchors, but avoid the same 3 boring tags every time.
  tags.add('Nigeria');
  if (/(grant|grants|funding|opportunit)/.test(text)) tags.add('Funding');
  if (/(loan|credit|lending|facility)/.test(text)) tags.add('Loans');

  const addIf = (re, value) => { if (re.test(text)) tags.add(value); };
  addIf(/\b(sme|small business|msme|micro|enterprise)\b/, 'SME');
  addIf(/\b(cb n|cbn|boi|government|policy|regulation)\b/, 'Policy');
  addIf(/\b(scam|fraud|ponzi|fee)\b/, 'Scam Alerts');
  addIf(/\b(export|afcfta)\b/, 'Exports');
  addIf(/\b(impact|climate|esg)\b/, 'Impact');

  // Sectoral flavor.
  if (String(angleKey || '') === 'clean-energy') {
    tags.add('Energy');
    tags.add('Solar');
  }
  if (String(angleKey || '') === 'agri-value-chain') {
    tags.add('Agribusiness');
  }
  if (String(angleKey || '') === 'tech-startups') {
    tags.add('Technology');
    tags.add('Startups');
  }
  if (String(angleKey || '') === 'fintech-credit') {
    tags.add('Fintech');
  }
  if (String(angleKey || '') === 'women-youth') {
    tags.add('Women');
    tags.add('Youth');
  }
  if (String(angleKey || '') === 'manufacturing') {
    tags.add('Manufacturing');
  }
  if (String(angleKey || '') === 'health-ed') {
    tags.add('Healthcare');
    tags.add('Education');
  }
  if (String(angleKey || '') === 'creative-economy') {
    tags.add('Creative Economy');
  }

  // Keyword-based tags from the title (keeps it feeling different per day).
  const titleWords = String(title || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/g)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 8);
  for (const w of titleWords) {
    if (w.length < 5) continue;
    if (/^(nigeria|funding|opportunit|briefing|today|daily|growth|clean|energy)$/.test(w.toLowerCase())) continue;
    // Keep case nicer.
    tags.add(w.charAt(0).toUpperCase() + w.slice(1));
    if (tags.size >= 9) break;
  }

  return Array.from(tags).slice(0, 9);
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
  const method = String(req.method || '').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');

  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  const isManualAdmin = method === 'POST';

  if (isManualAdmin) {
    const admin = await requireValidAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  }

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
  if (!isManualAdmin && expected && !hasValidSecret) {
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
  if (!isManualAdmin && !expected && !isVercelCron) {
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

    const force = Boolean(req.body?.force) || String(req.query?.force || '').trim() === '1';

    const existing = await client.query(
      `SELECT id FROM blog_posts WHERE tags @> ARRAY['daily']::text[] AND created_at::date = CURRENT_DATE LIMIT 1`
    );
    if (existing.rows.length > 0 && !force) {
      await logRun('skipped', 'already posted today', String(existing.rows[0].id));
      return res.status(200).json({ success: true, skipped: true, reason: 'already posted today', id: existing.rows[0].id });
    }

    // Rotate angle/topic so we don't publish near-identical posts daily.
    await client.query(`
      CREATE TABLE IF NOT EXISTS autoblog_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        recent_angles TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_row_autoblog_state CHECK (id = 1)
      )
    `);
    try {
      await client.query('ALTER TABLE autoblog_state ADD COLUMN IF NOT EXISTS recent_story_seeds TEXT[] NOT NULL DEFAULT ARRAY[]::text[]');
    } catch {
      // no-op
    }
    await client.query('INSERT INTO autoblog_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING');

    const stateRes = await client.query('SELECT recent_angles, recent_story_seeds FROM autoblog_state WHERE id=1');
    const recentAnglesRaw = Array.isArray(stateRes.rows?.[0]?.recent_angles) ? stateRes.rows[0].recent_angles : [];
    const recentAnglesClean = recentAnglesRaw.map((s) => String(s || '').trim()).filter(Boolean);
    const recentAngles = RECENT_ANGLE_WINDOW > 0 ? recentAnglesClean.slice(0, RECENT_ANGLE_WINDOW) : [];
    const recentSet = new Set(recentAngles);

    const recentSeedsRaw = Array.isArray(stateRes.rows?.[0]?.recent_story_seeds) ? stateRes.rows[0].recent_story_seeds : [];
    const recentSeedsClean = recentSeedsRaw.map((s) => String(s || '').trim()).filter(Boolean);
    const recentSeeds = RECENT_SEED_WINDOW > 0 ? recentSeedsClean.slice(0, RECENT_SEED_WINDOW) : [];
    const seedSet = new Set(recentSeeds);
    const seedCandidates = STORY_SEEDS.filter((s) => !seedSet.has(s));
    const seedPickFrom = seedCandidates.length > 0 ? seedCandidates : STORY_SEEDS;
    const storySeed = seedPickFrom[Math.floor(Math.random() * seedPickFrom.length)];
    const nextSeeds = [storySeed, ...recentSeeds.filter((s) => String(s) !== String(storySeed))].slice(0, RECENT_SEED_WINDOW);

    const candidates = ANGLES.filter(a => !recentSet.has(a.key));
    const pickFrom = candidates.length > 0 ? candidates : ANGLES;
    const angle = pickFrom[Math.floor(Math.random() * pickFrom.length)];

    const nextRecent = [angle.key, ...recentAngles.filter((k) => String(k) !== String(angle.key))].slice(0, RECENT_ANGLE_WINDOW);
    await client.query('UPDATE autoblog_state SET recent_angles = $1, recent_story_seeds = $2, updated_at = CURRENT_TIMESTAMP WHERE id=1', [nextRecent, nextSeeds]);

    // Pull recent daily titles to discourage repetition.
    const recentTitleRes = await client.query(
      `SELECT title FROM blog_posts WHERE tags @> ARRAY['daily']::text[] ORDER BY created_at DESC LIMIT 10`
    );
    const recentTitles = (recentTitleRes.rows || [])
      .map((r) => String(r?.title || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 10);

    const newsItems = await fetchNewsItems(`${angle.newsQuery} funding grants loans opportunities`);
    const newsContext = newsItems
      .map((i, idx) => `${idx + 1}. ${i.title}${i.pubDate ? ` (${i.pubDate})` : ''} - ${i.link}`)
      .join('\n');

    const messages = buildGroqMessages({
      angleLabel: angle.label,
      storySeed,
      recentTitles,
      newsContext,
    });

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

    const id = Date.now().toString();

    const imageQuery = buildUnsplashQuery({ title, newsItems });
    const image = await fetchUnsplashImage(imageQuery);

    // Add internal linking block to drive recirculation.
    let related = [];
    try {
      const evergreenRes = await client.query(
        `SELECT id, title, category, created_at
         FROM blog_posts
         WHERE id <> $1
           AND NOT (tags @> ARRAY['daily']::text[])
         ORDER BY created_at DESC
         LIMIT 24`,
        [id]
      );
      const evergreenPool = Array.isArray(evergreenRes.rows) ? evergreenRes.rows : [];
      related = evergreenPool
        .filter((p) => Boolean(String(p?.title || '').trim()))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (related.length < 2) {
        const anyRes = await client.query(
          `SELECT id, title, category, created_at
           FROM blog_posts
           WHERE id <> $1
           ORDER BY created_at DESC
           LIMIT 24`,
          [id]
        );
        const anyPool = Array.isArray(anyRes.rows) ? anyRes.rows : [];
        related = anyPool
          .filter((p) => Boolean(String(p?.title || '').trim()))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
      }
    } catch {
      related = [];
    }

    const sourcesHtml = await buildSourcesHtml(newsItems);
    const htmlWithAlsoRead = injectAlsoReadInline(html, related);
    const cleanedHtml = stripLeadingH2(htmlWithAlsoRead);
    const finalHtml = sourcesHtml && !String(cleanedHtml).includes('<h3>Sources</h3>')
      ? `${cleanedHtml}\n${sourcesHtml}`
      : cleanedHtml;

    const author = 'Grantifier';
    const authorRole = 'Editor';
    const category = deriveCategory({ angleKey: angle.key, title });
    const tags = Array.from(new Set(['daily', ...deriveTags({ angleKey: angle.key, title, html: finalHtml, newsItems })]));

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
        '',
        '',
        Math.floor(12 + Math.random() * 64),
        Math.floor(6 + Math.random() * 28),
        Math.floor(3 + Math.random() * 18),
        Math.floor(120 + Math.random() * 900)
      ]
    );

    await logRun('success', force ? 'posted (forced)' : 'posted', id);
    return res.status(200).json({ success: true, id, title, sourcesCount: newsItems.length, forced: force });
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

const parseDryRunArgs = (argv) => {
  const args = {
    dryRun: false,
    force: false,
    outFile: null,
    json: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = String(argv[i] || '').trim();
    if (!token) continue;

    if (token === '--dry-run' || token === '--dryrun') {
      args.dryRun = true;
      continue;
    }
    if (token === '--force') {
      args.force = true;
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--out') {
      const next = argv[i + 1];
      if (next) {
        args.outFile = String(next);
        i += 1;
      }
      continue;
    }
  }

  return args;
};

const runDryRun = async ({ force, outFile, json }) => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('GROQ_API_KEY is not configured (needed for --dry-run).');
  }

  let client = null;
  try {
    client = await pool.connect();
  } catch {
    client = null;
  }

  try {
    // Best-effort reads for freshness (no writes in dry run).
    let recentTitles = [];
    let recentAngles = [];
    let recentSeeds = [];
    let alreadyPostedTodayId = null;

    if (client) {
      try {
        const existing = await client.query(
          `SELECT id FROM blog_posts WHERE tags @> ARRAY['daily']::text[] AND created_at::date = CURRENT_DATE LIMIT 1`
        );
        alreadyPostedTodayId = existing.rows?.[0]?.id ? String(existing.rows[0].id) : null;
      } catch {
        alreadyPostedTodayId = null;
      }

      try {
        const stateRes = await client.query('SELECT recent_angles, recent_story_seeds FROM autoblog_state WHERE id=1');
        const recentAnglesRaw = Array.isArray(stateRes.rows?.[0]?.recent_angles) ? stateRes.rows[0].recent_angles : [];
        const recentAnglesClean = recentAnglesRaw.map((s) => String(s || '').trim()).filter(Boolean);
        recentAngles = RECENT_ANGLE_WINDOW > 0 ? recentAnglesClean.slice(0, RECENT_ANGLE_WINDOW) : [];

        const recentSeedsRaw = Array.isArray(stateRes.rows?.[0]?.recent_story_seeds) ? stateRes.rows[0].recent_story_seeds : [];
        const recentSeedsClean = recentSeedsRaw.map((s) => String(s || '').trim()).filter(Boolean);
        recentSeeds = RECENT_SEED_WINDOW > 0 ? recentSeedsClean.slice(0, RECENT_SEED_WINDOW) : [];
      } catch {
        recentAngles = [];
        recentSeeds = [];
      }

      try {
        const recentTitleRes = await client.query(
          `SELECT title FROM blog_posts WHERE tags @> ARRAY['daily']::text[] ORDER BY created_at DESC LIMIT 10`
        );
        recentTitles = (recentTitleRes.rows || [])
          .map((r) => String(r?.title || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .slice(0, 10);
      } catch {
        recentTitles = [];
      }
    }

    const recentSet = new Set(recentAngles);
    const candidates = ANGLES.filter(a => !recentSet.has(a.key));
    const pickFrom = candidates.length > 0 ? candidates : ANGLES;
    const angle = pickFrom[Math.floor(Math.random() * pickFrom.length)];

    const seedSet = new Set(recentSeeds);
    const seedCandidates = STORY_SEEDS.filter((s) => !seedSet.has(s));
    const seedPickFrom = seedCandidates.length > 0 ? seedCandidates : STORY_SEEDS;
    const storySeed = seedPickFrom[Math.floor(Math.random() * seedPickFrom.length)];

    const newsItems = await fetchNewsItems(`${angle.newsQuery} funding grants loans opportunities`);
    const newsContext = newsItems
      .map((i, idx) => `${idx + 1}. ${i.title}${i.pubDate ? ` (${i.pubDate})` : ''} - ${i.link}`)
      .join('\n');

    const messages = buildGroqMessages({
      angleLabel: angle.label,
      storySeed,
      recentTitles,
      newsContext,
    });

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
    const id = Date.now().toString();

    const imageQuery = buildUnsplashQuery({ title, newsItems });
    const image = await fetchUnsplashImage(imageQuery);

    // Related reads selection (read-only).
    let related = [];
    if (client) {
      try {
        const evergreenRes = await client.query(
          `SELECT id, title, category, created_at
           FROM blog_posts
           WHERE id <> $1
             AND NOT (tags @> ARRAY['daily']::text[])
           ORDER BY created_at DESC
           LIMIT 24`,
          [id]
        );
        const evergreenPool = Array.isArray(evergreenRes.rows) ? evergreenRes.rows : [];
        related = evergreenPool
          .filter((p) => Boolean(String(p?.title || '').trim()))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        if (related.length < 2) {
          const anyRes = await client.query(
            `SELECT id, title, category, created_at
             FROM blog_posts
             WHERE id <> $1
             ORDER BY created_at DESC
             LIMIT 24`,
            [id]
          );
          const anyPool = Array.isArray(anyRes.rows) ? anyRes.rows : [];
          related = anyPool
            .filter((p) => Boolean(String(p?.title || '').trim()))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        }
      } catch {
        related = [];
      }
    }

    const sourcesHtml = await buildSourcesHtml(newsItems);
    const htmlWithAlsoRead = injectAlsoReadInline(html, related);
    const cleanedHtml = stripLeadingH2(htmlWithAlsoRead);
    const finalHtml = sourcesHtml && !String(cleanedHtml).includes('<h3>Sources</h3>')
      ? `${cleanedHtml}\n${sourcesHtml}`
      : cleanedHtml;

    const payload = {
      dryRun: true,
      force: Boolean(force),
      note: alreadyPostedTodayId && !force ? `A daily post already exists today: ${alreadyPostedTodayId}` : null,
      id,
      title,
      slug: makeBlogSlug(title, id),
      image: image || '',
      sourcesCount: newsItems.length,
      relatedCount: related.length,
      hasAlsoReadInline: String(finalHtml).toLowerCase().includes('also read'),
      htmlLength: String(finalHtml).length,
      outFile: outFile ? String(outFile) : null,
    };

    if (outFile) {
      const outPath = path.resolve(process.cwd(), outFile);
      await fs.writeFile(outPath, finalHtml, 'utf8');
      payload.outFile = outPath;
    }

    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(`DRY RUN: ${payload.title}`);
      if (payload.note) console.log(`Note: ${payload.note}`);
      console.log(`Slug: ${payload.slug}`);
      console.log(`Image: ${payload.image || '(none)'}`);
      console.log(`Sources: ${payload.sourcesCount} | Related: ${payload.relatedCount} | HTML chars: ${payload.htmlLength}`);
      if (payload.outFile) console.log(`Wrote HTML: ${payload.outFile}`);
      const snippet = String(finalHtml).slice(0, 800);
      console.log('\n--- HTML snippet (first 800 chars) ---\n');
      console.log(snippet);
      if (String(finalHtml).length > 800) console.log('\n... (truncated)');
    }

    return payload;
  } finally {
    if (client) client.release();
  }
};

const isCliEntrypoint = (() => {
  try {
    const self = fileURLToPath(import.meta.url);
    return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(self);
  } catch {
    return false;
  }
})();

if (isCliEntrypoint) {
  const args = parseDryRunArgs(process.argv);
  if (!args.dryRun) {
    console.error('Usage: node --env-file=.env backend/handlers/cron_daily_blog.js --dry-run [--force] [--out <file>] [--json]');
    process.exitCode = 1;
  } else {
    runDryRun(args).catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
  }
}
