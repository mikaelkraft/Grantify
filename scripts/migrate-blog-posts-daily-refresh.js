import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

const parseArgs = (argv) => {
  const args = {
    apply: false,
    limit: 50,
    offset: 0,
    all: false,
    verbose: false,
    recat: false,
    count: false,
    uploadImages: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--all') args.all = true;
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--recat') args.recat = true;
    else if (a === '--count') args.count = true;
    else if (a === '--upload-images') args.uploadImages = true;
    else if (a === '--offset') {
      const n = Number.parseInt(String(argv[i + 1] || ''), 10);
      if (Number.isFinite(n) && n >= 0) args.offset = n;
      i++;
    }
    else if (a === '--limit') {
      const n = Number.parseInt(String(argv[i + 1] || ''), 10);
      if (Number.isFinite(n) && n > 0) args.limit = n;
      i++;
    }
  }

  return args;
};

const normalizeNbsp = (s) => String(s || '').replace(/&nbsp;|\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

const makeBlogSlug = (title, id) => {
  const base = normalizeNbsp(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return `${base}-${id}`;
};

const stripHtmlToText = (html) => {
  const s = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|\u00A0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return s.replace(/\s+/g, ' ').trim();
};

const stripLeadingH2 = (html) => {
  const s = String(html || '').trim();
  // Remove one leading <h2>...</h2> if present (title duplication)
  return s.replace(/^\s*<h2[^>]*>[\s\S]*?<\/h2>\s*/i, '');
};

const removeRelatedReadsBlock = (html) => {
  let s = String(html || '');

  // Remove common "Related reads" patterns (h3 + list)
  s = s.replace(
    /<h3[^>]*>\s*(Related\s+reads|Related\s+Reads|Related\s+Read)\s*<\/h3>\s*(<ul[\s\S]*?<\/ul>)?/gi,
    ''
  );

  // Also remove older variants (e.g. <p><strong>Related reads:</strong> ...)
  s = s.replace(
    /<p[^>]*>\s*<strong[^>]*>\s*Related\s+reads\s*:?\s*<\/strong>[\s\S]*?<\/p>/gi,
    ''
  );

  return s;
};

const removeSourcesBlock = (html) => {
  let s = String(html || '');

  s = s.replace(/<h3[^>]*>\s*Sources\s*<\/h3>\s*<ul>[\s\S]*?<\/ul>/gi, '');
  s = s.replace(/<p[^>]*>\s*<strong[^>]*>\s*Sources\s*:?.*?<\/p>/gi, '');

  return s;
};

const removeInlineAlsoRead = (html) => {
  let s = String(html || '');

  // Remove inline "Also read" injections so the script is idempotent.
  // Example: " <strong>Also read:</strong> <a href=\"/blog/...\">Title</a>."
  s = s.replace(
    /\s*<strong[^>]*>\s*Also\s+read\s*:?\s*<\/strong>\s*<a\s+href="\/blog\/[^"]+"[^>]*>[\s\S]*?<\/a>\s*\.?/gi,
    ''
  );

  return s;
};

const extractParagraphs = (html) => {
  const matches = String(html || '').match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  return matches || [];
};

const injectAlsoReadInline = (html, relatedPosts) => {
  const cleaned = removeSourcesBlock(removeInlineAlsoRead(removeRelatedReadsBlock(html)));
  const paragraphs = extractParagraphs(cleaned);

  if (paragraphs.length === 0) return cleaned;

  const maxInserts = Math.min(3, relatedPosts.length);
  if (maxInserts <= 0) return cleaned;

  // Choose 1 paragraph per insert. Roughly spread them out.
  const slots = [];
  if (paragraphs.length === 1) slots.push(0);
  else {
    for (let i = 0; i < maxInserts; i++) {
      const idx = Math.floor(((i + 1) * paragraphs.length) / (maxInserts + 1));
      slots.push(Math.min(Math.max(idx, 0), paragraphs.length - 1));
    }
  }

  const uniqueSlots = Array.from(new Set(slots)).slice(0, maxInserts);

  let out = cleaned;
  const used = new Set();

  for (let insertIdx = 0; insertIdx < uniqueSlots.length; insertIdx++) {
    const paraIndex = uniqueSlots[insertIdx];
    const para = paragraphs[paraIndex];
    if (!para) continue;

    const candidate = relatedPosts.find((p) => !used.has(String(p.id)));
    if (!candidate) break;
    used.add(String(candidate.id));

    const slug = makeBlogSlug(candidate.title, candidate.id);
    const alsoReadHtml = ` <strong>Also read:</strong> <a href="/blog/${slug}">${candidate.title}</a>.`;

    const replaced = para.replace(/<\/p>\s*$/i, `${alsoReadHtml}</p>`);
    out = out.replace(para, replaced);
  }

  return out;
};

// Sanitize blog text similar to backend AI sanitizer: remove first-person
// anecdotal sentences and limit repetitive country mentions.
const sanitizeBlogText = (html) => {
  const s = String(html || '');
  if (!s) return s;

  // Work on text content while preserving basic HTML structure per-paragraph.
  try {
    const doc = new (require('node-html-parser')).parse(s);
    const paragraphs = doc.querySelectorAll('p');

    if (!paragraphs || paragraphs.length === 0) {
      // Fallback: operate on whole text
      const txt = stripHtmlToText(s);
      const sentences = txt.split(/(?<=[.!?])\s+/);
      const filtered = sentences.filter((sent) => {
        const low = String(sent || '').toLowerCase();
        if (/\b(i (was|met|visited|spent|joined|accompanied)|we (visited|met|were|spent)|today i|yesterday i|this morning i|this afternoon i)\b/.test(low)) return false;
        if (/\b(i was with|i met with|we met with|we were with|i spent the day|i visited)\b/.test(low)) return false;
        return true;
      });
      let out = filtered.join(' ');
      const country = 'Nigeria';
      const parts = out.split(new RegExp(`(${country})`, 'gi'));
      if (parts.length > 3) {
        let seen = 0;
        out = parts.map(p => {
          if (p.toLowerCase() === country.toLowerCase()) {
            seen += 1;
            return seen === 1 ? p : 'the country';
          }
          return p;
        }).join('');
      }
      return `<p>${out}</p>`;
    }

    for (const p of paragraphs) {
      const text = p.textContent || '';
      const sentences = String(text).split(/(?<=[.!?])\s+/);
      const filtered = sentences.filter((sent) => {
        const s = String(sent || '').trim();
        const low = s.toLowerCase();
        // Remove obvious first-person anecdotal phrases or narrative hooks.
        if (/^as\s+(i|we|she|he|they|you)\b/i.test(s)) return false;
        if (/\b(i\s+(was|met|visited|spent|joined|accompanied)\b|we\s+(visited|met|were|spent)\b)/i.test(s)) return false;
        if (/\b(today i|yesterday i|this morning i|this afternoon i|i was with|i met with|we met with|we were with|i spent the day|i visited)\b/i.test(low)) return false;
        // Remove sentences that start with a narratorial clause like "As she navigated..."
        if (/^as\s+[a-z][a-z]+/i.test(s)) return false;
        return true;
      });
      let out = filtered.join(' ');
      const country = 'Nigeria';
      const parts = out.split(new RegExp(`(${country})`, 'gi'));
      if (parts.length > 3) {
        let seen = 0;
        out = parts.map(p => {
          if (p.toLowerCase() === country.toLowerCase()) {
            seen += 1;
            return seen === 1 ? p : 'the country';
          }
          return p;
        }).join('');
      }
      // Replace inner text while preserving simple tags inside the paragraph
      p.set_content(out);
    }

    return doc.toString();
  } catch (err) {
    // On any parser error, fallback to simple text sanitizer above.
    const txt = stripHtmlToText(s);
    const sentences = txt.split(/(?<=[.!?])\s+/);
    const filtered = sentences.filter((sent) => {
      const low = String(sent || '').toLowerCase();
      if (/\b(i (was|met|visited|spent|joined|accompanied)|we (visited|met|were|spent)|today i|yesterday i|this morning i|this afternoon i)\b/.test(low)) return false;
      if (/\b(i was with|i met with|we met with|we were with|i spent the day|i visited)\b/.test(low)) return false;
      return true;
    });
    let out = filtered.join(' ');
    const country = 'Nigeria';
    const parts = out.split(new RegExp(`(${country})`, 'gi'));
    if (parts.length > 3) {
      let seen = 0;
      out = parts.map(p => {
        if (p.toLowerCase() === country.toLowerCase()) {
          seen += 1;
          return seen === 1 ? p : 'the country';
        }
        return p;
      }).join('');
    }
    return `<p>${out}</p>`;
  }
};

const deriveCategoryFromText = (title, html) => {
  const t = normalizeNbsp(title).toLowerCase();
  const text = `${t} ${stripHtmlToText(html).toLowerCase()}`;

  if (/(grant|bootcamp|accelerator|incubat|challenge|call for application)/.test(text)) return 'Grants';
  if (/(loan|credit|lending|interest rate|facility|working capital|overdraft|microfinance)/.test(text)) return 'Loans';
  if (/(fintech|payment|pos|wallet|cbn|regulation|credit bureau)/.test(text)) return 'Finance';
  if (/(startup|saas|software|product|tech|developer|ai|data|cloud)/.test(text)) return 'Technology';
  if (/(agri|farm|cassava|rice|maize|poultry|fish|fertilizer|livestock)/.test(text)) return 'Agriculture';
  if (/(solar|mini-?grid|inverter|energy|power|electricity|climate|carbon)/.test(text)) return 'Energy';
  if (/(manufactur|factory|export|smedan|equipment|machinery)/.test(text)) return 'Manufacturing';
  if (/(hospital|clinic|pharmacy|health|nhis)/.test(text)) return 'Health';
  if (/(school|education|training|edtech|teacher)/.test(text)) return 'Education';
  if (/(music|film|fashion|creative|content creator|ip|intellectual property)/.test(text)) return 'Creative Economy';
  if (/(women|youth|female|girl|young founder)/.test(text)) return 'Women & Youth';
  if (/(policy|tax|vat|customs|import|regulation|compliance)/.test(text)) return 'Policy';

  return 'Funding';
};

const deriveDailyTagsFromCategory = (category, html) => {
  const text = stripHtmlToText(html).toLowerCase();
  const tags = [];
  const add = (t) => {
    const s = String(t || '').trim();
    if (!s) return;
    if (!tags.includes(s)) tags.push(s);
  };

  add('daily');

  const c = String(category || '').toLowerCase();
  if (c.includes('grant')) {
    add('grants');
    add('applications');
    add('deadlines');
  } else if (c.includes('loan')) {
    add('loans');
    add('working-capital');
  } else if (c.includes('agri')) {
    add('agriculture');
    add('loans');
    add('working-capital');
  } else if (c.includes('techn')) {
    add('technology');
    add('startups');
    add('runway');
  } else if (c.includes('financ')) {
    add('finance');
    add('loans');
    add('cashflow');
  } else if (c.includes('energy')) {
    add('energy');
    add('climate');
  } else if (c.includes('manufact')) {
    add('manufacturing');
    add('equipment');
  } else if (c.includes('health')) {
    add('health');
    add('compliance');
  } else if (c.includes('education')) {
    add('education');
    add('skills');
  } else if (c.includes('creative')) {
    add('creative');
    add('monetization');
  } else if (c.includes('women')) {
    add('women-founders');
    add('youth');
  } else if (c.includes('policy')) {
    add('policy');
    add('compliance');
  } else {
    add('funding');
  }

  if (/(scam|fraud|red flag|verify|due diligence)/.test(text)) add('avoid-scams');
  if (/(cbn|boi|nedc|smedan|nirsal)/.test(text)) add('institutions');
  if (/(export|trade|customs)/.test(text)) add('exports');

  return tags.slice(0, 10);
};

const deriveTagsFromText = (title, html, { forceDaily = false } = {}) => {
  const text = `${normalizeNbsp(title)} ${stripHtmlToText(html)}`.toLowerCase();
  const tags = new Set();

  const add = (t) => {
    const s = String(t || '').trim();
    if (!s) return;
    tags.add(s);
  };

  if (forceDaily) add('daily');

  // Content-first keyword extraction
  const stopwords = new Set(['about','after','again','against','also','among','around','before','being','between','which','their','there','these','those','could','would','should','through','during','without','within','under','about','above','below','from','that','this','have','has','had','will','your','yourself','they','them','then','than','when','where','what','with','were','been','but','for','they','are','was','not','you','our','we','who','whom','how','why','its','it\'s','the','a','an','and','or','in','on','of','to','by']);
  const tokens = {};
  const combined = text;
  for (const part of combined.split(/[^a-zA-Z0-9]+/)) {
    const w = String(part || '').trim();
    if (!w || w.length < 5) continue;
    const lw = w.toLowerCase();
    if (stopwords.has(lw)) continue;
    if (/^\d+$/.test(lw)) continue;
    tokens[lw] = (tokens[lw] || 0) + 1;
  }
  const tokenCandidates = Object.keys(tokens).sort((a, b) => tokens[b] - tokens[a]);
  let added = 0;
  for (const tk of tokenCandidates) {
    if (added >= 4) break;
    if (/^(nigeria|nigerian|funding|opportunit|grant|grants|daily|briefing)$/.test(tk)) continue;
    add(tk);
    added += 1;
  }

  // Add domain tags conservatively
  if (/(grant|accelerator|incubator|bootcamp)/.test(text)) add('grants');
  if (/(loan|credit|lending|interest rate|facility|working capital)/.test(text)) add('loans');
  if (/(cash ?flow|working capital)/.test(text)) add('cashflow');
  if (/(cbn|boi|nedc|smedan|nirsal)/.test(text)) add('institutions');
  if (/(scam|fraud|verify|red flag)/.test(text)) add('avoid-scams');
  if (/(women|female)/.test(text)) add('women-founders');
  if (/(youth|young)/.test(text)) add('youth');
  if (/(agri|farm|poultry|fish|fertilizer)/.test(text)) add('agriculture');
  if (/(solar|mini-?grid|energy|power)/.test(text)) add('energy');
  if (/(manufactur|factory|equipment|machinery)/.test(text)) add('manufacturing');
  if (/(health|clinic|pharmacy|hospital)/.test(text)) add('health');
  if (/(education|school|training|edtech)/.test(text)) add('education');
  if (/(startup|saas|software|tech|developer|ai|data)/.test(text)) add('technology');
  if (/(fintech|payment|pos|wallet)/.test(text)) add('fintech');
  if (/(export|trade|customs)/.test(text)) add('exports');
  if (/(strategy|plan|playbook)/.test(text)) add('strategy');

  return Array.from(tags).slice(0, 10);
};

const hasDailyTag = (tags) => (Array.isArray(tags) ? tags.map(String) : []).includes('daily');

const shouldClearSourceFields = ({ sourceName, sourceUrl }) => {
  const name = String(sourceName || '').toLowerCase();
  const url = String(sourceUrl || '').toLowerCase();
  if (!name && !url) return false;

  // Clear anything that looks like Google News RSS / redirects.
  if (url.includes('news.google') || url.includes('google.com/rss') || url.includes('/rss')) return true;
  if (name.includes('google') && name.includes('rss')) return true;
  return false;
};

const stableHash = (s) => {
  const str = String(s || '');
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

// API endpoint used by migration for uploading images (when --upload-images)
const API_URL = String(process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

const makeAdminSessionHeader = async (client) => {
  try {
    const res = await client.query("SELECT id, password_hash FROM admin_users ORDER BY role DESC NULLS_LAST, id LIMIT 1");
    const row = res.rows?.[0];
    if (!row || !row.id || !row.password_hash) return null;
    const sess = { id: String(row.id), passwordHash: String(row.password_hash) };
    const raw = JSON.stringify(sess);
    return Buffer.from(raw, 'utf8').toString('base64');
  } catch (e) {
    return null;
  }
};

const uploadDataUriImage = async (dataUri, filename, adminHeader) => {
  // dataUri: data:<mime>;base64,<data>
  const m = String(dataUri || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!m) throw new Error('Invalid data URI');
  const mime = m[1];
  const b64 = m[2];
  const buf = Buffer.from(b64, 'base64');

  // helper: fetch with retry/backoff
  const fetchWithRetry = async (url, opts = {}, attempts = 3, delay = 500) => {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, opts);
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          const err = new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
          err.status = res.status;
          throw err;
        }
        return res;
      } catch (e) {
        lastErr = e;
        const backoff = delay * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw lastErr;
  };

  // Request presign (with retries)
  const presignRes = await fetchWithRetry(`${API_URL}/api/uploads/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Session': adminHeader,
    },
    body: JSON.stringify({ filename: filename || 'image.png', contentType: mime, folder: 'blog-images' }),
  }, 4, 300);
  if (!presignRes.ok) {
    // defensive: try to get detailed body
    let data = null;
    try { data = await presignRes.json(); } catch { data = null; }
    const bodyText = data ? JSON.stringify(data) : (await presignRes.text().catch(() => ''));
    const msg = data?.error || presignRes.statusText || `Presign failed: ${bodyText}`;
    throw new Error(String(msg));
  }
  const presign = await presignRes.json();
  const uploadUrl = String(presign.uploadUrl || '');
  const provider = String(presign.provider || 's3');
  if (!uploadUrl) throw new Error('Invalid presign response');

  if (provider === 'gdrive') {
    // PUT bytes to uploadUrl (with retries)
    const putRes = await fetchWithRetry(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mime },
      body: buf,
    }, 4, 500);
    const putText = await putRes.text().catch(() => '');
    let data = null;
    try { data = putText ? JSON.parse(putText) : null; } catch { data = null; }
    const fileId = String(data?.id || '').trim();
    if (!fileId) throw new Error(`Missing file id from drive upload; response: ${putText}`);

    // Finalize to get publicUrl (with retries)
    const finalizeRes = await fetchWithRetry(`${API_URL}/api/uploads/gdrive/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Session': adminHeader },
      body: JSON.stringify({ fileId }),
    }, 4, 300);
    const finText = await finalizeRes.text().catch(() => '');
    let fin = null;
    try { fin = finText ? JSON.parse(finText) : null; } catch { fin = null; }
    const finUrl = String((fin && fin.publicUrl) || '').trim();
    if (!finUrl) throw new Error(`Missing publicUrl from finalize; response: ${finText}`);
    return finUrl;
  }

  // Fallback S3-style PUT
  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: buf });
  if (!putRes.ok) throw new Error('Upload failed');
  return String(presign.publicUrl || '');
};

