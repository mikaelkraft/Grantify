// Dynamic XML Sitemap Generator
// Route: /sitemap.xml or /api/sitemap

import pool from '../db.js';

const escapeXml = (unsafe = '') => {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

const NIGERIAN_STATES = [
  'abia', 'adamawa', 'akwa-ibom', 'anambra', 'bauchi', 'bayelsa', 'benue', 'borno',
  'cross-river', 'delta', 'ebonyi', 'edo', 'ekiti', 'enugu', 'fct-abuja', 'gombe',
  'imo', 'jigawa', 'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 'kwara', 'lagos',
  'nasarawa', 'niger', 'ogun', 'ondo', 'osun', 'oyo', 'plateau', 'rivers', 'sokoto',
  'taraba', 'yobe', 'zamfara'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const baseUrl = 'https://grantify.help';
  const now = new Date().toISOString().split('T')[0];

  const urls = [
    { loc: `${baseUrl}/`, lastmod: now, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/blog`, lastmod: now, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/loan-providers`, lastmod: now, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/pitch`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/quiz`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/sponsor`, lastmod: now, changefreq: 'monthly', priority: '0.7' },
    { loc: `${baseUrl}/contact`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
    { loc: `${baseUrl}/terms`, lastmod: now, changefreq: 'monthly', priority: '0.4' },
    { loc: `${baseUrl}/privacy`, lastmod: now, changefreq: 'monthly', priority: '0.4' },
  ];

  // Add 36 Nigerian States + FCT CAC Funding Registries
  for (const state of NIGERIAN_STATES) {
    urls.push({
      loc: `${baseUrl}/grants/${state}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.85'
    });
  }

  // Fetch live blog posts from database
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, title, updated_at, created_at FROM blog_posts ORDER BY id DESC'
      );

      for (const row of result.rows) {
        if (!row.id || !row.title) continue;
        const slug = makeBlogSlug(row.title, row.id);
        const lastmodDate = row.updated_at || row.created_at || now;
        const formattedDate = new Date(lastmodDate).toISOString().split('T')[0];

        urls.push({
          loc: `${baseUrl}/blog/${slug}`,
          lastmod: formattedDate,
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Sitemap DB query error, using static routes:', err);
  }

  const xmlEntries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

  return res.status(200).send(xml);
}
