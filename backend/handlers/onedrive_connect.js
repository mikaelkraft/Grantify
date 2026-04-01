// Handler: /api/uploads/onedrive/connect
// Starts OneDrive OAuth flow and redirects the admin to Microsoft consent.

import { getOneDriveOAuthConfig, getOneDriveScopes, kvDel, kvGet, kvSetRandomState, toStr } from './onedrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = toStr(req?.query?.token).trim();
  if (!token) return res.status(401).send('Unauthorized');
  const tokenKey = `onedrive_connect_token_${token}`;
  const exists = await kvGet(tokenKey);
  if (!exists) return res.status(401).send('Unauthorized');
  await kvDel(tokenKey);

  const cfg = getOneDriveOAuthConfig(req);
  if (!cfg.clientId || !cfg.clientSecret) {
    return res.status(503).send('OneDrive OAuth is not configured (missing ONEDRIVE_CLIENT_ID / ONEDRIVE_CLIENT_SECRET).');
  }

  const state = await kvSetRandomState();
  const scopes = getOneDriveScopes().join(' ');
  const params = new URLSearchParams();
  params.set('client_id', cfg.clientId);
  params.set('response_type', 'code');
  params.set('redirect_uri', cfg.redirectUri);
  params.set('response_mode', 'query');
  params.set('scope', scopes);
  params.set('state', state);
  // Force account picker for clarity.
  params.set('prompt', 'select_account');

  const authUrl = `${cfg.authority}/authorize?${params.toString()}`;
  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  return res.end(toStr(authUrl));
}
