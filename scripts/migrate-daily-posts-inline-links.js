import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

const getArg = (name, fallback = null) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  return v === undefined ? fallback : v;
};

const hasFlag = (name) => process.argv.includes(name);

const apply = hasFlag('--apply');
const onlyDaily = !hasFlag('--all');
const limitRaw = Number.parseInt(String(getArg('--limit', '50')), 10);
const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 50;
const clearSourceFields = !hasFlag('--keep-source-fields');
const updateTaxonomy = !hasFlag('--no-taxonomy');

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

const stripLeadingH2 = (html) => {
  const s = String(html || '');
  return s.replace(/^\s*<h2\b[^>]*>[\s\S]*?<\/h2>\s*/i, '');
};

const stripSourcesBlock = (html) => {
  let s = String(html || '');
  s = s.replace(/<h3\b[^>]*>\s*Sources\s*<\/h3>\s*<ul>[\s\S]*?<\/ul>/gi, '');
  s = s.replace(/<p[^>]*>\s*<strong[^>]*>\s*Sources\s*:?.*?<\/p>/gi, '');
  return s;
};

const injectAlsoReadInline = (html, relatedPosts) => {
  const raw = String(html || '');
  const posts = Array.isArray(relatedPosts) ? relatedPosts.filter(Boolean) : [];
  if (!posts.length) {
    return raw.replace(/<h3\b[^>]*>\s*(Related reads|Also read|Also reads)\s*<\/h3>\s*<ul>[\s\S]*?<\/ul>/i, '');
  }

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

const deriveTags = ({ title, html }) => {
  const tags = new Set();
  const t = String(title || '').toLowerCase();
  const body = String(html || '').replace(/<[^>]+>/g, ' ').toLowerCase();
  const text = `${t} ${body}`;

  tags.add('Nigeria');
  if (/(grant|grants|funding|opportunit)/.test(text)) tags.add('Funding');
  if (/(loan|credit|lending|facility)/.test(text)) tags.add('Loans');

  const addIf = (re, value) => { if (re.test(text)) tags.add(value); };
  addIf(/\b(sme|small business|msme|micro|enterprise)\b/, 'SME');
  addIf(/\b(cbn|boi|government|policy|regulation)\b/, 'Policy');
  addIf(/\b(scam|fraud|ponzi|fee)\b/, 'Scam Alerts');
  addIf(/\b(export|afcfta)\b/, 'Exports');
  addIf(/\b(impact|climate|esg)\b/, 'Impact');

  const titleWords = String(title || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/g)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 10);

  for (const w of titleWords) {
    if (w.length < 5) continue;
    if (/^(nigeria|funding|opportunit|briefing|today|daily|growth)$/.test(w.toLowerCase())) continue;
    tags.add(w.charAt(0).toUpperCase() + w.slice(1));
    if (tags.size >= 9) break;
  }

  return Array.from(tags).slice(0, 9);
};

const guessAngleKeyFromTitle = (title) => {
  const t = String(title || '').toLowerCase();
  if (/(solar|mini-?grid|energy|power|climate)/.test(t)) return 'clean-energy';
  if (/(agric|farm|rice|maize|cassava|livestock|fish|fertil)/.test(t)) return 'agri-value-chain';
  if (/(women|female|girl|youth|graduates)/.test(t)) return 'women-youth';
  if (/(manufactur|factory|industrial|export)/.test(t)) return 'manufacturing';
  if (/(health|hospital|clinic|pharma|education|school|university)/.test(t)) return 'health-ed';
  if (/(film|music|fashion|creative|media|brand)/.test(t)) return 'creative-economy';
  if (/(fintech|bank|credit|loan|lending|microfinance)/.test(t)) return 'fintech-credit';
  if (/(startup|tech|software|saas|ai|digital)/.test(t)) return 'tech-startups';
  return '';
};

async function migrate() {
  const client = await pool.connect();
  try {
    const where = [];
    const params = [];

    if (onlyDaily) {
      where.push(`tags @> ARRAY['daily']::text[]`);
    }

    // Focus on posts that likely need normalization.
    where.push(`(
      content ~* '^\\s*<h2'
      OR content ~* '<h3\\b[^>]*>\\s*(related reads|also read|also reads)'
    )`);

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const res = await client.query(
      `SELECT id, title, content, category, tags, source_name, source_url
       FROM blog_posts
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    const posts = Array.isArray(res.rows) ? res.rows : [];
    console.log(`Found ${posts.length} candidate posts (limit=${limit}, onlyDaily=${onlyDaily}).`);

    let changed = 0;
    for (const p of posts) {
      const id = String(p.id);
      const oldHtml = String(p.content || '');

      // Pick related evergreen posts (best-effort).
      let related = [];
      try {
        const rel = await client.query(
          `SELECT id, title
           FROM blog_posts
           WHERE id <> $1
             AND NOT (tags @> ARRAY['daily']::text[])
           ORDER BY created_at DESC
           LIMIT 18`,
          [id]
        );
        const poolRows = Array.isArray(rel.rows) ? rel.rows : [];
        related = poolRows
          .filter((r) => Boolean(String(r?.title || '').trim()))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
      } catch {
        related = [];
      }

      const withInline = injectAlsoReadInline(oldHtml, related);
      const cleaned = stripSourcesBlock(stripLeadingH2(withInline));

      const nextCategory = updateTaxonomy
        ? deriveCategory({ angleKey: guessAngleKeyFromTitle(p.title), title: p.title })
        : String(p.category || '');

      const nextTags = updateTaxonomy
        ? Array.from(new Set(['daily', ...deriveTags({ title: p.title, html: cleaned })]))
        : (Array.isArray(p.tags) ? p.tags : []);

      const newHtml = cleaned;

      const shouldUpdate = newHtml !== oldHtml
        || (updateTaxonomy && (String(nextCategory) !== String(p.category || '') || JSON.stringify(nextTags) !== JSON.stringify(p.tags || [])))
        || (clearSourceFields && (String(p.source_name || '') || String(p.source_url || '')));

      if (!shouldUpdate) continue;
      changed += 1;

      const preview = String(newHtml).slice(0, 160).replace(/\s+/g, ' ').trim();
      console.log(`${apply ? 'APPLY' : 'DRY'} ${id}: ${String(p.title || '').slice(0, 80)}… | ${preview}…`);

      if (apply) {
        await client.query(
          `UPDATE blog_posts
           SET content = $2,
               category = $3,
               tags = $4,
               source_name = $5,
               source_url = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            id,
            newHtml,
            nextCategory,
            nextTags,
            clearSourceFields ? '' : (p.source_name || ''),
            clearSourceFields ? '' : (p.source_url || ''),
          ]
        );
      }
    }

    console.log(`Done. ${changed} posts ${apply ? 'updated' : 'would be updated'}.`);
    if (!apply) {
      console.log('Run again with --apply to write changes.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
