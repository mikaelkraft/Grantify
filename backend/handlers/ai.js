// Handler: /api/ai

import pool from '../db.js';

const CACHE_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;
const RATE_LIMIT_MAX_EXTERNAL_FETCHES = 6;

const cache = new Map();
const ipBucket = new Map();

const getClientIp = (req) => {
  const xf = String(req?.headers?.['x-forwarded-for'] || '').trim();
  if (xf) return xf.split(',')[0].trim();
  return String(req?.socket?.remoteAddress || req?.connection?.remoteAddress || '').trim() || 'unknown';
};

const getCache = (key) => {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return v.value;
};

const setCache = (key, value) => {
  cache.set(key, { at: Date.now(), value });
};

const canFetchExternal = (req) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const b = ipBucket.get(ip);
  if (!b || now - b.start > RATE_LIMIT_WINDOW_MS) {
    ipBucket.set(ip, { start: now, count: 1 });
    return true;
  }
  if (b.count >= RATE_LIMIT_MAX_EXTERNAL_FETCHES) return false;
  b.count += 1;
  return true;
};

const normalizeSources = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && typeof i.title === 'string' && typeof i.link === 'string')
    .map((i) => ({
      title: String(i.title).replace(/\s+/g, ' ').trim(),
      link: String(i.link).trim(),
      pubDate: i.pubDate ? String(i.pubDate).trim() : ''
    }))
    .filter((i) => i.title && i.link)
    .slice(0, 8);
};

