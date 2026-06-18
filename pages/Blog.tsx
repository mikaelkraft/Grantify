import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { BlogPost, LoanProvider } from '../types';
import { Loader2, MessageSquare, ThumbsUp, Heart, Hand, Calendar, ChevronRight, ChevronLeft, Eye, ExternalLink, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { getBlogPlaceholderImage } from '../utils/blogPlaceholder';
import { derivePostImage, withImageCacheBuster } from '../utils/blogImage';
import { makeBlogPath } from '../utils/blogRouting';

export const Blog: React.FC = () => {
  const PAGE_SIZE = 9;
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [myReactions, setMyReactions] = useState<Record<string, 'likes' | 'loves' | 'claps' | null>>({});
  const [pricing, setPricing] = useState<Array<{ id: number; tierName: string; priceCents: number; durationDays: number; description: string }>>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await ApiService.getBlogPostsPage({ page, pageSize: PAGE_SIZE });
        setPosts(Array.isArray(data.items) ? data.items : []);
        setTotalPosts(Number(data.total || 0));
        setTotalPages(Math.max(1, Number(data.totalPages || 1)));
        try {
          const next: Record<string, 'likes' | 'loves' | 'claps' | null> = {};
          for (const p of (Array.isArray(data.items) ? data.items : [])) {
            const stored = localStorage.getItem(`grantify_blog_reaction_${p.id}`);
            next[p.id] = (stored === 'likes' || stored === 'loves' || stored === 'claps') ? stored : null;
          }
          setMyReactions(next);
        } catch {
          // no-op
        }
      } catch (e) {
        setError('Failed to load blog posts.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [page]);

  useEffect(() => {
    const loadMediaKit = async () => {
      try {
        const pricingData = await ApiService.getSponsoredPricing();
        setPricing(Array.isArray(pricingData) ? pricingData : []);
      } catch (e) {
        console.error('Failed to load media kit data', e);
      }
    };
    void loadMediaKit();
  }, []);

  useEffect(() => {
    if (page > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  const handleReact = async (postId: string, reactionType: 'likes' | 'loves' | 'claps') => {
    try {
      const res = await ApiService.reactToBlogPost(postId, reactionType);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: res.likes, loves: res.loves, claps: res.claps } : p));
      setMyReactions(prev => ({ ...prev, [postId]: res.myReaction }));
      try {
        if (res.myReaction) localStorage.setItem(`grantify_blog_reaction_${postId}`, res.myReaction);
        else localStorage.removeItem(`grantify_blog_reaction_${postId}`);
      } catch {
        // no-op
      }
    } catch {
      // Keep UX minimal: no modal, no redirect
      alert('Failed to react');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p>Loading the latest updates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-3 sm:px-4 md:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black font-heading text-gray-900 dark:text-gray-100 mb-4">Blog Intel</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Expert insights on Nigerian grants, business strategies, and financial management to help you grow.
        </p>
        {totalPosts > 0 && (
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {`Page ${page} of ${totalPages} • ${totalPosts.toLocaleString()} posts`}
          </p>
        )}
      </div>

      <div id="media-kit" className="mb-10 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-grantify-gold/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3 flex items-center gap-2"><Zap size={12} /> Media Kit</p>
            <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">Partner with Grantify for direct audience reach.</h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Book a sponsored slot to feature your services directly to businesses and applicants actively seeking funding options. Select a package below to get started.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/sponsor" className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-100 transition-all w-full lg:w-auto">
              View All Placements <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="relative z-10 grid gap-6 md:grid-cols-3">
          {pricing.slice(0, 3).map((tier) => (
            <Link
              key={tier.id}
              to={`/sponsor?tier=${tier.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 hover:scale-[1.02] p-5 backdrop-blur-sm text-left transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-black uppercase tracking-widest text-grantify-gold">{tier.tierName}</div>
                  <Sparkles size={14} className="text-grantify-gold group-hover:animate-pulse" />
                </div>
                <div className="text-2xl font-black text-white mb-2">{(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</div>
                <p className="text-xs text-white/70 leading-relaxed mb-4">{tier.description} · {tier.durationDays} days</p>
              </div>
              <div className="text-xs font-bold text-grantify-gold group-hover:underline flex items-center gap-1 mt-auto pt-3 border-t border-white/5">
                Book This Tier <ChevronRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 text-center py-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No blog posts available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            (() => {
              const normalizeNbsp = (s: string) => String(s || '').replace(/&nbsp;|\u00A0/g, ' ');

              const previewText = normalizeNbsp(post.content)
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              const safeTitle = normalizeNbsp(post.title)
                .replace(/\s+/g, ' ')
                .trim();

              return (
            <Link 
              key={post.id} 
              to={makeBlogPath(post)}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="aspect-video bg-gray-100 dark:bg-gray-950 overflow-hidden relative">
                {(() => {
                  const derived = derivePostImage(post);
                  const src = derived
                    ? withImageCacheBuster(derived, post.updatedAt || post.id)
                    : getBlogPlaceholderImage(post.title);
                  return (
                <img
                  src={src}
                  alt={post.title}
                  className={derived
                    ? 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                    : 'w-full h-full object-contain p-6'}
                  loading="lazy"
                />
                  );
                })()}
                <div className="absolute top-4 left-4">
                  <span className="bg-gray-50/90 dark:bg-gray-950/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                    {post.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-3 uppercase tracking-widest font-bold">
                  <Calendar size={12} />
                  {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 group-hover:text-grantify-green transition-colors leading-tight">
                  {safeTitle}
                </h3>
                
                <p className="text-sm text-gray-500 dark:text-gray-300 line-clamp-3 mb-6 flex-grow">
                  {previewText}
                </p>
                
                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                    <button
                      className={`flex items-center gap-1 rounded-full px-2 py-1 border transition-colors ${myReactions[post.id] === 'likes' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800' : 'border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-700'}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReact(post.id, 'likes'); }}
                      aria-label="React: like"
                      title="Like"
                      type="button"
                    >
                      <ThumbsUp size={14} className={myReactions[post.id] === 'likes' ? 'fill-blue-100' : ''} />
                      <span className="text-xs">{Number(post.likes || 0).toLocaleString()}</span>
                    </button>
                    <button
                      className={`flex items-center gap-1 rounded-full px-2 py-1 border transition-colors ${myReactions[post.id] === 'loves' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-800 hover:text-red-700'}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReact(post.id, 'loves'); }}
                      aria-label="React: love"
                      title="Love"
                      type="button"
                    >
                      <Heart size={14} className={myReactions[post.id] === 'loves' ? 'fill-red-100' : ''} />
                      <span className="text-xs">{Number(post.loves || 0).toLocaleString()}</span>
                    </button>
                    <button
                      className={`flex items-center gap-1 rounded-full px-2 py-1 border transition-colors ${myReactions[post.id] === 'claps' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800' : 'border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 hover:text-orange-700'}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReact(post.id, 'claps'); }}
                      aria-label="React: clap"
                      title="Clap"
                      type="button"
                    >
                      <Hand size={14} className={myReactions[post.id] === 'claps' ? 'fill-orange-100' : ''} />
                      <span className="text-xs">{Number(post.claps || 0).toLocaleString()}</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1">
                      <MessageSquare size={14} />
                      <span className="text-xs">{post.commentsCount}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <Eye size={14} />
                      <span className="text-xs">{Number(post.views || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-grantify-green font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read More <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-grantify-green/50"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <span className="text-sm font-bold text-gray-500 dark:text-gray-300 min-w-[110px] text-center">
            {`${page} / ${totalPages}`}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-grantify-green/50"
            aria-label="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
