import Hypher from 'hypher';
import english from 'hyphenation.en-us';

const SOFT_HYPHEN = '\u00AD';
const MIN_WORD_LENGTH = 8;

const EXCLUDED_TAGS = new Set([
  'A',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
]);

let hypherInstance: Hypher | null = null;

const getHypher = () => {
  if (!hypherInstance) hypherInstance = new Hypher(english as any);
  return hypherInstance;
};

const hasExcludedAncestor = (el: Element | null) => {
  let cur: Element | null = el;
  while (cur) {
    if (EXCLUDED_TAGS.has(cur.tagName)) return true;
    cur = cur.parentElement;
  }
  return false;
};

/**
 * Inserts soft hyphens into long words in an HTML string.
 *
 * - Only hyphenates letter-only word segments (Unicode letters) to avoid URLs/emails.
 * - Skips text inside tags like <a>, <code>, <pre>.
 */
export const hyphenateHtml = (html: string) => {
  const raw = String(html || '');
  if (!raw.trim()) return '';

  // Only runs in the browser. If called in a non-DOM environment, just return the input.
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return raw;

  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const wordRe = new RegExp(`\\p{L}{${MIN_WORD_LENGTH},}`, 'gu');

    let node: Node | null;
    // eslint-disable-next-line no-cond-assign
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const value = textNode.nodeValue;
      if (!value || !value.trim()) continue;
      if (value.includes(SOFT_HYPHEN)) continue;

      const parentEl = textNode.parentElement;
      if (hasExcludedAncestor(parentEl)) continue;

      // Only do work if there's at least one long letter-word.
      if (!wordRe.test(value)) continue;

      // Reset lastIndex after test() since it's a global regex.
      wordRe.lastIndex = 0;

      textNode.nodeValue = value.replace(wordRe, (word) => getHypher().hyphenateText(word));
    }

    return doc.body.innerHTML;
  } catch {
    return raw;
  }
};
