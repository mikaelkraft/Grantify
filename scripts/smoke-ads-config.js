#!/usr/bin/env node
/**
 * Smoke test: Ads config endpoint
 *
 * Usage:
 *   node scripts/smoke-ads-config.js https://grantify.help
 *   node scripts/smoke-ads-config.js http://localhost:3000
 *   API_URL=https://grantify.help node scripts/smoke-ads-config.js
 */

const base = (process.argv[2] || process.env.API_URL || '').trim();

if (!base) {
  console.error('Missing base URL. Example: node scripts/smoke-ads-config.js https://grantify.help');
  process.exit(2);
}

const origin = base.replace(/\/$/, '');
const url = `${origin}/api/config?type=ads`;

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) out[k] = obj && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : undefined;
  return out;
};

(async () => {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    const elapsedMs = Date.now() - started;
    const cacheControl = res.headers.get('cache-control') || '';
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
      const text = await res.text();
      throw new Error(
        `Expected JSON but got content-type=${contentType}. First 200 chars: ${String(text || '').slice(0, 200)}`
      );
    }

    const json = await res.json();
    const fields = ['head', 'header', 'body', 'sidebar', 'footer', 'promo1Link', 'promo1Text', 'promo2Link', 'promo2Text'];
    const subset = pick(json, fields);

    const slotSummary = {
      hasHead: Boolean(String(json?.head || '').trim()),
      hasHeader: Boolean(String(json?.header || '').trim()),
      hasBody: Boolean(String(json?.body || '').trim()),
      hasSidebar: Boolean(String(json?.sidebar || '').trim()),
      hasFooter: Boolean(String(json?.footer || '').trim())
    };

    // Minimal checks for AdSense unit shape.
    const body = String(json?.body || '');
    const footer = String(json?.footer || '');
    const hasAdsByGoogleUnit =
      /class\s*=\s*['\"]adsbygoogle['\"]/i.test(body) || /class\s*=\s*['\"]adsbygoogle['\"]/i.test(footer);
    const hasAdClient =
      /data-ad-client\s*=\s*['\"]ca-pub-/i.test(body) || /data-ad-client\s*=\s*['\"]ca-pub-/i.test(footer);

    console.log('OK ads config fetched');
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Time: ${elapsedMs}ms`);
    console.log(`Cache-Control: ${cacheControl || '(none)'}`);
    console.log('Slots:', slotSummary);

    // Print only lengths (avoid dumping raw HTML/scripts into logs)
    const lengths = {};
    for (const k of fields) {
      const v = subset[k];
      lengths[k] = typeof v === 'string' ? v.length : v == null ? 0 : -1;
    }
    console.log('Field lengths:', lengths);
    console.log('Checks:', { hasAdsByGoogleUnit, hasAdClient });

    if (!res.ok) {
      process.exitCode = 1;
      console.warn('Warning: non-2xx response, but JSON parsed successfully.');
    }
  } catch (e) {
    console.error('FAILED to fetch ads config');
    console.error(`URL: ${url}`);
    console.error(e && e.stack ? e.stack : String(e));
    process.exitCode = 1;
  }
})();
