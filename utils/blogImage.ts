export const extractFirstImageSrcFromHtml = (html: string): string | null => {
  const s = String(html || '');
  if (!s.trim()) return null;
  const match = s.match(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const src = (match && (match[1] || match[2] || match[3])) ? String(match[1] || match[2] || match[3]) : '';
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return null;
  return trimmed;
};

export const derivePostImage = (post: { image?: string | null; content?: string | null }): string | null => {
  const direct = String(post?.image || '').trim();
  if (direct && !direct.startsWith('data:')) return direct;
  return extractFirstImageSrcFromHtml(post?.content || '') || null;
};

export const withImageCacheBuster = (url: string | null | undefined, version?: string | number | null): string => {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  const v = version === undefined || version === null ? '' : String(version).trim();
  if (!v) return raw;
  const join = raw.includes('?') ? '&' : '?';
  return `${raw}${join}v=${encodeURIComponent(v)}`;
};
