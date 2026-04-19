// Handler: /api/uploads/gdrive/finalize
// Returns a public URL for the uploaded file (served via our backend proxy).

import { ensureAdminFromQueryOrHeader, getOriginFromReq, toStr } from './gdrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Session');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ok } = await ensureAdminFromQueryOrHeader(req, { headerKey: 'x-admin-session' });
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  const fileId = toStr(req.body?.fileId).trim();
  if (!fileId) return res.status(400).json({ error: 'Missing fileId' });
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return res.status(400).json({ error: 'Invalid fileId' });

  const origin = getOriginFromReq(req);
  const publicUrl = `${origin}/api/uploads/gdrive/image?id=${encodeURIComponent(fileId)}`;
  return res.status(200).json({ publicUrl, fileId });
}
