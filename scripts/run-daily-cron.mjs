const secret = String(process.env.BLOG_CRON_SECRET || '').trim();
if (!secret) {
  console.error('Missing BLOG_CRON_SECRET in environment.');
  process.exit(1);
}

const baseUrlFromEnv =
  process.env.CRON_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  '';

const baseUrl = String(baseUrlFromEnv || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');

if (!/^https?:\/\//i.test(baseUrl)) {
  console.error(`Invalid base URL: ${baseUrl}. Set CRON_BASE_URL (or VITE_API_URL) to a full http(s) URL.`);
  process.exit(1);
}

const url = `${baseUrl}/api/cron/daily-blog?key=${encodeURIComponent(secret)}`;

try {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      // Provide a friendly UA for logs.
      'User-Agent': 'GrantifyCronRunner/1.0'
    }
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    console.error(`Cron call failed: ${res.status} ${res.statusText}`);
    if (text) console.error(text);
    process.exit(1);
  }

  console.log(`Cron call OK: ${res.status}`);
  if (text) console.log(text);
} catch (err) {
  console.error('Cron call error:', err);
  process.exit(1);
}
