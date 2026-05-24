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
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--all') args.all = true;
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--recat') args.recat = true;
    else if (a === '--count') args.count = true;
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
  const cleaned = removeInlineAlsoRead(removeRelatedReadsBlock(html));
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
      const nextImage = beforeImage.startsWith('data:') ? '' : beforeImage;

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
