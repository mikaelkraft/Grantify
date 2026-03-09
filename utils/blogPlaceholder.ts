export const getBlogPlaceholderImage = (title: string, width = 1200, height = 630): string => {
  const safeTitle = (title || 'Grantify').trim() || 'Grantify';
  const escapedTitle = safeTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#374151"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="48" y="48" width="${width - 96}" height="${height - 96}" rx="40" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="48" font-weight="800" fill="rgba(255,255,255,0.92)">
    ${escapedTitle.length > 52 ? escapedTitle.slice(0, 52) + '…' : escapedTitle}
  </text>
  <text x="${width / 2}" y="${height / 2 + 64}" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="18" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,0.70)">
    GRANTIFY COMMUNITY
  </text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