const fetchNewsContext = async (query, { regionHint } = {}) => {
  const q = `${String(query || '').trim()} ${regionHint || 'Nigeria'}`.trim();
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`;
  const res = await fetch(url, { headers: { 'User-Agent': 'GrantifyBot/1.0' } });
  if (!res.ok) return { items: [], contextText: '' };
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

  if (items.length === 0) return { items: [], contextText: '' };
  const contextText = items
    .map((i, idx) => `${idx + 1}. ${i.title}${i.pubDate ? ` (${i.pubDate})` : ''} - ${i.link}`)
    .join('\n');

  return { items, contextText };
};

const fetchDuckDuckGoContext = async (query) => {
  const q = String(query || '').trim();
  if (!q) return { items: [], contextText: '' };

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'GrantifyBot/1.0' } });
    if (!res.ok) return { items: [], contextText: '' };
    const data = await res.json();

    const items = [];
    const abstractText = String(data?.AbstractText || '').trim();
    const abstractUrl = String(data?.AbstractURL || '').trim();
    if (abstractText) {
      items.push({ title: abstractText.slice(0, 120) + (abstractText.length > 120 ? '…' : ''), link: abstractUrl || '' });
    }

    const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
    for (const r of related) {
      if (items.length >= 6) break;
      if (r && typeof r.Text === 'string' && typeof r.FirstURL === 'string') {
        items.push({ title: r.Text, link: r.FirstURL });
      } else if (r && Array.isArray(r.Topics)) {
        for (const t of r.Topics) {
          if (items.length >= 6) break;
          if (t && typeof t.Text === 'string' && typeof t.FirstURL === 'string') {
            items.push({ title: t.Text, link: t.FirstURL });
          }
        }
      }
    }

    const contextText = items
      .filter(i => i.title && i.link)
      .slice(0, 6)
      .map((i, idx) => `${idx + 1}. ${String(i.title).replace(/\s+/g, ' ').trim()} - ${String(i.link).trim()}`)
      .join('\n');

    return { items, contextText };
  } catch {
    return { items: [], contextText: '' };
  }
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

const makeBlogSlug = (title, id) => `${slugifyTitle(title)}~${encodeURIComponent(String(id))}`;

const buildGrantifyLocalContext = async () => {
  // Best-effort. If tables don't exist yet, just return empty context.
  const client = await pool.connect();
  try {
    const ctx = [];

    try {
      const posts = await client.query(
        'SELECT id, title, category, created_at FROM blog_posts ORDER BY created_at DESC LIMIT 5'
      );
      if (posts.rows?.length) {
        const lines = posts.rows.map((r, i) => {
          const href = `/blog/${makeBlogSlug(r.title, r.id)}`;
          const cat = String(r.category || '').trim();
          const title = String(r.title || '').trim();
          return `${i + 1}. <a href="${href}">${title || 'Untitled post'}</a>${cat ? ` (${cat})` : ''}`;
        });
        ctx.push(`Recent Grantify community posts:\n${lines.join('\n')}`);
      }
    } catch {
      // ignore
    }

    try {
      const providers = await client.query(
        `SELECT id, name, website, play_store_url, rating, tag, is_recommended
         FROM loan_providers
         WHERE is_recommended IS TRUE
         ORDER BY rating DESC NULLS LAST, id ASC
         LIMIT 5`
      );
      if (providers.rows?.length) {
        const lines = providers.rows.map((r, i) => {
          const name = String(r.name || '').trim() || 'Loan provider';
          const site = String(r.website || '').trim();
          const rating = r.rating !== null && r.rating !== undefined ? Number(r.rating) : null;
          const ratingText = Number.isFinite(rating) && rating ? ` ⭐ ${rating.toFixed(1)}` : '';
          const link = site && /^https?:\/\//i.test(site) ? `<a href="${site}">${name}</a>` : name;
          return `${i + 1}. ${link}${ratingText}`;
        });
        ctx.push(`Recommended loan providers on Grantify (/loan-providers):\n${lines.join('\n')}`);
      }
    } catch {
      // ignore
    }

    return ctx.length ? ctx.join('\n\n') : '';
  } finally {
    client.release();
  }
};

const postProcessAnchors = (text) => {
  const s = String(text || '');
  // If the model outputs <a href="...">https://...</a>, replace anchor text with hostname.
  return s.replace(/(<a\s+[^>]*href="([^"]+)"[^>]*>)(https?:\/\/[^<]+)(<\/a>)/gi, (m, open, href, inner, close) => {
    try {
      const u = new URL(href);
      return `${open}${u.hostname}${close}`;
    } catch {
      return m;
    }
  });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, type, history, useSearch } = req.body || {};
  const groqKey = process.env.GROQ_API_KEY;

  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

  if (!groqKey) {
    if (type === 'blog') {
      return res.status(200).json({
        content: `<h2>${prompt}</h2><p>This is a human-optimized article about <strong>${prompt}</strong>. It avoids common AI traits and focuses on the Nigerian business context. To enable live generation, add GROQ_API_KEY to the environment.</p>`
      });
    }
    return res.status(200).json({
      text: `Hi, I'm your Grantify Concierge on https://grantify.help. Live AI responses are currently search-based on this deployment. You can still browse the Community Blog and the Loan Providers & Reviews pages, and I can guide you on what to check next.`
    });
  }

  try {
    let systemInstruction = '';
    let userPrompt = prompt;
    let newsContext = '';
    let webContext = '';
    let sources = [];
    let localContext = '';

    const promptLower = String(prompt || '').toLowerCase();
    const wantsSourcesExplicitly = /\b(source|sources|reference|references|cite|citation|citations|links?)\b/.test(promptLower);
    const looksLikeGrantLinking = /\b(grant|grants|funding|apply|application|eligib|deadline|portal|link)\b/.test(promptLower);
    const includeSources = Boolean(req.body?.includeSources) || wantsSourcesExplicitly;
    const includeSourcesAuto = Boolean(useSearch) && looksLikeGrantLinking;
    const includeSourcesEffective = includeSources || includeSourcesAuto;

    const nowIso = new Date().toISOString();

    if (type === 'blog') {
      systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
      Write an authoritative, human-sounding 600-word article in HTML format.

      CRITICAL CONTENT RULES:
      1. NEVER use em dashes (—). Use commas, colons, or periods instead.
      2. AVOID generic AI openings or conclusions.
      2b. Do NOT include a "Conclusion" section or wrap-up paragraph. End with concrete next steps.
      3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
      4. SOUND like a person, not a textbook. Be strategic and actionable.
      5. LINKS: Do NOT include raw URLs. Only include links if the editor explicitly requested them. If you must link, use named anchors (descriptive link text).
      6. AVOID too much use of Additionally
      7. Do NOT add a "Sources" section or citations in the article body.
      8. FORMAT: Use <h2>, <h3>, <h4>, <small>, <preformatted>, <p>, <strong>, <ul>, <li>, and <a> tags only.`;

      userPrompt = `Topic: "${prompt}". Write a deep-dive strategy article for a Nigerian audience.

    Cover relevant angles across sectors when appropriate (examples: technology, healthcare, agriculture, education, energy, manufacturing, creative economy).
    Keep it practical and action-oriented, with clear next steps.`;

      if (useSearch) {
        const cacheKey = `news:${String(prompt || '').trim().toLowerCase()}`;
        const ddgKey = `blogDdg:${String(prompt || '').trim().toLowerCase()}`;
        const cached = getCache(cacheKey);
        const cachedDdg = getCache(ddgKey);
        if (cached) {
          sources = cached.items;
          newsContext = cached.contextText;
        } else if (canFetchExternal(req)) {
          try {
            const { items, contextText } = await fetchNewsContext(prompt);
            sources = items;
            newsContext = contextText;
            setCache(cacheKey, { items, contextText });
          } catch {
            newsContext = '';
            sources = [];
          }
        }

        if (cachedDdg) {
          webContext = cachedDdg.contextText;
        } else if (canFetchExternal(req)) {
          try {
            const ddg = await fetchDuckDuckGoContext(prompt);
            webContext = ddg.contextText;
            setCache(ddgKey, { contextText: ddg.contextText, items: ddg.items });
          } catch {
            webContext = '';
          }
        }
      }
    } else {
      try {
        localContext = await buildGrantifyLocalContext();
      } catch {
        localContext = '';
      }

      systemInstruction = `You are the Grantify Concierge, embedded inside Grantify (https://grantify.help).

      Your job: help users navigate Grantify's on-site content (Community Blog posts, Loan Providers & Reviews) and guide them to reputable Nigeria-focused grants and loan options.

      STYLE RULES:
      - No em dashes (—). Use commas, colons, or periods.
      - Be concise and practical. Ask at most 1 clarifying question when needed.
      - Be resolute: when you have enough info, give a direct answer. Do not hedge.
      - Do NOT say you are a "text-based assistant" or that you're on "no website". You are on Grantify.
      - Do NOT hedge with "I'm not sure" if you were given fresh context. Only hedge when truly missing context.

      LINK RULES:
      - Never show raw URLs as visible text.
      - When linking, use: <a href="...">descriptive text</a>.
      - Max 2 links per message.
      - Only include internal Grantify links when the user asked where to click or asked you to reference on-site content.
      - Do not include external links unless explicitly requested.

      CURRENT DATE/TIME (server): ${nowIso}

      ${localContext ? `ON-SITE INDEX (use this to reference what exists on Grantify):\n${localContext}` : ''}

      If you are provided with headlines/links or web results, treat it as current information. Do not claim you cannot access current data or that your training is "cut off".

      FACTS:
      - Never invent specific figures, dates, approval claims, or provider policies.
      - Answer straightforwardly. Do not announce that you fetched fresh context.
      - Use the provided web context to stay current, but do not list sources unless asked.`;

      if (useSearch) {
        const promptKey = String(prompt || '').trim().toLowerCase();
        const newsKey = `chatNews:${promptKey}`;
        const ddgKey = `chatDdg:${promptKey}`;

        const cachedNews = getCache(newsKey);
        const cachedDdg = getCache(ddgKey);

        if (cachedNews) {
          sources = cachedNews.items;
          newsContext = cachedNews.contextText;
        }

        if (cachedDdg) {
          webContext = cachedDdg.contextText;
        }

        if ((!cachedNews || !cachedDdg) && canFetchExternal(req)) {
          try {
            if (!cachedNews) {
              const { items, contextText } = await fetchNewsContext(`${prompt} grants loans funding`, { regionHint: 'Nigeria' });
              sources = items;
              newsContext = contextText;
              setCache(newsKey, { items, contextText });
            }
            if (!cachedDdg) {
              const ddg = await fetchDuckDuckGoContext(prompt);
              webContext = ddg.contextText;
              setCache(ddgKey, { contextText: ddg.contextText, items: ddg.items });
            }

            // No extra instruction needed here; keep outputs concise.
          } catch {
            newsContext = '';
            webContext = '';
            sources = [];
          }
        }
      }
    }

    sources = normalizeSources(sources);

    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

    const normalizedHistory = Array.isArray(history)
      ? history
          .slice(-12)
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const includeContextBlocks = Boolean(useSearch) || type === 'blog' || wantsSourcesExplicitly || looksLikeGrantLinking;

    const messages = type === 'blog'
      ? [
          { role: 'system', content: systemInstruction },
          ...(newsContext
            ? [{ role: 'user', content: `Use these recent headlines and links as context (do not invent facts beyond them):\n${newsContext}` }]
            : []),
          ...(webContext
            ? [{ role: 'user', content: `Optional web context (quick lookup results). Use only if relevant and do not invent facts beyond it:\n${webContext}` }]
            : []),
          { role: 'user', content: userPrompt }
        ]
      : [
          { role: 'system', content: systemInstruction },
          ...(includeContextBlocks && newsContext
            ? [{ role: 'user', content: `Headlines + links (use only if relevant and do not invent facts beyond them):\n${newsContext}` }]
            : []),
          ...(includeContextBlocks && webContext
            ? [{ role: 'user', content: `Optional web context (quick lookup results). Use only if relevant and do not invent facts beyond them:\n${webContext}` }]
            : []),
          ...normalizedHistory,
          { role: 'user', content: userPrompt }
        ];

    const response = await fetch(groqUrl, {
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

    if (type === 'blog') {
      if (includeSourcesEffective) {
        const sourcesHtml = buildSourcesHtml(sources);
        const finalHtml = sourcesHtml && !String(aiText).includes('<h3>Sources</h3>')
          ? `${aiText}\n${sourcesHtml}`
          : aiText;
        return res.status(200).json({ content: finalHtml, sources });
      }
      return res.status(200).json({ content: aiText, sources });
    }

    return res.status(200).json({ text: aiText, sources });
  } catch (err) {
    console.error('AI handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
