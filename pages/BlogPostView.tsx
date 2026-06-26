import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { BlogPost, BlogComment, AdConfig } from '../types';
import { Loader2, ThumbsUp, Heart, Hand, MessageSquare, ArrowLeft, Send, Calendar, User, Shield, Share2, Eye, ArrowUp, Copy, Flag, Sparkles, ExternalLink } from 'lucide-react';
import { AdSlot } from '../components/AdSlot';
import { FacebookShareButton, TwitterShareButton, WhatsappShareButton, LinkedinShareButton, FacebookIcon, WhatsappIcon, LinkedinIcon } from 'react-share';
import { getBlogPlaceholderImage } from '../utils/blogPlaceholder';
import { derivePostImage, withImageCacheBuster } from '../utils/blogImage';
import { makeBlogSlug, parseBlogParam, slugifyTitle } from '../utils/blogRouting';

const XShareIcon: React.FC<{ size?: number; round?: boolean; iconFillColor?: string }> = ({
  size = 32,
  round = false,
  iconFillColor = '#ffffff'
}) => {
  const r = round ? size / 2 : 6;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="X"
    >
      <rect x="0" y="0" width="32" height="32" rx={r} fill="#000000" />
      {/* Simple X mark approximating the X logo */}
      <path
        d="M10.1 9.2h3.4l4.0 5.3 4.6-5.3h3.0l-6.0 7.0 6.8 8.8h-3.4l-4.6-5.9-5.1 5.9H8.9l6.6-7.6-5.4-7.2z"
        fill={iconFillColor}
      />
    </svg>
  );
};

const looksLikeHtml = (value: string) => {
  const s = String(value || '').trim();
  if (!s) return false;
  // Simple heuristic: if it contains tags other than a literal less-than in text.
  return /<\s*(p|br|h1|h2|h3|h4|h5|h6|ul|ol|li|strong|em|blockquote|a|img)(\s|>|\/)/i.test(s);
};

const escapeHtml = (value: string) => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const plainTextToHtml = (value: string) => {
  const text = String(value || '').replace(/\r\n/g, '\n');
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Prefer splitting on blank lines first (typical paragraph breaks).
  let paragraphs = trimmed.split(/\n\s*\n+/g);

  // If there's only a single paragraph but the text contains single newlines
  // (many AI outputs use single-line breaks), treat each single newline as
  // a paragraph separator so we can reliably inject inline cards.
  if (paragraphs.length === 1 && trimmed.includes('\n')) {
    paragraphs = trimmed.split(/\n+/g);
  }

  return paragraphs
    .map((p) => {
      const safe = escapeHtml(p).replace(/\n/g, '<br />');
      return `<p>${safe}</p>`;
    })
    .join('\n');
};

const stripLeadingDuplicateH2 = (html: string, title: string) => {
  const input = String(html || '').trim();
  if (!input) return '';

  const m = input.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>\s*/i);
  if (!m) return input;

  const h2Text = String(m[1] || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const tText = String(title || '').replace(/&nbsp;|\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  // If it looks like the title (or it’s at least non-empty), remove it because the page already renders <h1>.
  if (!h2Text) return input.replace(m[0], '');
  if (tText && h2Text.toLowerCase() === tText.toLowerCase()) return input.replace(m[0], '');
  return input.replace(m[0], '');
};

const stripTrailingAlsoReadBlocks = (html: string) => {
  let input = String(html || '');
  input = input.replace(/<h3\b[^>]*>\s*(Also read|Also reads|Related reads|Related posts|Sources)\s*<\/h3>\s*(<ul[\s\S]*?<\/ul>)?/gi, '');
  input = input.replace(/<p[^>]*>\s*<strong[^>]*>\s*(Also read|Also reads|Related reads|Related posts|Sources)\s*:?.*?<\/p>/gi, '');

  const parts = input.split(/(?=<p\b|<h[1-6]\b|<ul\b|<ol\b|<blockquote\b)/i);
  if (parts.length === 0) return input;

  const isTailLabel = (fragment: string) => {
    const text = fragment
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;|\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return text.startsWith('also read:') || text.startsWith('sources:');
  };

  let end = parts.length;
  while (end > 0) {
    const current = parts[end - 1].trim();
    if (!isTailLabel(current)) break;
    end -= 1;
  }

  input = parts.slice(0, end).join('');
  return input;
};


const fixLinksInHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<a\b([^>]*)\bhref=(["'])(.*?)\2([^>]*)/gi, (match, before, quote, href, after) => {
    let trimmedHref = href.trim();
    
    // Normalize absolute internal links (grantify.help or localhost or the current window origin)
    // to root-relative links starting with /
    const internalDomainRegex = /^(https?:\/\/)?(www\.)?(grantify\.help|localhost(:\d+)?)/i;
    if (internalDomainRegex.test(trimmedHref)) {
      trimmedHref = trimmedHref.replace(internalDomainRegex, '');
    }

    const hasProtocol = /^(https?:\/\/|mailto:|tel:|sms:|javascript:)/i.test(trimmedHref);
    const isRootRelative = trimmedHref.startsWith('/');
    const isSpecial = trimmedHref.startsWith('#') || trimmedHref === '';
    
    // If it's a relative path without a leading slash and not a special link,
    // ensure it starts with /
    if (!hasProtocol && !isRootRelative && !isSpecial) {
      if (trimmedHref.startsWith('blog/')) {
        trimmedHref = '/' + trimmedHref;
      } else {
        trimmedHref = `/blog/${trimmedHref}`;
      }
    }
    
    return `<a${before}href=${quote}${trimmedHref}${quote}${after}`;
  });
};

