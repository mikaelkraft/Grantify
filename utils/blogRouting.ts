export const slugifyTitle = (title: string) => {
  const input = String(title || '').trim();
  if (!input) return 'post';

  // Remove diacritics, then keep only ASCII letters/numbers/spaces/hyphens.
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const cleaned = ascii
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

  return cleaned || 'post';
};

export const makeBlogSlug = (title: string, id: string | number) => {
  const slugPart = slugifyTitle(title);
  const idPart = encodeURIComponent(String(id));
  return `${slugPart}~${idPart}`;
};

export const parseBlogParam = (param: string) => {
  const raw = String(param || '');
  const sepIndex = raw.lastIndexOf('~');
  if (sepIndex === -1) {
    return { id: raw, fromSlug: false };
  }

  const encodedId = raw.slice(sepIndex + 1);
  let id = encodedId;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    // fall back to encoded value
  }

  return { id, fromSlug: true };
};

export const makeBlogPath = (post: { id: string | number; title: string }) => {
  return `/blog/${makeBlogSlug(post.title, post.id)}`;
};
