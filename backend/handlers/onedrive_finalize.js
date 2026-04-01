// Handler: /api/uploads/onedrive/finalize
// Creates an anonymous share link for an uploaded item and returns a public URL.

import { ensureAdminFromQueryOrHeader, refreshOneDriveAccessToken, graphFetch, shareWebUrlToDirectContentUrl, toStr } from './onedrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ok } = await ensureAdminFromQueryOrHeader(req, { headerKey: 'x-admin-session' });
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  const itemId = toStr(req.body?.itemId).trim();
  if (!itemId) return res.status(400).json({ error: 'Missing itemId' });

  try {
    const accessToken = await refreshOneDriveAccessToken(req);
    const { res: linkRes, json, text } = await graphFetch(
      accessToken,
      `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(itemId)}/createLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view', scope: 'anonymous' }),
      }
    );

    if (!linkRes.ok) {
      const msg = toStr(json?.error?.message) || text || 'Failed to create share link';
      return res.status(400).json({ error: msg });
    }

    const webUrl = toStr(json?.link?.webUrl).trim();
    if (!webUrl) return res.status(400).json({ error: 'Share link missing webUrl' });

    const publicUrl = shareWebUrlToDirectContentUrl(webUrl);
    return res.status(200).json({ publicUrl, webUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Finalize error';
    return res.status(400).json({ error: msg });
  }
}
