import crypto from 'node:crypto';
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
  await kvSet('onedrive_oauth_state', state);
  return state;
};

export const kvGetState = async () => kvGet('onedrive_oauth_state');

export const getOneDriveOAuthConfig = (req) => {
  const tenant = toStr(process.env.ONEDRIVE_TENANT).trim() || 'consumers';
  const clientId = toStr(process.env.ONEDRIVE_CLIENT_ID).trim();
  const clientSecret = toStr(process.env.ONEDRIVE_CLIENT_SECRET).trim();
  const origin = getOriginFromReq(req);
  const redirectUri = toStr(process.env.ONEDRIVE_REDIRECT_URI).trim() || `${origin}/api/uploads/onedrive/callback`;

  return {
    tenant,
    clientId,
    clientSecret,
    redirectUri,
    authority: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`,
  };
};

export const getOneDriveScopes = () => {
  // Delegated permissions for personal OneDrive. This will prompt for consent.
  // Files.ReadWrite.All is commonly accepted for delegated consumer flows.
  // Keep scopes minimal but functional.
  return ['offline_access', 'User.Read', 'Files.ReadWrite.All'];
};

export const getOneDriveRefreshToken = async () => kvGet('onedrive_refresh_token');

export const saveOneDriveRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;
  await kvSet('onedrive_refresh_token', refreshToken);
};

export const refreshOneDriveAccessToken = async (req) => {
  const { authority, clientId, clientSecret, redirectUri } = getOneDriveOAuthConfig(req);
  if (!clientId || !clientSecret) {
    throw new Error('OneDrive OAuth is not configured');
  }

  const refreshToken = await getOneDriveRefreshToken();
  if (!refreshToken) {
    const err = new Error('OneDrive not connected');
    err.code = 'ONEDRIVE_NOT_CONNECTED';
    throw err;
  }

  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  body.set('redirect_uri', redirectUri);
  body.set('scope', getOneDriveScopes().join(' '));

  const res = await fetch(`${authority}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = toStr(data?.error_description) || toStr(data?.error) || 'Failed to refresh OneDrive token';
    throw new Error(msg);
  }

  const accessToken = toStr(data?.access_token).trim();
  const newRefreshToken = toStr(data?.refresh_token).trim();
  if (!accessToken) throw new Error('OneDrive token response missing access_token');
  if (newRefreshToken) await saveOneDriveRefreshToken(newRefreshToken);

  return accessToken;
};

export const graphFetch = async (accessToken, url, init) => {
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { res, text, json };
};

const base64Url = (s) => Buffer.from(String(s), 'utf8')
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

export const shareWebUrlToDirectContentUrl = (webUrl) => {
  // OneDrive shares API uses shareId = 'u!' + base64url(shareUrl)
  const shareId = `u!${base64Url(webUrl)}`;
  return `https://api.onedrive.com/v1.0/shares/${shareId}/root/content`;
};
