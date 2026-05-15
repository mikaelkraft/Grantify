// Handler: /api/uploads/status
// Admin-only endpoint that reports which offsite uploads provider is active
// and whether it is configured/connected.

import { ensureAdminFromQueryOrHeader } from './gdrive_shared.js';
import { getGDriveRefreshToken, refreshGDriveAccessToken, toStr as gToStr } from './gdrive_shared.js';
import { getOneDriveRefreshToken, refreshOneDriveAccessToken, toStr as oToStr } from './onedrive_shared.js';

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

  if (!enabled) {
    return res.status(200).json({ enabled: false, provider, connected: false });
  }

  if (provider === 'gdrive') {
    const refreshToken = await getGDriveRefreshToken();
    const hasToken = Boolean(gToStr(refreshToken).trim());
    if (!hasToken) return res.status(200).json({ enabled: true, provider, connected: false });

    try {
      await refreshGDriveAccessToken(req);
      return res.status(200).json({ enabled: true, provider, connected: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Google Drive auth error';
      const lower = String(msg || '').toLowerCase();
      const needsReconnect = lower.includes('invalid_grant') || lower.includes('token has been expired') || lower.includes('revoked');
      return res.status(200).json({ enabled: true, provider, connected: false, needsReconnect, error: msg });
    }
  }

  if (provider === 'onedrive') {
    const refreshToken = await getOneDriveRefreshToken();
    const hasToken = Boolean(oToStr(refreshToken).trim());
    if (!hasToken) return res.status(200).json({ enabled: true, provider, connected: false });

    try {
      await refreshOneDriveAccessToken(req);
      return res.status(200).json({ enabled: true, provider, connected: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OneDrive auth error';
      const lower = String(msg || '').toLowerCase();
      const needsReconnect = lower.includes('invalid_grant') || lower.includes('token has been expired') || lower.includes('revoked');
      return res.status(200).json({ enabled: true, provider, connected: false, needsReconnect, error: msg });
    }
  }

  // Default: S3/R2-compatible configuration
  const bucket = gToStr(process.env.S3_BUCKET).trim();
  const accessKeyId = gToStr(process.env.S3_ACCESS_KEY_ID).trim();
  const secretAccessKey = gToStr(process.env.S3_SECRET_ACCESS_KEY).trim();
  const publicBaseUrl = gToStr(process.env.S3_PUBLIC_BASE_URL).trim();
  const configured = Boolean(bucket && accessKeyId && secretAccessKey && publicBaseUrl);

  return res.status(200).json({ enabled: true, provider, connected: configured, configured });
}
