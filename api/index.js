// Single Vercel Serverless Function router
// Rewrites map /api/* -> /api/index?path=*

import admins from '../backend/handlers/admins.js';
import ai from '../backend/handlers/ai.js';
import blog from '../backend/handlers/blog.js';
import config from '../backend/handlers/config.js';
import contact from '../backend/handlers/contact.js';
import leads from '../backend/handlers/leads.js';
import loanProviders from '../backend/handlers/loan_providers.js';
import loanProviderSubmissions from '../backend/handlers/loan_provider_submissions.js';
import providerReviews from '../backend/handlers/provider_reviews.js';
import flags from '../backend/handlers/flags.js';
import seed from '../backend/handlers/seed.js';
import share from '../backend/handlers/share.js';
import testimonialsIndex from '../backend/handlers/testimonials_index.js';
import testimonialsId from '../backend/handlers/testimonials_id.js';
import cronDailyBlog from '../backend/handlers/cron_daily_blog.js';

const ensureJsonBody = async (req) => {
  // Vercel may not populate req.body for non-POST methods.
  if (req?.body !== undefined) return;
  const method = String(req?.method || '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const contentType = String(req?.headers?.['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) return;

  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', (c) => chunks.push(c));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) {
      req.body = {};
      return;
    }
    req.body = JSON.parse(raw);
  } catch {
    // If parsing fails, keep req.body undefined to let handlers error naturally.
  }
};

const ensureQueryObject = (req) => {
  if (req?.query && typeof req.query === 'object') return;

  try {
    const u = new URL(req?.url || '', 'http://localhost');
    const query = {};
    for (const [k, v] of u.searchParams.entries()) query[k] = v;
    req.query = query;
  } catch {
    req.query = {};
  }
};

const getPathSegments = (req) => {
  ensureQueryObject(req);
  const raw = req?.query?.path;
  const pathStr = Array.isArray(raw) ? raw.join('/') : String(raw || '');
  return pathStr.split('/').filter(Boolean);
};

export default async function handler(req, res) {
  const segments = getPathSegments(req);

  await ensureJsonBody(req);

  if (segments.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  const [root, ...rest] = segments;

  try {
    if (root === 'admins') return admins(req, res);
    if (root === 'ai') return ai(req, res);
    if (root === 'blog') return blog(req, res);
    if (root === 'config') return config(req, res);
    if (root === 'contact') return contact(req, res);
    if (root === 'leads') return leads(req, res);
    if (root === 'loan_providers') return loanProviders(req, res);
    if (root === 'loan_provider_submissions') return loanProviderSubmissions(req, res);
    if (root === 'provider_reviews') return providerReviews(req, res);
    if (root === 'flags') return flags(req, res);
    if (root === 'seed') return seed(req, res);
    if (root === 'share') return share(req, res);

    if (root === 'testimonials') {
      if (rest.length === 0) return testimonialsIndex(req, res);
      if (rest.length === 1) {
        req.query = { ...(req.query || {}), id: rest[0] };
        return testimonialsId(req, res);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    if (root === 'cron') {
      if (rest.join('/') === 'daily-blog') return cronDailyBlog(req, res);
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('API router error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