const formatListsInHtml = (html: string): string => {
  if (!html) return '';

  // Normalize spaces first to make regex matching reliable
  let normalized = html.replace(/&nbsp;|\u00A0/g, ' ');

  // 1. Process paragraphs that contain lists split by <br /> or inline asterisks
  let processed = normalized.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (match, content) => {
    if (!/(\*|-|•|&bull;|✳)/.test(content)) return match;
    
    // First, check if it's an inline list in a single paragraph (no newlines/breaks)
    // We detect this if there are multiple asterisks/bullets separated by text.
    const inlineBulletRegex = /\s*(\*|-|•|&bull;|✳)\s+/g;
    const bulletsCount = (content.match(inlineBulletRegex) || []).length;
    
    if (bulletsCount >= 2 && !content.includes('<br') && !content.includes('\n')) {
      const parts = content.split(inlineBulletRegex);
      const cleanParts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          cleanParts.push(parts[i].trim());
        }
      }
      
      const intro = cleanParts[0];
      const items = cleanParts.slice(1);
      
      if (items.length > 0) {
        let lastItem = items[items.length - 1];
        let conclusion = '';
        
        // Find if there is a sentence starter in the last item to extract the conclusion paragraph
        const sentenceStarterRegex = /\s+(By|This|For|Additionally|They|We|It|If|In|Ultimately|To|As|Our|Your|Therefore|With|So)\b/;
        const matchStarter = lastItem.match(sentenceStarterRegex);
        
        if (matchStarter && matchStarter.index !== undefined) {
          conclusion = lastItem.substring(matchStarter.index).trim();
          lastItem = lastItem.substring(0, matchStarter.index).trim();
        }
        
        let listHtml = '<ul>';
        for (let j = 0; j < items.length - 1; j++) {
          listHtml += `<li>${items[j]}</li>`;
        }
        listHtml += `<li>${lastItem}</li>`;
        listHtml += '</ul>';
        
        let finalHtml = '';
        if (intro) {
          finalHtml += `<p>${intro}</p>`;
        }
        finalHtml += listHtml;
        if (conclusion) {
          finalHtml += `<p>${conclusion}</p>`;
        }
        return finalHtml;
      }
    }
    
    // Otherwise, fallback to line-break based list parsing
    const parts = content.split(/<br\s*\/?>|\n/gi);
    let result = '';
    let inList = false;
    
    for (const part of parts) {
      const trimmed = part.trim();
      const listMatch = trimmed.match(/^\s*(\*|-|•|&bull;|✳)\s+(.*)/i);
      
      if (listMatch) {
        if (!inList) {
          result += '<ul>';
          inList = true;
        }
        result += `<li>${listMatch[2]}</li>`;
      } else {
        if (inList) {
          result += '</ul>';
          inList = false;
        }
        if (result && trimmed) {
          result += `<br />${part}`;
        } else {
          result += part;
        }
      }
    }
    if (inList) {
      result += '</ul>';
    }
    
    if (result.startsWith('<ul>') && result.endsWith('</ul>')) {
      return result;
    }
    return `<p>${result}</p>`;
  });

  // 2. Group consecutive paragraphs that are individual bullet points:
  processed = processed.replace(/(?:<p\b[^>]*>\s*(?:\*|-|•|&bull;|✳)\s+([\s\S]*?)<\/p>\s*)+/gi, (match) => {
    const liItems: string[] = [];
    const itemRegex = /<p\b[^>]*>\s*(?:\*|-|•|&bull;|✳)\s+([\s\S]*?)<\/p>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(match)) !== null) {
      liItems.push(`<li>${itemMatch[1].trim()}</li>`);
    }
    if (liItems.length > 0) {
      return `<ul>${liItems.join('')}</ul>`;
    }
    return match;
  });

  return processed;
};

const extractParagraphHtml = (html: string) => {
  const matches = String(html || '').match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
  return matches || [];
};

const buildInlineAlsoReadHtml = (rec: BlogPost) => {
  const title = String(rec.title || '').trim();
  const href = `/blog/${makeBlogSlug(title, rec.id)}`;
  const category = String(rec.category || '').trim();
  return `
    <div class="my-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-4 shadow-sm">
      <p class="m-0 text-[10px] font-black uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">Also read</p>
      <a href="${href}" class="mt-2 block text-base font-bold text-grantify-green hover:underline transition-colors">
        ${escapeHtml(title)}
      </a>
      ${category ? `<p class="m-0 mt-1 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">${escapeHtml(category)}</p>` : ''}
    </div>
  `;
};

