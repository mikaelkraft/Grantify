// Handler: /api/uploads/gdrive/status
// Returns whether Google Drive is configured/connected for uploads.

import { ensureAdminFromQueryOrHeader, getGDriveRefreshToken, refreshGDriveAccessToken, toStr } from './gdrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { ok } = await ensureAdminFromQueryOrHeader(req, { headerKey: 'x-admin-session' });
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  const enabled = String(process.env.OFFSITE_UPLOADS_ENABLED || '').toLowerCase() === 'true';
  const provider = String(process.env.OFFSITE_UPLOADS_PROVIDER || 's3').toLowerCase();
  if (!enabled) return res.status(200).json({ enabled: false, provider, connected: false });
  if (provider !== 'gdrive') return res.status(200).json({ enabled: true, provider, connected: false });

  const refreshToken = await getGDriveRefreshToken();
  const hasToken = Boolean(toStr(refreshToken).trim());
  if (!hasToken) return res.status(200).json({ enabled: true, provider, connected: false });

  try {
    // Validate the refresh token by performing a refresh.
    await refreshGDriveAccessToken(req);
    return res.status(200).json({ enabled: true, provider, connected: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Google Drive auth error';
    const lower = String(msg || '').toLowerCase();
    const needsReconnect = lower.includes('invalid_grant') || lower.includes('token has been expired') || lower.includes('revoked');
    return res.status(200).json({ enabled: true, provider, connected: false, needsReconnect, error: msg });
  }
}
