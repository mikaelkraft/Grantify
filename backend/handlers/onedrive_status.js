// Handler: /api/uploads/onedrive/status
// Returns whether OneDrive is configured/connected for uploads.

import { ensureAdminFromQueryOrHeader, getOneDriveRefreshToken, toStr } from './onedrive_shared.js';

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
  if (provider !== 'onedrive') return res.status(200).json({ enabled: true, provider, connected: false });

  const refreshToken = await getOneDriveRefreshToken();
  const connected = Boolean(toStr(refreshToken).trim());
  return res.status(200).json({ enabled: true, provider, connected });
}