const injectInlineRecommendations = (html: string, recs: BlogPost[], title: string) => {
  const cleaned = stripTrailingAlsoReadBlocks(String(html || ''));
  let paragraphs: string[] = extractParagraphHtml(cleaned);

  // If there are no <p> elements (content may be plain text with headings),
  // split on heading boundaries and wrap text fragments as paragraphs so
  // we can reliably inject inline callouts.
  if (!paragraphs || paragraphs.length === 0) {
    const parts = String(cleaned || '').split(/(?=<h[1-6]\b)/i).filter(Boolean);
    paragraphs = parts.map((part) => (part.trim().startsWith('<h') ? part : `<p>${part}</p>`));
  }
  const links = (Array.isArray(recs) ? recs : [])
    .filter((rec) => String(rec?.id || '') && String(rec?.title || '').trim())
    .filter((rec) => String(rec.title || '').trim().toLowerCase() !== String(title || '').trim().toLowerCase())
    .slice(0, 4);

  if (paragraphs.length === 0 || links.length === 0) return cleaned;

  const slotCount = Math.min(3, links.length, paragraphs.length);
  const slots = new Set<number>();
  for (let i = 0; i < slotCount; i += 1) {
    const idx = Math.floor(((i + 1) * paragraphs.length) / (slotCount + 1));
    slots.add(Math.min(Math.max(idx, 0), paragraphs.length - 1));
  }

  let output = '';
  let used = 0;

  for (let i = 0; i < paragraphs.length; i += 1) {
    output += paragraphs[i];
    if (slots.has(i) && used < links.length) {
      output += buildInlineAlsoReadHtml(links[used]);
      used += 1;
    }
  }

  // If for some reason the slotting didn't insert anything but we have links,
  // ensure at least one inline card appears after the first paragraph.
  if (output === cleaned && links.length > 0 && paragraphs.length > 0) {
    return paragraphs[0] + buildInlineAlsoReadHtml(links[0]) + paragraphs.slice(1).join('');
  }

  return output;
};
const buildDiscussionPrompts = (post: BlogPost | null) => {
  const title = String(post?.title || '').trim();
  const category = String(post?.category || '').trim();
  const coreTopic = category || 'financial opportunities';

  const cleanedTitle = title
    .replace(/\s+/g, ' ')
    .replace(/^Nigeria\s*[:\-–]\s*/i, '')
    .replace(/^Nigerian\s*/i, '')
    .trim();

  return [
    `What is the biggest challenge or opportunity you see for SMEs in Nigeria regarding ${coreTopic.toLowerCase()}?`,
    cleanedTitle
      ? `Have you tried applying for "${cleanedTitle}" or a similar scheme? Share your experience.`
      : `Have you ever applied for a similar funding opportunity? What was the process like?`,
    `What advice would you give to another Nigerian entrepreneur trying to leverage this information this week?`,
    `If you have used these tips to secure capital or grow your business, what specific detail made the difference?`,
  ];
};

