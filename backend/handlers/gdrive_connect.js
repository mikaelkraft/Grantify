// Handler: /api/uploads/gdrive/connect
// Starts Google OAuth flow and redirects the admin to Google consent.

import { getGDriveOAuthConfig, getGDriveScopes, kvDel, kvGet, kvSetRandomState, toStr } from './gdrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = toStr(req?.query?.token).trim();
  if (!token) return res.status(401).send('Unauthorized');
  const tokenKey = `gdrive_connect_token_${token}`;
  const exists = await kvGet(tokenKey);
  if (!exists) return res.status(401).send('Unauthorized');
  await kvDel(tokenKey);

  const cfg = getGDriveOAuthConfig(req);
  if (!cfg.clientId || !cfg.clientSecret) {
    return res.status(503).send('Google Drive OAuth is not configured (missing GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET).');
  }

  const state = await kvSetRandomState();
  const scopes = getGDriveScopes().join(' ');
  const params = new URLSearchParams();
  params.set('client_id', cfg.clientId);
  params.set('response_type', 'code');
  params.set('redirect_uri', cfg.redirectUri);
  params.set('scope', scopes);
  params.set('state', state);
  params.set('access_type', 'offline');
  params.set('include_granted_scopes', 'true');
  params.set('prompt', 'consent');

  const authUrl = `${cfg.authUrl}?${params.toString()}`;
  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  return res.end(toStr(authUrl));
}