const sampleRelatedPosts = (poolRows, excludeId, count, seed) => {
  const candidates = poolRows.filter((p) => String(p.id) !== String(excludeId));
  if (candidates.length <= count) return candidates.slice(0, count);

  // Deterministic pick so re-runs don't keep changing content.
  const start = stableHash(seed) % candidates.length;
  const picked = [];
  for (let i = 0; i < candidates.length && picked.length < count; i++) {
    const c = candidates[(start + i) % candidates.length];
    if (!c) continue;
    picked.push(c);
  }
  return picked;
};

const backupFileNameForRun = ({ offset, limit, scope }) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `.tmp-blog-posts-backup-${scope}-${stamp}-offset${offset}-limit${limit}.json`;
};

async function migrate() {
  const args = parseArgs(process.argv.slice(2));
  const client = await pool.connect();

  // Prevent Node from crashing on unexpected connection drops.
  client.on('error', (err) => {
    console.error('DB client error:', err);
  });

  try {
    if (args.count) {
      const dailyRes = await client.query(
        "SELECT COUNT(*)::int AS c FROM blog_posts WHERE tags && ARRAY['daily']::text[]"
      );
      const dataImgRes = await client.query(
        "SELECT COUNT(*)::int AS c FROM blog_posts WHERE left(coalesce(image,''),5) = 'data:'"
      );
      console.log(`daily_posts=${dailyRes.rows?.[0]?.c ?? 0}`);
      console.log(`data_image_posts=${dataImgRes.rows?.[0]?.c ?? 0}`);
      return;
    }

    console.log(`Mode: ${args.apply ? 'APPLY (writes to DB)' : 'DRY-RUN (no writes)'}`);
    console.log(`Scope: ${args.all ? 'ALL posts' : 'daily-tagged posts only'}`);
    console.log(`Limit: ${args.limit}`);
    console.log(`Offset: ${args.offset}`);

    const postsRes = await client.query(
      `SELECT id, title, content, image, tags, category, source_name AS "sourceName", source_url AS "sourceUrl"
       FROM blog_posts
       ${args.all ? '' : `WHERE tags @> ARRAY['daily']::text[]`}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [args.limit, args.offset]
    );

    const posts = postsRes.rows || [];
    console.log(`Found ${posts.length} post(s) to process.`);

    // Build related-post pool: prefer non-daily evergreen posts.
    const relatedPoolRes = await client.query(
      `SELECT id, title
       FROM blog_posts
       WHERE NOT (tags @> ARRAY['daily']::text[])
       ORDER BY created_at DESC
       LIMIT 200`
    );
    const relatedPool = relatedPoolRes.rows || [];

    const fallbackPoolRes = relatedPool.length
      ? null
      : await client.query(
          `SELECT id, title
           FROM blog_posts
           ORDER BY created_at DESC
           LIMIT 200`
        );
    const poolRows = relatedPool.length ? relatedPool : (fallbackPoolRes?.rows || []);

    let changed = 0;
    let updated = 0;
    const backups = [];

    let adminSessionHeader = null;
    if (args.uploadImages && args.apply) {
      // Compute admin session header once (avoid querying inside transaction)
      adminSessionHeader = await makeAdminSessionHeader(client);
      if (!adminSessionHeader && args.verbose) console.log('Upload-images step skipped: No admin session available for uploads');
    }

    if (args.apply) {
      await client.query('BEGIN');
    }

    for (const post of posts) {
      const beforeContent = String(post.content || '');
      const related = sampleRelatedPosts(poolRows, post.id, 3, `${post.id}|${post.title}`);

      const isDaily = hasDailyTag(post.tags);

      let nextContent = beforeContent;
      nextContent = stripLeadingH2(nextContent);
      nextContent = injectAlsoReadInline(nextContent, related);
      // Sanitize only generated daily posts (preserve human-made author formatting)
      if (isDaily) {
        try {
          nextContent = sanitizeBlogText(nextContent);
        } catch (e) {
          // ignore sanitization errors and proceed with previous content
        }
      }

      const derivedCategory = deriveCategoryFromText(post.title, nextContent);
      const nextCategory = (args.recat || !String(post.category || '').trim())
        ? derivedCategory
        : String(post.category || '').trim();

      const nextTags = isDaily
        ? deriveDailyTagsFromCategory(nextCategory || derivedCategory, nextContent)
        : (Array.isArray(post.tags) ? Array.from(new Set(post.tags.map(String))).slice(0, 10) : []);

      const clearSources = shouldClearSourceFields({ sourceName: post.sourceName, sourceUrl: post.sourceUrl }) || isDaily;
      const nextSourceName = clearSources ? '' : String(post.sourceName || '');
      const nextSourceUrl = clearSources ? '' : String(post.sourceUrl || '');

      const beforeImage = String(post.image || '').trim();
      // Preserve image field (including data: URIs) so pasted/inline images preview correctly.
      let nextImage = beforeImage;

      // Optionally upload embedded data-URI images to configured offsite storage (gdrive)
      if (args.uploadImages && args.apply && adminSessionHeader) {
        try {
          // Replace first-level post.image if it's a data URI
          if (nextImage && String(nextImage).startsWith('data:')) {
            try {
              const publicUrl = await uploadDataUriImage(nextImage, `post-${post.id}.png`, adminSessionHeader);
              nextImage = publicUrl;
              if (args.verbose) console.log(`  uploaded image for ${post.id} -> ${publicUrl}`);
            } catch (e) {
              if (args.verbose) console.log(`  image upload failed for ${post.id}: ${String(e.message)}`);
            }
          }

          // Replace any data: image src in content
          const dataImgRegex = /<img[^>]+src=["'](data:[^"']+)["'][^>]*>/gi;
          let match;
          let newContent = nextContent;
          while ((match = dataImgRegex.exec(nextContent)) !== null) {
            const dataUri = match[1];
            try {
              const publicUrl = await uploadDataUriImage(dataUri, `post-${post.id}-${Math.floor(Math.random()*10000)}.png`, adminSessionHeader);
              newContent = newContent.split(dataUri).join(publicUrl);
              if (args.verbose) console.log(`  replaced embedded image in ${post.id} -> ${publicUrl}`);
            } catch (e) {
              if (args.verbose) console.log(`  embedded image upload failed for ${post.id}: ${String(e.message)}`);
            }
          }
          nextContent = newContent;
        } catch (e) {
          if (args.verbose) console.log('Upload-images step skipped:', String(e.message || e));
        }
      }

      const isSame =
        nextContent === beforeContent &&
        String(post.category || '') === nextCategory &&
        JSON.stringify(post.tags || []) === JSON.stringify(nextTags) &&
        String(post.sourceName || '') === nextSourceName &&
        String(post.sourceUrl || '') === nextSourceUrl &&
        beforeImage === nextImage;

      if (isSame) {
        if (args.verbose) console.log(`- ${post.id}: no change`);
        continue;
      }

      changed++;

      if (args.verbose) {
        console.log(`- ${post.id}:`);
        console.log(`  category: ${String(post.category || '')} -> ${nextCategory}`);
        console.log(`  tags: ${(post.tags || []).join(', ')} -> ${nextTags.join(', ')}`);
      }

      if (args.apply) {
        backups.push({
          id: post.id,
          title: post.title,
          before: {
            content: beforeContent,
            category: String(post.category || ''),
            tags: Array.isArray(post.tags) ? post.tags : [],
            sourceName: String(post.sourceName || ''),
            sourceUrl: String(post.sourceUrl || ''),
            image: beforeImage,
          }
        });

        await client.query(
          `UPDATE blog_posts
           SET content = $1,
               category = $2,
               tags = $3,
               source_name = $4,
               source_url = $5,
               image = $6,
               updated_at = NOW()
           WHERE id = $7`,
          [nextContent, nextCategory, nextTags, nextSourceName, nextSourceUrl, nextImage, post.id]
        );
        updated++;
      }
    }

    if (args.apply) {
      const scope = args.all ? 'all' : 'daily';
      const backupName = backupFileNameForRun({ offset: args.offset, limit: args.limit, scope });
      const backupPath = path.join(process.cwd(), backupName);

      // Write the backup BEFORE committing, so we can safely rollback if disk write fails.
      await fs.writeFile(
        backupPath,
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            scope,
            limit: args.limit,
            offset: args.offset,
            updated,
            backups,
          },
          null,
          2
        ),
        'utf8'
      );
      console.log(`Backup written: ${backupPath}`);

      await client.query('COMMIT');
    }

    console.log(`Changed: ${changed}`);
    if (args.apply) console.log(`Updated: ${updated}`);

    if (!args.apply) {
      console.log('Dry-run complete. Re-run with --apply to write changes.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    if (args.apply) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
