#!/usr/bin/env node#!/usr/bin/env node





























































































})();  }    process.exitCode = 1;    console.error(e && e.stack ? e.stack : String(e));    console.error(`URL: ${url}`);    console.error('FAILED to fetch ads config');  } catch (e) {    }      console.warn('Warning: non-2xx response, but JSON parsed successfully.');      process.exitCode = 1;    if (!res.ok) {    });      hasAdClient      hasAdsByGoogleUnit,    console.log('Checks:', {    console.log('Field lengths:', lengths);    for (const k of fields) lengths[k] = typeof subset[k] === 'string' ? subset[k].length : subset[k] == null ? 0 : -1;    const lengths = {};    // Print only lengths (avoid dumping raw HTML/scripts into terminal logs)    console.log('Slots:', slotSummary);    console.log(`Cache-Control: ${cacheControl || '(none)'}`);    console.log(`Time: ${elapsedMs}ms`);    console.log(`Status: ${res.status} ${res.statusText}`);    console.log(`URL: ${url}`);    console.log('OK ads config fetched');    const hasAdClient = /data-ad-client\s*=\s*['\"]ca-pub-/i.test(body) || /data-ad-client\s*=\s*['\"]ca-pub-/i.test(footer);    const hasAdsByGoogleUnit = /class\s*=\s*['\"]adsbygoogle['\"]/i.test(body) || /class\s*=\s*['\"]adsbygoogle['\"]/i.test(footer);    const footer = String(json?.footer || '');    const body = String(json?.body || '');    // Minimal safety checks for common AdSense/slot wiring.    };      hasFooter: Boolean(String(json?.footer || '').trim())      hasSidebar: Boolean(String(json?.sidebar || '').trim()),      hasBody: Boolean(String(json?.body || '').trim()),      hasHeader: Boolean(String(json?.header || '').trim()),      hasHead: Boolean(String(json?.head || '').trim()),    const slotSummary = {    const subset = pick(json, fields);    const fields = ['head', 'header', 'body', 'sidebar', 'footer', 'promo1Link', 'promo1Text', 'promo2Link', 'promo2Text'];    }      throw new Error(`Expected JSON but got content-type=${contentType}. First 200 chars: ${text.slice(0, 200)}`);      const text = await res.text();    } else {      json = await res.json();    if (contentType.toLowerCase().includes('application/json')) {    const contentType = res.headers.get('content-type') || '';    let json;    const cacheControl = res.headers.get('cache-control');    const elapsedMs = Date.now() - started;    });      }        'Accept': 'application/json'      headers: {      method: 'GET',    const res = await fetch(url, {  try {  const started = Date.now();(async () => {};  return out;  for (const k of keys) out[k] = obj && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : undefined;  const out = {};const pick = (obj, keys) => {const url = `${origin}/api/config?type=ads`;const origin = base.replace(/\/$/, '');}  process.exit(2);  console.error('Missing base URL. Example: node scripts/smoke-ads-config.js https://your-domain.com');if (!base) {const base = (process.argv[2] || process.env.API_URL || '').trim(); */ *   API_URL=https://your-domain.com node scripts/smoke-ads-config.js *   node scripts/smoke-ads-config.js http://localhost:3000 *   node scripts/smoke-ads-config.js https://your-domain.com * Usage: * * Smoke test: Ads config endpoint/**/**
 * Smoke test: Ads config endpoint
 *
 * Usage:
 *   node scripts/smoke-ads-config.js https://your-domain.com
 *   node scripts/smoke-ads-config.js http://localhost:3000
 *   API_URL=https://your-domain.com node scripts/smoke-ads-config.js
 */

const base = (process.argv[2] || process.env.API_URL || '').trim();

if (!base) {
  console.error('Missing base URL. Example: node scripts/smoke-ads-config.js https://your-domain.com');
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
      headers: {
        'Accept': 'application/json'
      }
    });

    const elapsedMs = Date.now() - started;
    const cacheControl = res.headers.get('cache-control');

    let json;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Expected JSON but got content-type=${contentType}. First 200 chars: ${text.slice(0, 200)}`);
    }

    const fields = ['head', 'header', 'body', 'sidebar', 'footer', 'promo1Link', 'promo1Text', 'promo2Link', 'promo2Text'];
    const subset = pick(json, fields);

    const slotSummary = {
      hasHead: Boolean(String(json?.head || '').trim()),
      hasHeader: Boolean(String(json?.header || '').trim()),
      hasBody: Boolean(String(json?.body || '').trim()),
      hasSidebar: Boolean(String(json?.sidebar || '').trim()),
      hasFooter: Boolean(String(json?.footer || '').trim())
    };

    // Minimal safety checks for common AdSense/slot wiring.
    const body = String(json?.body || '');
    const footer = String(json?.footer || '');
    const hasAdsByGoogleUnit = /class\s*=\s*['\"]adsbygoogle['\"]/i.test(body) || /class\s*=\s*['\"]adsbygoogle['\"]/i.test(footer);
    const hasAdClient = /data-ad-client\s*=\s*['\"]ca-pub-/i.test(body) || /data-ad-client\s*=\s*['\"]ca-pub-/i.test(footer);

    console.log('OK ads config fetched');
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Time: ${elapsedMs}ms`);
    console.log(`Cache-Control: ${cacheControl || '(none)'}`);
    console.log('Slots:', slotSummary);

    // Print only lengths (avoid dumping raw HTML/scripts into terminal logs)
    const lengths = {};
    for (const k of fields) lengths[k] = typeof subset[k] === 'string' ? subset[k].length : subset[k] == null ? 0 : -1;
    console.log('Field lengths:', lengths);

    console.log('Checks:', {
      hasAdsByGoogleUnit,
      hasAdClient
    });

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
