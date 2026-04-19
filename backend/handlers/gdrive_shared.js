import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import pool from '../db.js';

export const toStr = (v) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join(',') : v === undefined || v === null ? '' : String(v));

export const getOriginFromReq = (req) => {
  const proto = toStr(req?.headers?.['x-forwarded-proto']) || 'https';
  const host = toStr(req?.headers?.host) || 'localhost';
  return `${proto}://${host}`;
};

const parseAdminSessionHeader = (raw) => {
  const input = toStr(raw).trim();
  if (!input) return null;

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

export const ensureAdminFromQueryOrHeader = async (req, opts) => {
  const queryKey = opts?.queryKey || 'session';
  const headerKey = (opts?.headerKey || 'x-admin-session').toLowerCase();
  const sessionRaw = toStr(req?.query?.[queryKey]).trim() || toStr(req?.headers?.[headerKey]).trim();
  const session = parseAdminSessionHeader(sessionRaw);
  const id = toStr(session?.id).trim();
  const passwordHash = toStr(session?.passwordHash).trim();
  if (!id || !passwordHash) return { ok: false, sessionRaw: '' };

  try {
    const result = await pool.query('SELECT password_hash FROM admin_users WHERE id = $1 LIMIT 1', [id]);
    const dbHash = toStr(result.rows?.[0]?.password_hash).trim();
    const ok = Boolean(dbHash) && dbHash === passwordHash;
    return { ok, sessionRaw };
  } catch {
    return { ok: false, sessionRaw: '' };
  }
};

const ensureKvTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const kvGet = async (key) => {
  await ensureKvTable();
  const result = await pool.query('SELECT value FROM app_kv WHERE key = $1 LIMIT 1', [key]);
  return toStr(result.rows?.[0]?.value).trim() || null;
};

export const kvSet = async (key, value) => {
  await ensureKvTable();
  await pool.query(
    `INSERT INTO app_kv (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [key, String(value)]
  );
};

export const kvDel = async (key) => {
  await ensureKvTable();
  await pool.query('DELETE FROM app_kv WHERE key = $1', [key]);
};

export const kvSetRandomState = async () => {
  const state = crypto.randomBytes(16).toString('hex');
  await kvSet('gdrive_oauth_state', state);
  return state;
};

export const kvGetState = async () => kvGet('gdrive_oauth_state');

export const getGDriveOAuthConfig = (req) => {
  const clientId = toStr(process.env.GDRIVE_CLIENT_ID).trim();
  const clientSecret = toStr(process.env.GDRIVE_CLIENT_SECRET).trim();
  const origin = getOriginFromReq(req);
  const redirectUri = toStr(process.env.GDRIVE_REDIRECT_URI).trim() || `${origin}/api/uploads/gdrive/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  };
};

export const getGDriveScopes = () => {
  // Restrict access to files created by this app.
  return ['https://www.googleapis.com/auth/drive.file'];
};

export const getGDriveRefreshToken = async () => kvGet('gdrive_refresh_token');

export const saveGDriveRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;
  await kvSet('gdrive_refresh_token', refreshToken);
};

export const refreshGDriveAccessToken = async (req) => {
  const { clientId, clientSecret, redirectUri, tokenUrl } = getGDriveOAuthConfig(req);
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth is not configured');
  }

  const refreshToken = await getGDriveRefreshToken();
  if (!refreshToken) {
    const err = new Error('Google Drive not connected');
    err.code = 'GDRIVE_NOT_CONNECTED';
    throw err;
  }

  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  body.set('redirect_uri', redirectUri);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = toStr(data?.error_description) || toStr(data?.error) || 'Failed to refresh Google Drive token';
    throw new Error(msg);
  }

  const accessToken = toStr(data?.access_token).trim();
  const newRefreshToken = toStr(data?.refresh_token).trim();
  if (!accessToken) throw new Error('Google token response missing access_token');
  if (newRefreshToken) await saveGDriveRefreshToken(newRefreshToken);
  return accessToken;
};

export const gdriveFetch = async (accessToken, url, init) => {
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { res, text, json };
};

const escapeDriveQ = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const findFolderId = async (accessToken, name, parentId) => {
  const qParts = [
    `name='${escapeDriveQ(name)}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    'trashed=false',
  ];
  if (parentId) qParts.push(`'${escapeDriveQ(parentId)}' in parents`);
  const q = qParts.join(' and ');

  const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
    q,
    pageSize: '1',
    fields: 'files(id,name)',
  }).toString()}`;

  const { res, json, text } = await gdriveFetch(accessToken, url, { method: 'GET' });
  if (!res.ok) {
    const msg = toStr(json?.error?.message) || text || 'Failed to query Drive folder';
    throw new Error(msg);
  }

  const id = toStr(json?.files?.[0]?.id).trim();
  return id || null;
};

const createFolder = async (accessToken, name, parentId) => {
  const body = {
    name: String(name),
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [String(parentId)] } : {}),
  };

  const { res, json, text } = await gdriveFetch(accessToken, 'https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = toStr(json?.error?.message) || text || 'Failed to create Drive folder';
    throw new Error(msg);
  }

  const id = toStr(json?.id).trim();
  if (!id) throw new Error('Drive folder create response missing id');
  return id;
};

export const getOrCreateBlogImagesFolderId = async (accessToken) => {
  const existing = await kvGet('gdrive_blog_images_folder_id');
  if (existing) return existing;

  // Create/find: My Drive / Grantify / blog-images
  let grantifyId = await findFolderId(accessToken, 'Grantify', null);
  if (!grantifyId) grantifyId = await createFolder(accessToken, 'Grantify', null);

  let blogImagesId = await findFolderId(accessToken, 'blog-images', grantifyId);
  if (!blogImagesId) blogImagesId = await createFolder(accessToken, 'blog-images', grantifyId);

  await kvSet('gdrive_blog_images_folder_id', blogImagesId);
  return blogImagesId;
};

export const pipeWebFetchToNodeRes = async (fetchRes, nodeRes) => {
  const body = fetchRes?.body;
  if (!body) return;

  // @ts-ignore - Node 18+ supports fromWeb for ReadableStream
  const nodeStream = Readable.fromWeb(body);
  await new Promise((resolve, reject) => {
    nodeStream.on('error', reject);
    nodeRes.on('error', reject);
    nodeRes.on('close', resolve);
    nodeStream.pipe(nodeRes);
  });
};
