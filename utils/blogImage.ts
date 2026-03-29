export const extractFirstImageSrcFromHtml = (html: string): string | null => {
  const s = String(html || '');
  if (!s.trim()) return null;
  const match = s.match(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const src = (match && (match[1] || match[2] || match[3])) ? String(match[1] || match[2] || match[3]) : '';
  const trimmed = src.trim();
  return trimmed ? trimmed : null;
};

export const derivePostImage = (post: { image?: string | null; content?: string | null }): string | null => {
  const direct = String(post?.image || '').trim();
  if (direct) return direct;
  return extractFirstImageSrcFromHtml(post?.content || '') || null;
};
