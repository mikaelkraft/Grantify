// Handler: /api/uploads/gdrive/image
// Public endpoint that streams a Google Drive file (blog image) via the server.

import { refreshGDriveAccessToken, pipeWebFetchToNodeRes, toStr } from './gdrive_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const fileId = toStr(req?.query?.id).trim();
  if (!fileId) return res.status(400).send('Missing id');
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return res.status(400).send('Invalid id');

  let accessToken = '';
  try {
    accessToken = await refreshGDriveAccessToken(req);
  } catch {
    return res.status(404).send('Not found');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const driveRes = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!driveRes.ok) {
    return res.status(driveRes.status).send('Not found');
  }

  const contentType = driveRes.headers.get('content-type') || 'application/octet-stream';
  const contentLength = driveRes.headers.get('content-length');

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  if (contentLength) res.setHeader('Content-Length', contentLength);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  await pipeWebFetchToNodeRes(driveRes, res);
}
