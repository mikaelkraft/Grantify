// Handler: /api/uploads/image
// Generates a presigned PUT URL for offsite object storage (S3/R2 compatible).
// This keeps images out of Postgres and off Vercel storage.

import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pool from '../db.js';
import { getOriginFromReq, refreshOneDriveAccessToken, graphFetch, kvSet, toStr as sharedToStr } from './onedrive_shared.js';
import { refreshGDriveAccessToken, getOrCreateBlogImagesFolderId, toStr as gToStr } from './gdrive_shared.js';

const toStr = (v) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join(',') : v === undefined || v === null ? '' : String(v));

const buildRequestFromNode = (req) => {
  const proto = toStr(req?.headers?.['x-forwarded-proto']) || 'https';
  const host = toStr(req?.headers?.host) || 'localhost';
  const url = req?.url && /^https?:\/\//i.test(req.url)
    ? req.url
    : `${proto}://${host}${toStr(req?.url) || ''}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req?.headers || {})) {
    if (typeof v === 'string') headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(','));
  }

  return new Request(url, {
    method: toStr(req?.method || 'POST') || 'POST',
    headers,
  });
};

const sanitizePathname = (pathname) => {
  const p = toStr(pathname).trim();
  // Basic hardening: only allow our prefix and avoid path traversal.
  if (!p.startsWith('blog-images/')) throw new Error('Invalid upload path');
  if (p.includes('..')) throw new Error('Invalid upload path');
  // Must include an extension.
  if (!/\.[a-z0-9]{2,6}$/i.test(p)) throw new Error('Missing file extension');
  return p;
};

const parseAdminSessionHeader = (raw) => {
  const input = toStr(raw).trim();
  if (!input) return null;

  // Accept either raw JSON or base64(JSON)
  const tryParse = (s) => {
    try {
      const obj = JSON.parse(s);
      return obj && typeof obj === 'object' ? obj : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(input);
  if (direct) return direct;

  try {
    const decoded = Buffer.from(input, 'base64').toString('utf8');
    return tryParse(decoded);
  } catch {
    return null;
  }
};

const ensureAdmin = async (req) => {
  const session = parseAdminSessionHeader(req?.headers?.['x-admin-session']);
  const id = toStr(session?.id).trim();
  const passwordHash = toStr(session?.passwordHash).trim();
  if (!id || !passwordHash) return false;

  try {
    const result = await pool.query('SELECT password_hash FROM admin_users WHERE id = $1 LIMIT 1', [id]);
    const row = result.rows?.[0];
    const dbHash = toStr(row?.password_hash).trim();
    return Boolean(dbHash) && dbHash === passwordHash;
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const enabled = String(process.env.OFFSITE_UPLOADS_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) return res.status(404).json({ error: 'Uploads are disabled' });

  const isAdmin = await ensureAdmin(req);
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const provider = String(process.env.OFFSITE_UPLOADS_PROVIDER || 's3').toLowerCase();

  try {
    const filename = toStr(req.body?.filename).trim();
    const contentType = toStr(req.body?.contentType).trim().toLowerCase();
    const folder = toStr(req.body?.folder).trim() || 'blog-images';

    if (!filename) return res.status(400).json({ error: 'Missing filename' });
    if (!contentType.startsWith('image/')) return res.status(400).json({ error: 'Only image uploads are supported' });
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported image type. Please use JPG, PNG, WEBP, or GIF.' });
    }

    const extMatch = filename.toLowerCase().match(/\.([a-z0-9]{2,6})$/);
    const ext = extMatch ? extMatch[1] : '';
    if (!ext) return res.status(400).json({ error: 'Missing file extension' });

    const yyyy = new Date().toISOString().slice(0, 4);
    const mm = new Date().toISOString().slice(5, 7);
    const safeFolder = folder.replace(/[^a-z0-9\-_/]/gi, '').replace(/\.+/g, '.');
    const id = crypto.randomUUID();
    const key = sanitizePathname(`${safeFolder}/${yyyy}/${mm}/${id}.${ext}`);

    if (provider === 'gdrive') {
      const origin = getOriginFromReq(req);

      let accessToken = '';
      try {
        accessToken = await refreshGDriveAccessToken(req);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Google Drive auth error';
        const lower = String(msg || '').toLowerCase();
        const isNotConnected = String(e?.code || '') === 'GDRIVE_NOT_CONNECTED';
        const isInvalidGrant = lower.includes('invalid_grant') || lower.includes('token has been expired') || lower.includes('revoked');

        if (isNotConnected || isInvalidGrant) {
          const token = crypto.randomBytes(16).toString('hex');
          await kvSet(`gdrive_connect_token_${token}`, '1');
          const connectUrl = `${origin}/api/uploads/gdrive/connect?token=${encodeURIComponent(token)}`;
          return res.status(409).json({ error: 'Google Drive not connected', connectUrl });
        }
        return res.status(503).json({ error: msg });
      }

      const folderId = await getOrCreateBlogImagesFolderId(accessToken).catch(() => null);
      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?' + new URLSearchParams({
        uploadType: 'resumable',
      }).toString();

      const metadata = {
        name: `${id}.${ext}`,
        ...(folderId ? { parents: [String(folderId)] } : {}),
      };

      const sessRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
          'X-Upload-Content-Type': contentType,
        },
        body: JSON.stringify(metadata),
      });

      if (!sessRes.ok) {
        const text = await sessRes.text().catch(() => '');
        return res.status(400).json({ error: gToStr(text || 'Failed to create Google Drive upload session') });
      }

      const uploadUrl = gToStr(sessRes.headers.get('location')).trim();
      if (!uploadUrl) return res.status(400).json({ error: 'Google Drive session missing uploadUrl' });

      return res.status(200).json({
        provider: 'gdrive',
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        maxBytes: 8 * 1024 * 1024,
      });
    }

    if (provider === 'onedrive') {
      const origin = getOriginFromReq(req);
      const adminSessionRaw = toStr(req?.headers?.['x-admin-session']).trim();

      let accessToken = '';
      try {
        accessToken = await refreshOneDriveAccessToken(req);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'OneDrive auth error';
        if (String(e?.code || '') === 'ONEDRIVE_NOT_CONNECTED') {
          const token = crypto.randomBytes(16).toString('hex');
          await kvSet(`onedrive_connect_token_${token}`, '1');
          const connectUrl = `${origin}/api/uploads/onedrive/connect?token=${encodeURIComponent(token)}`;
          return res.status(409).json({ error: 'OneDrive not connected', connectUrl });
        }
        return res.status(503).json({ error: msg });
      }

      // Store under /Grantify/<key>
      const path = `Grantify/${key}`;
      const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(path)}:/createUploadSession`;
      const { res: sessRes, json, text } = await graphFetch(accessToken, url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
            name: `${id}.${ext}`,
          },
        }),
      });

      if (!sessRes.ok) {
        const msg = sharedToStr(json?.error?.message) || text || 'Failed to create OneDrive upload session';
        return res.status(400).json({ error: msg });
      }

      const uploadUrl = sharedToStr(json?.uploadUrl).trim();
      if (!uploadUrl) return res.status(400).json({ error: 'OneDrive session missing uploadUrl' });

      return res.status(200).json({
        provider: 'onedrive',
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        maxBytes: 8 * 1024 * 1024,
      });
    }

    // Default: S3/R2-compatible presigned PUT
    const endpoint = toStr(process.env.S3_ENDPOINT).trim();
    const region = toStr(process.env.S3_REGION).trim() || 'auto';
    const bucket = toStr(process.env.S3_BUCKET).trim();
    const accessKeyId = toStr(process.env.S3_ACCESS_KEY_ID).trim();
    const secretAccessKey = toStr(process.env.S3_SECRET_ACCESS_KEY).trim();
    const publicBaseUrl = toStr(process.env.S3_PUBLIC_BASE_URL).trim();

    if (!bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
      return res.status(503).json({
        error: 'Offsite storage is not configured',
        hint: 'Set OFFSITE_UPLOADS_PROVIDER=gdrive OR OFFSITE_UPLOADS_PROVIDER=onedrive OR configure S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL (and optionally S3_ENDPOINT, S3_REGION)'
      });
    }

    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    const base = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
    const publicUrl = `${base}/${key}`;

    return res.status(200).json({
      provider: 's3',
      uploadUrl,
      publicUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      maxBytes: 8 * 1024 * 1024,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload error';
    return res.status(400).json({ error: msg });
  }
}
