// Handler: /api/uploads/gdrive/proxy-put
// Fallback upload path for browsers that fail direct PUT to Google resumable URLs.

import { ensureAdminFromQueryOrHeader, fetchWithRetry, toStr } from './gdrive_shared.js';

const MAX_BYTES = 8 * 1024 * 1024;

const readRawBody = async (req) => {
  const chunks = [];
  let total = 0;

  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > MAX_BYTES) {
        reject(new Error('File is too large (max 8MB)'));
        return;
      }
      chunks.push(buf);
    });
    req.on('end', resolve);
    req.on('error', reject);
  });

  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session, X-Upload-Url');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ok } = await ensureAdminFromQueryOrHeader(req, { headerKey: 'x-admin-session' });
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  const uploadUrl = toStr(req?.headers?.['x-upload-url']).trim();
  if (!uploadUrl || !/^https:\/\//i.test(uploadUrl)) {
    return res.status(400).json({ error: 'Missing or invalid upload URL' });
  }

  const contentType = toStr(req?.headers?.['content-type']).trim() || 'application/octet-stream';

  try {
    const body = await readRawBody(req);
    if (!body.length) return res.status(400).json({ error: 'Empty file body' });

    const putRes = await fetchWithRetry(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.length),
      },
      body,
    }, { attempts: 3, baseDelayMs: 400 });

    const text = await putRes.text().catch(() => '');
    if (!putRes.ok) {
      return res.status(400).json({
        error: text || `Google Drive upload failed (${putRes.status})`,
        status: putRes.status,
      });
    }

    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return res.status(200).json(json || {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload proxy failed';
    return res.status(400).json({ error: msg });
  }
}