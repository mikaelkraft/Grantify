// Handler: /api/uploads/gdrive/callback
// Receives OAuth code, exchanges for tokens, stores refresh_token in Postgres.

import { getGDriveOAuthConfig, getGDriveRefreshToken, kvGetState, saveGDriveRefreshToken, toStr, getOrCreateBlogImagesFolderId } from './gdrive_shared.js';

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

    const cfg = getGDriveOAuthConfig(req);
    if (!cfg.clientId || !cfg.clientSecret) {
      return res.status(503).send('Google Drive OAuth is not configured.');
    }

    const body = new URLSearchParams();
    body.set('client_id', cfg.clientId);
    body.set('client_secret', cfg.clientSecret);
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', cfg.redirectUri);

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      const msg = toStr(data?.error_description) || toStr(data?.error) || 'Token exchange failed';
      return res.status(400).send(`Google Drive token exchange failed: ${msg}`);
    }

    const refreshToken = toStr(data?.refresh_token).trim();
    const accessToken = toStr(data?.access_token).trim();

    // If Google doesn't return refresh_token (common if the user previously consented),
    // we should not claim success unless we already have one stored.
    if (!refreshToken) {
      const existing = toStr(await getGDriveRefreshToken()).trim();
      if (!existing) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(400).send(`<!doctype html>
<html><head><meta charset="utf-8" /><title>Google Drive Connection Needs Re-auth</title></head>
<body style="font-family:system-ui; padding:16px;">
  <h2>Google Drive connected (but missing refresh token)</h2>
  <p>Google did not return a <code>refresh_token</code>, so Grantify can’t upload to Drive yet.</p>
  <p><strong>Fix:</strong> revoke access and reconnect:</p>
  <ol>
    <li>Go to your Google Account → <strong>Security</strong> → <strong>Third-party access</strong>.</li>
    <li>Remove the Grantify app (or the OAuth client you created).</li>
    <li>Return to Grantify Admin and try the upload again to re-run consent.</li>
  </ol>
  <p style="font-size:12px; color:#666;">Tip: make sure the consent screen includes your Google user as a test user if the app is still in “Testing”.</p>
  <script>try{window.close();}catch(e){}</script>
</body></html>`);
      }
    }

    if (refreshToken) {
      await saveGDriveRefreshToken(refreshToken);
    }

    // Best-effort: ensure the target folder exists while we have an access token.
    if (accessToken) {
      try { await getOrCreateBlogImagesFolderId(accessToken); } catch { /* ignore */ }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html><head><meta charset="utf-8" /><title>Google Drive Connected</title></head>
<body style="font-family:system-ui; padding:16px;">
  <h2>Google Drive connected</h2>
  <p>You can close this window and return to Grantify Admin.</p>
  <script>try{window.close();}catch(e){}</script>
</body></html>`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Callback error';
    return res.status(500).send(msg);
  }
}
