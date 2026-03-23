import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { BlogPost, BlogComment, AdConfig } from '../types';
import { Loader2, ThumbsUp, Heart, Hand, MessageSquare, ArrowLeft, Send, Calendar, User, Shield, Share2, Eye, ArrowUp, Copy } from 'lucide-react';
import { AdSlot } from '../components/AdSlot';
import { FacebookShareButton, TwitterShareButton, WhatsappShareButton, LinkedinShareButton, FacebookIcon, WhatsappIcon, LinkedinIcon } from 'react-share';
import { getBlogPlaceholderImage } from '../utils/blogPlaceholder';
import { makeBlogSlug, parseBlogParam } from '../utils/blogRouting';
import { hyphenateHtml } from '../utils/hyphenateHtml';

const XShareIcon: React.FC<{ size?: number; round?: boolean; bgStyle?: React.CSSProperties; iconFillColor?: string }> = ({
  size = 32,
  round = false,
  bgStyle,
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
      style={bgStyle}
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

  // Split into paragraphs on blank lines.
  const paragraphs = trimmed.split(/\n\s*\n+/g);
  return paragraphs
    .map((p) => {
      const safe = escapeHtml(p).replace(/\n/g, '<br />');
      return `<p>${safe}</p>`;
    })
    .join('\n');
};

export const BlogPostView: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost & { comments: BlogComment[] } | null>(null);
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentForm, setCommentForm] = useState({ name: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [myReaction, setMyReaction] = useState<'likes' | 'loves' | 'claps' | null>(null);
  const [didCopyLink, setDidCopyLink] = useState(false);

  const effectiveId = useMemo(() => {
    return slugOrId ? parseBlogParam(slugOrId).id : '';
  }, [slugOrId]);

  const normalizeNbsp = (s: string) => String(s || '').replace(/&nbsp;|\u00A0/g, ' ');

  const postHtml = useMemo(() => {
    const raw = String(post?.content || '');
    if (!raw.trim()) return '';
    const normalized = looksLikeHtml(raw) ? raw : plainTextToHtml(raw);
    return hyphenateHtml(normalized);
  }, [post?.content]);

  useEffect(() => {
    if (!post) return;
    try {
      const safeTitle = normalizeNbsp(post.title).replace(/\s+/g, ' ').trim();
      document.title = `${safeTitle} | Grantify`;

      const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const description = normalizeNbsp(stripHtml(post.content || '')).slice(0, 160) || 'Discover funding options and learn from community intelligence.';
      const image = (post.image && !String(post.image).startsWith('data:')) ? String(post.image) : '/og-default.svg';

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
    } catch {
      // no-op
    }
  }, [post?.id]);

  useEffect(() => {
    if (!effectiveId) return;
    if (post?.id && String(post.id) === String(effectiveId)) return;
    fetchPost(effectiveId);
  }, [effectiveId, post?.id]);

  useEffect(() => {
    if (!post || !slugOrId) return;
    const canonical = makeBlogSlug(post.title, post.id);
    if (slugOrId !== canonical) {
      navigate(`/blog/${canonical}`, { replace: true });
    }
  }, [post?.id, slugOrId, navigate]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchPost = async (effectiveId: string) => {
    try {
      setIsLoading(true);
      const data = await ApiService.getBlogPost(effectiveId);
      setPost(data);

      // Restore client-side reaction highlight (server enforces de-dupe)
      try {
        const stored = localStorage.getItem(`grantify_blog_reaction_${data.id}`);
        if (stored === 'likes' || stored === 'loves' || stored === 'claps') setMyReaction(stored);
        else setMyReaction(null);
      } catch {
        setMyReaction(null);
      }
      
      // Fetch recommended posts (excluding current one)
      const allPosts = await ApiService.getBlogPosts();
      setRecommendedPosts(allPosts.filter(p => String(p.id) !== String(data.id)).slice(0, 3));

      // Fetch ads
      const adData = await ApiService.getAds();
      setAds(adData);
    } catch (e) {
      console.error(e);
      navigate('/blog');
    } finally {
      setIsLoading(false);
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
      await ApiService.submitBlogAction({ action: 'likeComment', commentId });
      setPost({
        ...post,
        comments: post.comments.map(c => c.id === commentId ? { ...c, likes: c.likes + 1 } : c)
      });
    } catch (e) {
      alert('Failed to like comment');
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
    } catch (e) {
      alert('Failed to post comment');
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

  if (isLoading || !post) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p>Reading the article...</p>
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

  const topLevelComments = post.comments.filter(c => !c.parentId);

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

  return (
    <div className="max-w-5xl mx-auto py-12 px-3 sm:px-4 md:px-6">
      <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-300 hover:text-grantify-green mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Blog Intel
      </Link>

      <article className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mb-12">
        <div className="overflow-hidden rounded-t-3xl">
          <img
            src={post.image || getBlogPlaceholderImage(post.title)}
            alt={post.title}
            className="w-full h-80 object-cover"
            loading="lazy"
          />
        </div>
        
        <div className="p-6 sm:p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-6 font-bold">
            <span className="bg-grantify-gold/20 text-grantify-green px-3 py-1 rounded-full uppercase tracking-widest">{post.category}</span>
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


          <div lang="en" className="max-w-none text-gray-700 dark:text-gray-200 text-sm leading-relaxed quill-content">
            {ads?.body ? (
              (() => {
                // Since content is now HTML from ReactQuill
                // We'll try to split by the first paragraph ending
                const content = postHtml;
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
              <div dangerouslySetInnerHTML={{ __html: postHtml }} />
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

            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-400 font-bold">
              <MessageSquare size={20} />
              {post.comments.length} Comments
            </div>
          </div>
        </div>
      </article>

      {/* Recommended Posts */}
      {recommendedPosts.length > 0 && (
        <section className="mb-16">
          <h3 className="text-2xl font-black font-heading text-gray-900 dark:text-gray-100 mb-6">You Might Also Like</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {recommendedPosts.map(rec => (
              <Link key={rec.id} to={`/blog/${makeBlogSlug(rec.title, rec.id)}`} className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="h-32 bg-gray-100 dark:bg-gray-950 relative">
                  <img
                    src={rec.image || getBlogPlaceholderImage(rec.title)}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <span className="text-[10px] bg-grantify-gold/20 text-grantify-green px-2 py-0.5 rounded font-bold uppercase mb-2 inline-block">
                    {rec.category}
                  </span>
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 leading-tight group-hover:text-grantify-green transition-colors line-clamp-2">
                    {normalizeNbsp(rec.title).replace(/\s+/g, ' ').trim()}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Engagement Section */}
      <section className="space-y-8">
        <h3 className="text-2xl font-black font-heading text-gray-900 dark:text-gray-100">Community Discussion</h3>
        
        {/* Comment Form */}
        <div className="bg-gray-50 dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Your Name"
              className="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-grantify-green bg-white dark:bg-gray-950 shadow-inner outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={commentForm.name}
              onChange={e => setCommentForm({...commentForm, name: e.target.value})}
              required
            />
            <textarea 
              rows={4}
              placeholder="Share your thoughts or ask a question..."
              className="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-grantify-green bg-white dark:bg-gray-950 shadow-inner outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={commentForm.content}
              onChange={e => setCommentForm({...commentForm, content: e.target.value})}
              required
            />

            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Links are blocked to reduce spam. Consider registering for richer discussions and notifications.
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
                    {comment.name}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                    {new Date(comment.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(comment.createdAt!).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{comment.content}</p>

                <div className="flex items-center gap-4 pt-2">
                  <button 
                    onClick={() => handleLikeComment(comment.id)}
                    className="flex items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-grantify-green transition-colors"
                    title="Like"
                    aria-label="Like"
                  >
                    <ThumbsUp size={14} />
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
                            <span className="font-black text-gray-800 dark:text-gray-100 text-sm">{r.name}</span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded font-black uppercase">Reply</span>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                            {new Date(r.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(r.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{r.content}</p>
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
