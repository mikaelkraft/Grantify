// API: GET /api/share?type=blog&id=... - HTML preview with OG meta + redirect
import pool from './_db.js';

const escapeHtml = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const stripHtml = (html = '') => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const { type, id } = req.query || {};
  if (type !== 'blog' || !id) return res.status(400).send('Bad request');

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${proto}://${host}`;

  const defaultOg = `${baseUrl}/og-default.svg`;

  let title = 'Grantify';
  let description = 'Discover funding options and learn from community intelligence.';
  let image = defaultOg;

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT title, content, image FROM blog_posts WHERE id = $1', [id]);
    const row = result.rows[0];
    if (row) {
      title = row.title || title;
      description = stripHtml(row.content || '').slice(0, 160) || description;
      const rawImage = row.image ? String(row.image) : '';
      if (rawImage && !rawImage.startsWith('data:')) {
        image = rawImage.startsWith('http') ? rawImage : `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
      }
    }
  } catch (err) {
    console.error('Share API Error:', err);
  } finally {
    client.release();
  }

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const redirectTo = `/#/blog/${encodeURIComponent(String(id))}`;
  const canonical = `${baseUrl}/share/blog/${encodeURIComponent(String(id))}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} | Grantify</title>
  <link rel="canonical" href="${canonical}" />
  <meta name="description" content="${safeDescription}" />

  <meta property="og:site_name" content="Grantify" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />

  <meta http-equiv="refresh" content="0; url=${redirectTo}" />
</head>
<body>
  <noscript>
    <p>Redirecting… <a href="${redirectTo}">Open post</a></p>
  </noscript>
  <script>
    location.replace(${JSON.stringify(redirectTo)});
  </script>
</body>
</html>`);
}
