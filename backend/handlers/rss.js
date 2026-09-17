// Dynamic RSS 2.0 Feed Generator
// Route: /rss.xml or /feed.xml

import pool from '../db.js';

const escapeXml = (unsafe = '') => {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const stripHtml = (html = '') => {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const baseUrl = 'https://grantify.help';
  const nowUtc = new Date().toUTCString();

  let posts = [];
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, title, category, author, content, created_at, updated_at FROM blog_posts ORDER BY id DESC LIMIT 30'
      );
      posts = result.rows || [];
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('RSS DB error:', err);
  }

  const items = posts
    .map((post) => {
      const slug = makeBlogSlug(post.title, post.id);
      const postUrl = `${baseUrl}/blog/${slug}`;
      const pubDate = new Date(post.created_at || post.updated_at || Date.now()).toUTCString();
      const rawSnippet = stripHtml(post.content || '');
      const cleanSnippet = rawSnippet.length > 300 ? `${rawSnippet.slice(0, 300)}...` : rawSnippet;

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(post.category || 'Funding Intelligence')}</category>
      <author>editorial@grantify.help (${escapeXml(post.author || 'Grantify Team')})</author>
      <description>${escapeXml(cleanSnippet || 'Verified grant and SME capital alert on Grantify.')}</description>
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Grantify - Verified SME Grants, Capital Alerts &amp; Funding Intelligence</title>
    <link>${baseUrl}</link>
    <description>Daily intelligence on verified non-dilutive grants, BOI/SMEDAN intervention funding, licensed loan apps, and Nigerian MSME opportunities.</description>
    <language>en-ng</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return res.status(200).send(rss);
}
