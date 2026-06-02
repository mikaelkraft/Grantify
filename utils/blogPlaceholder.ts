export const getBlogPlaceholderImage = (title: string, width = 1200, height = 630): string => {
  const safeTitle = (title || 'Grantify').trim() || 'Grantify';

  const escapeXml = (value: string) => {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const wrapTitle = (value: string) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return ['Grantify'];

    const maxLines = 3;
    const baseChars = 30;
    const maxCharsPerLine = Math.max(18, Math.round((width / 1200) * baseChars));

    const words = normalized.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length <= maxCharsPerLine) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    }
    if (lines.length < maxLines && current) lines.push(current);

    // If still too much text, trim the last line with an ellipsis.
    if (lines.length > maxLines) lines.length = maxLines;
    if (lines.length === maxLines) {
      const joined = lines.join(' ');
      if (joined.length < normalized.length) {
        const last = lines[maxLines - 1];
        const trimmed = last.length > maxCharsPerLine
          ? last.slice(0, Math.max(0, maxCharsPerLine - 1)).trimEnd()
          : last.trimEnd();
        lines[maxLines - 1] = `${trimmed}…`;
      }
    }

    return lines.filter(Boolean);
  };

  const lines = wrapTitle(safeTitle);
  const titleFontSize = lines.length === 1 ? 54 : (lines.length === 2 ? 46 : 40);
  const lineHeight = Math.round(titleFontSize * 1.15);
  const titleStartY = Math.round((height / 2) - ((lines.length - 1) * lineHeight) / 2);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#111827"/>
  <rect x="48" y="48" width="${width - 96}" height="${height - 96}" rx="40" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
  <text x="${Math.round(width / 2)}" y="${titleStartY}" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="${titleFontSize}" font-weight="800" fill="rgba(255,255,255,0.92)">
    ${lines.map((line, idx) => {
      const dy = idx === 0 ? 0 : lineHeight;
      return `<tspan x="${Math.round(width / 2)}" dy="${dy}">${escapeXml(line)}</tspan>`;
    }).join('')}
  </text>
  <text x="${width / 2}" y="${height / 2 + 64}" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="18" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,0.70)">
    GRANTIFY COMMUNITY
  </text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
