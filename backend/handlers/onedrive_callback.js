// Handler: /api/uploads/onedrive/callback
// Receives OAuth code, exchanges for tokens, stores refresh_token in Postgres.

import { getOneDriveOAuthConfig, getOneDriveScopes, kvGetState, saveOneDriveRefreshToken, toStr } from './onedrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const code = toStr(req?.query?.code).trim();
  const state = toStr(req?.query?.state).trim();
  if (!code) return res.status(400).send('Missing code');

  try {
    const expected = await kvGetState();
    if (expected && state && expected !== state) {
      return res.status(400).send('Invalid state');
    }

    const cfg = getOneDriveOAuthConfig(req);
    if (!cfg.clientId || !cfg.clientSecret) {
      return res.status(503).send('OneDrive OAuth is not configured.');
    }

    const body = new URLSearchParams();
    body.set('client_id', cfg.clientId);
    body.set('client_secret', cfg.clientSecret);
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', cfg.redirectUri);
    body.set('scope', getOneDriveScopes().join(' '));

    const tokenRes = await fetch(`${cfg.authority}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      const msg = toStr(data?.error_description) || toStr(data?.error) || 'Token exchange failed';
      return res.status(400).send(`OneDrive token exchange failed: ${msg}`);
    }

    const refreshToken = toStr(data?.refresh_token).trim();
    if (!refreshToken) {
      return res.status(400).send('OneDrive did not return a refresh_token. Ensure scope includes offline_access and consent was granted.');
    }

    await saveOneDriveRefreshToken(refreshToken);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html><head><meta charset="utf-8" /><title>OneDrive Connected</title></head>
<body style="font-family:system-ui; padding:16px;">
  <h2>OneDrive connected</h2>
  <p>You can close this window and return to Grantify Admin.</p>
  <script>try{window.close();}catch(e){}</script>
</body></html>`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Callback error';
    return res.status(500).send(msg);
  }
}