export const BlogPostView: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost & { comments: BlogComment[] } | null>(null);
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [commentForm, setCommentForm] = useState({ name: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [myReaction, setMyReaction] = useState<'likes' | 'loves' | 'claps' | null>(null);
  const [didCopyLink, setDidCopyLink] = useState(false);
  const [commentsSort, setCommentsSort] = useState<'oldest' | 'newest' | 'helpful'>('oldest');
  const [myLikedComments, setMyLikedComments] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [premiumSponsors, setPremiumSponsors] = useState<any[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_session');
      setIsAdmin(Boolean(saved));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const myUserId = useMemo(() => {
    try {
      const key = 'grantify_uid';
      let id = localStorage.getItem(key);
      if (!id) {
        id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? (globalThis.crypto as Crypto).randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return '';
    }
  }, []);

  const effectiveId = useMemo(() => {
    return slugOrId ? parseBlogParam(slugOrId).id : '';
  }, [slugOrId]);

  const normalizeNbsp = (s: string) => String(s || '').replace(/&nbsp;|\u00A0/g, ' ');

  const postHtml = useMemo(() => {
    const raw = String(post?.content || '').replace(/\u00ad/g, '');
    if (!raw.trim()) return '';
    const normalized = looksLikeHtml(raw) ? raw : plainTextToHtml(raw);
    const withLists = formatListsInHtml(normalized);
    return stripLeadingDuplicateH2(withLists, String(post?.title || ''));
  }, [post?.content, post?.title]);

  const articleHtml = useMemo(() => {
    if (!post) return '';
    const rawHtml = injectInlineRecommendations(postHtml, recommendedPosts, String(post.title || ''));
    return fixLinksInHtml(rawHtml);
  }, [post, postHtml, recommendedPosts]);

  useEffect(() => {
    if (!post) return;
    try {
      const safeTitle = normalizeNbsp(post.title).replace(/\s+/g, ' ').trim();
      document.title = `${safeTitle} | Grantify`;

      const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const description = normalizeNbsp(stripHtml(post.content || '')).slice(0, 160) || 'Discover funding options and learn from community intelligence.';
      const derived = derivePostImage(post);
      const safeImage = (derived && !String(derived).startsWith('data:')) ? String(derived) : '';
      const image = safeImage || '/og-default.svg';

      const setMeta = (selector: string, attr: 'content', value: string) => {
        const el = document.head.querySelector(selector) as HTMLMetaElement | null;
        if (el) el.setAttribute(attr, value);
      };

      setMeta('meta[property="og:title"]', 'content', safeTitle);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[property="og:image"]', 'content', image);
      setMeta('meta[name="twitter:title"]', 'content', safeTitle);
      setMeta('meta[name="twitter:description"]', 'content', description);
      setMeta('meta[name="twitter:image"]', 'content', image);

      const schemaId = 'grantify-article-schema';
      const prev = document.getElementById(schemaId);
      if (prev) prev.remove();

      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: safeTitle,
        description,
        datePublished: String(post.createdAt || post.updatedAt || new Date().toISOString()),
        dateModified: String(post.updatedAt || post.createdAt || new Date().toISOString()),
        author: {
          '@type': 'Person',
          name: normalizeNbsp(post.author || 'Grantify')
        },
        publisher: {
          '@type': 'Organization',
          name: 'Grantify',
          logo: {
            '@type': 'ImageObject',
            url: '/logo.png'
          }
        },
        mainEntityOfPage: `${window.location.origin}${window.location.pathname}`,
        image: image ? [image] : undefined,
        comment: Array.isArray(post.comments) ? post.comments.map(c => ({
          '@type': 'Comment',
          'text': normalizeNbsp(c.content),
          'author': {
            '@type': 'Person',
            'name': normalizeNbsp(c.name)
          },
          'dateCreated': String(c.createdAt)
        })) : []
      };

      const script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);

      return () => {
        const current = document.getElementById(schemaId);
        if (current) current.remove();
      };
    } catch {
      // no-op
    }
  }, [post?.id]);

  const heroImage = useMemo(() => {
    if (!post) return { src: '', isPlaceholder: true };
    const derived = derivePostImage(post);
    return {
      src: derived
        ? withImageCacheBuster(derived, post.updatedAt || post.id)
        : getBlogPlaceholderImage(post.title),
      isPlaceholder: !derived,
    };
  }, [post?.id, post?.image, post?.content, post?.title]);
  const discussionPrompts = useMemo(() => buildDiscussionPrompts(post), [post?.id, post?.title, post?.category]);

  useEffect(() => {
    if (!effectiveId) return;
    fetchPost(effectiveId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId, commentsSort]);

  useEffect(() => {
    if (!post?.id) return;
    if (post.id === 'preview') {
      setRecommendedPosts([]);
      setAds(null);
      return;
    }
    let canceled = false;

    // Load non-critical data in the background so the article renders ASAP.
    ApiService.getBlogRecommendations({
      excludeId: String(post.id),
      limit: 4,
      category: post.category || undefined,
    })
      .then((recs) => {
        if (canceled) return;
        const filtered = (Array.isArray(recs) ? recs : []).filter(p => String(p.id) !== String(post.id));
        setRecommendedPosts(filtered.slice(0, 4));
      })
      .catch(() => {
        if (canceled) return;
        setRecommendedPosts([]);
      });

    ApiService.getAds()
      .then((adData) => {
        if (canceled) return;
        setAds(adData);
      })
      .catch(() => {
        if (canceled) return;
        setAds(null);
      });

    ApiService.getActiveSponsoredListings()
      .then((listings) => {
        if (canceled) return;
        const premium = (listings || []).filter((s: any) => {
          const name = String(s.tier_name || '').toLowerCase();
          return name.includes('premium') || name.includes('gold') || name.includes('enterprise');
        });
        setPremiumSponsors(premium);
      })
      .catch(() => {});

    return () => {
      canceled = true;
    };
  }, [post?.id]);

  useEffect(() => {
    if (!post || !slugOrId) return;
    if (post.id === 'preview' || slugOrId === 'preview') return;
    // Only canonicalize if the URL already refers to this post's ID or slugified title.
    const routeId = parseBlogParam(slugOrId).id;
    const isMatchingId = String(routeId) === String(post.id);
    const isMatchingSlug = slugifyTitle(post.title) === routeId;
    if (!isMatchingId && !isMatchingSlug) return;
    
    const canonical = makeBlogSlug(post.title, post.id);
    if (slugOrId !== canonical) {
      navigate(`/blog/${canonical}`, { replace: true });
    }
  }, [post?.id, post?.title, slugOrId, navigate]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantify_blog_comment_name') || '';
      if (saved && !commentForm.name) {
        setCommentForm(prev => ({ ...prev, name: saved }));
      }
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPost = async (effectiveId: string) => {
    try {
      setIsLoading(true);
      setError('');
      if (effectiveId === 'preview') {
        const rawPreview = localStorage.getItem('grantify_blog_preview_data');
        if (!rawPreview) {
          throw new Error('No preview data found. Please edit a post in the Admin Panel and click "Preview".');
        }
        const data = JSON.parse(rawPreview);
        const previewPost = {
          id: 'preview',
          title: data.title || 'Untitled Draft',
          content: data.content || '',
          author: data.author || 'Author',
          authorRole: data.authorRole || 'Editor',
          category: data.category || 'Finance',
          image: data.image || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          likes: data.likes || 0,
          loves: data.loves || 0,
          claps: data.claps || 0,
          views: data.views || 0,
          commentsCount: 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: []
        };
        setPost(previewPost);
        setIsLoading(false);
        return;
      }
      const data = await ApiService.getBlogPost(effectiveId, { commentsSort });
      setPost(data);

      // Restore client-side reaction highlight (server enforces de-dupe)
      try {
        const stored = localStorage.getItem(`grantify_blog_reaction_${data.id}`);
        if (stored === 'likes' || stored === 'loves' || stored === 'claps') setMyReaction(stored);
        else setMyReaction(null);
      } catch {
        setMyReaction(null);
      }
      
    } catch (e) {
      console.error(e);
      setError('Failed to load the article. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    setCommentForm(prev => {
      const current = prev.content.trim();
      const prefix = `Regarding: "${prompt}"\n\n`;
      if (current.startsWith('Regarding: "')) {
        const cleanContent = current.replace(/^Regarding: ".*?"\n\n/, '');
        return { ...prev, content: prefix + cleanContent };
      }
      return { ...prev, content: current ? `${prefix}${current}` : prefix };
    });
    const el = document.getElementById('comment-textarea');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleReact = async (reactionType: 'likes' | 'loves' | 'claps') => {
    if (!post) return;
    try {
      const res = await ApiService.reactToBlogPost(post.id, reactionType);
      setPost({ ...post, likes: res.likes, loves: res.loves, claps: res.claps });
      setMyReaction(res.myReaction);
      try {
        if (res.myReaction) localStorage.setItem(`grantify_blog_reaction_${post.id}`, res.myReaction);
        else localStorage.removeItem(`grantify_blog_reaction_${post.id}`);
      } catch {
        // no-op
      }
    } catch (e) {
      alert('Failed to react');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!post) return;
    try {
      const res = await ApiService.submitBlogAction({ action: 'likeComment', commentId });
      setPost({
        ...post,
        comments: post.comments.map(c => c.id === commentId ? { ...c, likes: Number(res?.likes ?? c.likes) } : c)
      });
      setMyLikedComments(prev => ({ ...prev, [commentId]: Boolean(res?.liked) }));
    } catch (e: any) {
      alert(e?.message || 'Failed to update helpful vote');
    }
  };

  const handleFlagComment = async (commentId: string) => {
    try {
      await ApiService.flagContent({ entityType: 'blog_comment', entityId: commentId, reason: 'spam' });
      alert('Thanks — reported for review.');
    } catch (e: any) {
      alert(e?.message || 'Failed to report');
    }
  };

  const submitComment = async (payload: { content: string; parentId?: string | null }) => {
    if (!post?.id) return;
    const name = commentForm.name.trim();
    const content = payload.content.trim();
    if (!name || !content) return;

    // Mirror server-side rule to avoid spam/link drops
    if (/(https?:\/\/|\bwww\.)/i.test(content)) {
      alert('Links are not allowed in comments. Please remove any URLs and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.submitBlogAction({
        action: 'comment',
        postId: post.id,
        name,
        content,
        parentId: payload.parentId || undefined
      });
      await fetchPost(String(post.id));
    } catch (e: any) {
      alert(e?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitComment({ content: commentForm.content, parentId: null });
    setCommentForm(prev => ({ ...prev, content: '' }));
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTo) return;
    await submitComment({ content: replyContent, parentId: replyTo });
    setReplyContent('');
    setReplyTo(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p>Loading the Article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-black text-red-700 dark:text-red-400 mb-4">Failed to Load Article</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error || 'The requested article could not be found.'}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => fetchPost(effectiveId)}
              className="bg-grantify-green text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-green-700 transition"
            >
              Retry
            </button>
            <Link
              to="/blog"
              className="border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-950 transition"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const safeTitle = normalizeNbsp(post.title).replace(/\s+/g, ' ').trim();

  const shareSlug = makeBlogSlug(safeTitle, post.id);
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/blog/${shareSlug}`
    : '';

  const shareSummary = (() => {
    try {
      return normalizeNbsp(String(post.content || ''))
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);
    } catch {
      return '';
    }
  })();

  const totalReactions = Number(post.likes || 0) + Number(post.loves || 0) + Number(post.claps || 0);

  const repliesByParent = post.comments.reduce<Record<string, BlogComment[]>>((acc, c) => {
    if (c.parentId) {
      const key = String(c.parentId);
      acc[key] = acc[key] || [];
      acc[key].push(c);
    }
    return acc;
  }, {});

  for (const k of Object.keys(repliesByParent)) {
    repliesByParent[k] = repliesByParent[k]
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const topLevelComments = post.comments.filter(c => !c.parentId);

  const commentCountsByUserId = (() => {
    const m = new Map<string, number>();
    for (const c of post.comments) {
      if (!c.userId) continue;
      m.set(c.userId, (m.get(c.userId) || 0) + 1);
    }
    return m;
  })();

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setDidCopyLink(true);
      window.setTimeout(() => setDidCopyLink(false), 1600);
      return;
    } catch {
      // fall through
    }

    try {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setDidCopyLink(true);
      window.setTimeout(() => setDidCopyLink(false), 1600);
    } catch {
      alert('Copy failed. Please copy the link from the address bar.');
    }
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href) {
        // Identify internal links: root-relative paths starting with / (excluding //)
        // or links matching current window origin.
        const isInternal = (href.startsWith('/') && !href.startsWith('//')) ||
                           href.startsWith(window.location.origin);
        
        if (isInternal) {
          e.preventDefault();
          let path = href;
          if (href.startsWith(window.location.origin)) {
            path = href.substring(window.location.origin.length);
          }
          // Client-side navigation to preserve Single Page App flow
          navigate(path);
        } else {
          const isSpecial = /^(mailto:|tel:|sms:|javascript:)/i.test(href) || href.startsWith('#');
          if (!isSpecial) {
            e.preventDefault();
            const proceed = window.confirm(`You are leaving Grantify to visit: ${href}\n\nDo you want to proceed to this external website?`);
            if (proceed) {
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        }
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-3 sm:px-4 md:px-6">
      <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-300 hover:text-grantify-green mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Blog Intel
      </Link>

      {post.id === 'preview' && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-center py-4 px-6 rounded-3xl mb-8 flex items-center justify-center gap-2 shadow-lg">
          <Sparkles size={18} className="animate-pulse" />
          <span>Wordpress Preview Mode: Viewing unsaved admin draft changes</span>
        </div>
      )}

      <article className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mb-12">
        <div className="overflow-hidden rounded-t-3xl">
          <img
            src={heroImage.src}
            alt={post.title}
            className={heroImage.isPlaceholder ? 'w-full h-80 object-contain p-8' : 'w-full h-80 object-cover'}
            loading="lazy"
          />
        </div>
        
        <div className="p-6 sm:p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-6 font-bold">
            <span className="inline-flex items-center bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full uppercase tracking-widest">{post.category}</span>
            <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-1 rounded-full">
              <Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-1 rounded-full">
              <User size={14} /> {post.author}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-1 rounded-full">
              <Shield size={14} /> {post.authorRole}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-1 rounded-full">
              <Eye size={14} /> {Number(post.views || 0).toLocaleString()} views
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-1 rounded-full">
              <ThumbsUp size={14} /> {Number(totalReactions).toLocaleString()} reactions
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black font-heading text-gray-900 dark:text-gray-100 mb-8 leading-tight break-normal">
            {safeTitle}
          </h1>

          {isAdmin && (
            <div className="mb-8">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-100 hover:border-grantify-green/50 hover:text-grantify-green"
                onClick={() => navigate(`/admin?tab=blog&editPostId=${encodeURIComponent(String(post.id))}`)}
                aria-label="Edit this post"
                title="Edit this post"
              >
                Edit Post
              </button>
            </div>
          )}


          <div lang="en" className="max-w-none text-gray-700 dark:text-gray-200 text-sm leading-relaxed quill-content" onClick={handleContentClick}>
            {ads?.body ? (
              (() => {
                // Since content is now HTML from ReactQuill
                // We'll try to split by the first paragraph ending
                const content = articleHtml;
                const splitIndex = content.indexOf('</p>');
                
                if (splitIndex !== -1) {
                  const firstPart = content.substring(0, splitIndex + 4);
                  const secondPart = content.substring(splitIndex + 4);
                  
                  return (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: firstPart }} />
                      <div className="my-10 flex justify-center">
                        <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-4 rounded-xl shadow-inner max-w-full overflow-hidden w-full">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase block mb-2 text-center tracking-widest">Sponsored Information</span>
                           <AdSlot htmlContent={ads.body} label="" />
                        </div>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: secondPart }} />
                    </>
                  );
                }
                
                return <div dangerouslySetInnerHTML={{ __html: content }} />;
              })()
            ) : (
              <div>
                <div dangerouslySetInnerHTML={{ __html: articleHtml }} />

                {post?.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-sm text-gray-600 dark:text-gray-400 mr-2">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((t) => (
                          <span key={t} className="text-sm font-bold text-grantify-green bg-grantify-green/10 px-2 py-1 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Premium Spotlight Newsletter Editorial Slot */}
                {premiumSponsors.length > 0 && (
                  <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-grantify-gold/10 to-indigo-900/10 dark:from-indigo-950/30 dark:via-grantify-gold/5 dark:to-indigo-950/30 border border-grantify-gold/30">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="bg-grantify-gold text-gray-900 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Newsletter Spotlight
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Sponsored Editorial</span>
                    </div>
                    {premiumSponsors.map((sponsor, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="max-w-xl">
                          <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                            {sponsor.provider_name}
                            <span className="text-xs font-normal text-gray-500">(Verified Partner)</span>
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed italic">
                            "{sponsor.campaign_note || sponsor.description || 'Special credit solutions for small businesses and households.'}"
                          </p>
                        </div>
                        <a
                          href={sponsor.provider_website || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={async () => {
                            try {
                              await ApiService.trackSponsorClick(sponsor.id);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-grantify-green hover:bg-green-700 text-white font-black text-xs px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
                        >
                          Apply Now <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-y border-gray-100 dark:border-gray-800 py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Share2 size={16} /> Share:</span>
              <FacebookShareButton url={shareUrl} className="hover:opacity-80 transition-opacity"><FacebookIcon size={32} round /></FacebookShareButton>
              <TwitterShareButton url={shareUrl} title={safeTitle} className="hover:opacity-80 transition-opacity"><XShareIcon size={32} round /></TwitterShareButton>
              <WhatsappShareButton url={shareUrl} title={safeTitle} separator=" - " className="hover:opacity-80 transition-opacity"><WhatsappIcon size={32} round /></WhatsappShareButton>
              <LinkedinShareButton url={shareUrl} title={safeTitle} summary={shareSummary} source="Grantify" className="hover:opacity-80 transition-opacity"><LinkedinIcon size={32} round /></LinkedinShareButton>

              <button
                type="button"
                onClick={handleCopyShareLink}
                className="w-8 h-8 rounded-full bg-gray-900 text-white inline-flex items-center justify-center hover:opacity-80 transition-opacity"
                title={didCopyLink ? 'Copied!' : 'Copy link'}
                aria-label="Copy link"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleReact('likes')}
                className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all font-bold border ${myReaction === 'likes' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-700'}`}
              >
                <ThumbsUp size={18} className={myReaction === 'likes' ? 'fill-blue-100' : ''} />
                {Number(post.likes || 0).toLocaleString()}
              </button>
              <button
                onClick={() => handleReact('loves')}
                className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all font-bold border ${myReaction === 'loves' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-800 hover:text-red-700'}`}
              >
                <Heart size={18} className={myReaction === 'loves' ? 'fill-red-100' : ''} />
                {Number(post.loves || 0).toLocaleString()}
              </button>
              <button
                onClick={() => handleReact('claps')}
                className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all font-bold border ${myReaction === 'claps' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 hover:text-orange-700'}`}
              >
                <Hand size={18} className={myReaction === 'claps' ? 'fill-orange-100' : ''} />
                {Number(post.claps || 0).toLocaleString()}
              </button>
            </div>

            <button
              type="button"
              onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex items-center gap-2 text-gray-400 dark:text-gray-400 font-bold hover:text-grantify-green transition-colors"
              aria-label="Jump to comments"
              title="Jump to comments"
            >
              <MessageSquare size={20} />
              {post.comments.length} Comments
            </button>
          </div>
        </div>
      </article>

      {/* Tailwind safelist: ensure dynamic/injected classes are present in builds */}
      <div aria-hidden className="hidden">
        <span className="text-grantify-green bg-grantify-green bg-grantify-green/10 bg-grantify-gold/20 border-grantify-green/30 text-grantify-gold text-[10px] font-black uppercase tracking-[0.28em] rounded-2xl shadow-sm" />
        <span className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-4 shadow-sm" />
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500" />
        <span className="text-base font-bold hover:underline transition-colors" />
      </div>

      {/* Recommended Posts */}
      {recommendedPosts.length > 0 && (
        <section className="mb-16">
          <h3 className="text-2xl font-black font-heading text-gray-900 dark:text-gray-100 mb-2">You May Also Like</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">More posts that connect to this story.</p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedPosts.slice(0, 4).map(rec => (
              <Link key={rec.id} to={`/blog/${makeBlogSlug(rec.title, rec.id)}`} className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all min-w-0">
                <div className="h-32 bg-gray-100 dark:bg-gray-950 relative">
                  {(() => {
                    const derived = derivePostImage(rec);
                    const src = derived || getBlogPlaceholderImage(rec.title);
                    return (
                  <img
                    src={src}
                    alt={rec.title}
                    className={derived
                      ? 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                      : 'w-full h-full object-contain p-4'}
                    loading="lazy"
                  />
                    );
                  })()}
                </div>
                <div className="p-4">
                  <span className="text-[10px] bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded font-bold uppercase mb-2 inline-block">
                    {rec.category}
                  </span>
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 leading-tight group-hover:text-grantify-green transition-colors line-clamp-2 text-pretty">
                    {normalizeNbsp(rec.title).replace(/\s+/g, ' ').trim()}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
          {recommendedPosts.length > 4 && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-bold">
              Want more? Browse more articles on the <Link to="/blog" className="text-grantify-green hover:underline">Blog</Link>.
            </div>
          )}
        </section>
      )}

      {/* Engagement Section */}
      <section className="space-y-8">
        <div id="comments" className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 scroll-mt-24">
          <h3 className="text-2xl font-black font-heading text-gray-900 dark:text-gray-100">Community Discussion</h3>

          <div className="flex items-center gap-2">
            {([
              { id: 'oldest', label: 'Oldest' },
              { id: 'newest', label: 'Newest' },
              { id: 'helpful', label: 'Most helpful' }
            ] as const).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCommentsSort(opt.id)}
                className={`text-xs font-black px-3 py-2 rounded-xl border transition ${commentsSort === opt.id ? 'bg-gray-900 dark:bg-gray-950 text-white border-gray-900 dark:border-gray-950' : 'bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h4 className="text-base font-black text-gray-900 dark:text-gray-100">Discussion prompts</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                These are conversation starters for real readers, not synthetic comments.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
              Ask, don’t fake
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {discussionPrompts.map((prompt, index) => (
              <div
                key={index}
                onClick={() => handleSelectPrompt(prompt)}
                className="cursor-pointer rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/60 px-4 py-4 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:border-grantify-green hover:bg-grantify-green/5 dark:hover:bg-grantify-green/5 transition-all duration-300 transform hover:-translate-y-0.5 group"
              >
                <span className="block text-[10px] font-black uppercase tracking-[0.28em] text-grantify-green mb-2 group-hover:text-grantify-gold transition-colors">
                  Prompt {index + 1} — Click to reply
                </span>
                {prompt}
              </div>
            ))}
          </div>
        </div>
        
        {/* Comment Form */}
        <div className="bg-gray-50 dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Your Name"
              className="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-grantify-green bg-white dark:bg-gray-950 shadow-inner outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={commentForm.name}
              onChange={e => {
                const v = e.target.value;
                setCommentForm({ ...commentForm, name: v });
                try { localStorage.setItem('grantify_blog_comment_name', v); } catch { /* no-op */ }
              }}
              required
            />
            <textarea 
              id="comment-textarea"
              rows={4}
              placeholder="Share your thoughts or ask a question..."
              className="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-grantify-green bg-white dark:bg-gray-950 shadow-inner outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={commentForm.content}
              onChange={e => setCommentForm({...commentForm, content: e.target.value})}
              required
            />

            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Links are blocked to reduce spam.
            </div>

            <button 
              disabled={isSubmitting}
              className="bg-grantify-green text-white font-black py-4 px-8 rounded-xl shadow-lg hover:shadow-2xl hover:bg-green-700 transition-all flex items-center gap-2 ml-auto disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              Post Comment
            </button>
          </form>
        </div>

        {/* Comments List */}
        <div className="space-y-6">
          {topLevelComments.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 italic py-8">Be the first to share your thoughts!</p>
          ) : (
            topLevelComments.map(comment => (
              <div key={comment.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-50 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-grantify-green text-white flex items-center justify-center text-xs">
                      {comment.name[0]}
                    </div>
                    <span className="flex items-center gap-2">
                      <span>{comment.name}</span>
                      {comment.userId && comment.userId === myUserId && (
                        <span className="text-[10px] bg-grantify-green/15 text-grantify-green px-2 py-0.5 rounded font-black uppercase">You</span>
                      )}
                      {comment.userId && comment.userId !== myUserId && (commentCountsByUserId.get(comment.userId) || 0) > 1 && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded font-black uppercase">Returning</span>
                      )}
                    </span>
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                    {new Date(comment.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(comment.createdAt!).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{comment.content}</p>

                <div className="flex items-center gap-4 pt-2">
                  <button 
                    onClick={() => handleLikeComment(comment.id)}
                    className={`flex items-center gap-1 transition-colors ${myLikedComments[comment.id] ? 'text-grantify-green' : 'text-gray-400 dark:text-gray-500 hover:text-grantify-green'}`}
                    title={myLikedComments[comment.id] ? 'Helpful (click to undo)' : 'Helpful'}
                    aria-label={myLikedComments[comment.id] ? 'Helpful (undo)' : 'Helpful'}
                  >
                    <ThumbsUp size={14} className={myLikedComments[comment.id] ? 'fill-green-200' : ''} />
                    <span className="text-xs font-bold">{comment.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(comment.id);
                      setReplyContent('');
                    }}
                    className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-grantify-green transition-colors"
                  >
                    Reply
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFlagComment(comment.id)}
                    className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Report for review"
                    aria-label="Report for review"
                  >
                    <Flag size={14} /> Report
                  </button>
                </div>

                {replyTo === comment.id && (
                  <form onSubmit={handleReplySubmit} className="mt-3 space-y-2">
                    <textarea
                      rows={3}
                      className="w-full p-3 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-grantify-green bg-white dark:bg-gray-950 shadow-inner outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Write a reply (no links)..."
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      required
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyContent('');
                        }}
                        className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 bg-grantify-green text-white font-black px-4 py-2 rounded-xl shadow hover:bg-green-700 transition disabled:opacity-70"
                      >
                        <Send size={16} /> Reply
                      </button>
                    </div>
                  </form>
                )}

                {(repliesByParent[comment.id] || []).length > 0 && (
                  <div className="mt-4 space-y-3 border-l border-gray-100 dark:border-gray-800 pl-4">
                    {(repliesByParent[comment.id] || []).map(r => (
                      <div key={r.id} className="bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-grantify-green/90 text-white flex items-center justify-center text-[10px] font-black">
                              {r.name[0]}
                            </div>
                            <span className="font-black text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                              <span>{r.name}</span>
                              {r.userId && r.userId === myUserId && (
                                <span className="text-[10px] bg-grantify-green/15 text-grantify-green px-2 py-0.5 rounded font-black uppercase">You</span>
                              )}
                              {r.userId && r.userId !== myUserId && (commentCountsByUserId.get(r.userId) || 0) > 1 && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded font-black uppercase">Returning</span>
                              )}
                            </span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded font-black uppercase">Reply</span>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                            {new Date(r.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(r.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{r.content}</p>
                        <div className="flex items-center gap-4 pt-3">
                          <button
                            type="button"
                            onClick={() => handleLikeComment(r.id)}
                            className={`flex items-center gap-1 transition-colors ${myLikedComments[r.id] ? 'text-grantify-green' : 'text-gray-400 dark:text-gray-500 hover:text-grantify-green'}`}
                            title={myLikedComments[r.id] ? 'Helpful (click to undo)' : 'Helpful'}
                            aria-label={myLikedComments[r.id] ? 'Helpful (undo)' : 'Helpful'}
                          >
                            <ThumbsUp size={14} className={myLikedComments[r.id] ? 'fill-green-200' : ''} />
                            <span className="text-xs font-bold">{r.likes}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFlagComment(r.id)}
                            className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Report for review"
                            aria-label="Report for review"
                          >
                            <Flag size={14} /> Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-40 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl rounded-full p-3 transition"
          title="Back to top"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
};
