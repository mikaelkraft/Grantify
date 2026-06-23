import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { BlogPost, LoanProvider } from '../types';
import { Loader2, MessageSquare, ThumbsUp, Heart, Hand, Calendar, ChevronRight, ChevronLeft, Eye, ExternalLink, Zap, Sparkles, ArrowRight, Users, TrendingUp, Target, Layers } from 'lucide-react';
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
  const [activePreviewTab, setActivePreviewTab] = useState<'banner' | 'in-article' | 'directory'>('banner');
  const [estimatorTierId, setEstimatorTierId] = useState<number | null>(null);

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
        const pricingArray = Array.isArray(pricingData) ? pricingData : [];
        setPricing(pricingArray);
        if (pricingArray.length > 0) {
          const std = pricingArray.find((t) => String(t.tierName).toLowerCase().includes('standard')) || pricingArray[0];
          setEstimatorTierId(std.id);
        }
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

  const estimatorMetrics = useMemo(() => {
    if (!estimatorTierId || !pricing.length) return null;
    const tier = pricing.find(t => t.id === estimatorTierId);
    if (!tier) return null;
    
    const name = tier.tierName.toLowerCase();
    if (name.includes('premium')) {
      return {
        impressions: '250,000+',
        ctr: '8.2%',
        clicks: '20,500+',
        cpc: 'NGN 3.41',
        description: 'Maximum exposure top-of-funnel listing placements, newsletter priority slots, and real-time dashboard analytics.',
      };
    }
    if (name.includes('standard')) {
      return {
        impressions: '75,000+',
        ctr: '5.8%',
        clicks: '4,350+',
        cpc: 'NGN 5.75',
        description: 'Featured homepage sponsor banner, highlighted listing styles, and weekly traffic performance reports.',
      };
    }
    return {
      impressions: '15,000+',
      ctr: '2.4%',
      clicks: '360+',
      cpc: 'NGN 13.88',
      description: 'Standard directory search indexing, basic card badge styling, and monthly referral click reports.',
    };
  }, [estimatorTierId, pricing]);

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

      {/* Interactive Media Kit */}
      <div id="media-kit" className="mb-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-grantify-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-grantify-green/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 pb-6 border-b border-white/10">
          <div className="max-w-2xl text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3 flex items-center gap-2">
              <Zap size={12} className="text-grantify-gold animate-bounce" /> Interactive Media Kit
            </p>
            <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3">Partner with Grantify for direct audience reach.</h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Feature your financial services, business resources, or microfinance options directly to a highly-qualified audience of Nigerian business owners and grant applicants.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/sponsor" className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-100 transition-all w-full lg:w-auto text-sm">
              Book Sponsored Slot <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Real-time Audience Platform Metrics */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Monthly Active Visits', value: '45,000+', desc: 'High-intent searchers', icon: <Users size={16} className="text-grantify-gold" /> },
            { label: 'Avg. Click-Through Rate', value: '5.8% - 8.2%', desc: 'Highly optimized slots', icon: <TrendingUp size={16} className="text-grantify-green" /> },
            { label: 'Matched Applications', value: '15,000+', desc: 'Real-time financial intent', icon: <Target size={16} className="text-grantify-gold" /> },
            { label: 'Matched Volume', value: 'NGN 540M+', desc: 'Outreach & conversions', icon: <Layers size={16} className="text-grantify-green" /> }
          ].map((stat, sIdx) => (
            <div key={sIdx} className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm text-left">
              <div className="flex items-center gap-2 mb-2">
                {stat.icon}
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-white">{stat.value}</div>
              <p className="text-[10px] text-white/65 mt-0.5">{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing Tiers Selection & Interactive Estimator Grid */}
        <div className="relative z-10 grid lg:grid-cols-[1.3fr_0.7fr] gap-8">
          
          {/* Left Column: Selector & Estimator */}
          <div className="space-y-6 text-left">
            <div>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                Select Package to Calculate Estimated Campaign Reach
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {pricing.slice(0, 3).map((tier) => {
                  const isSelected = estimatorTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setEstimatorTierId(tier.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isSelected 
                          ? 'border-grantify-green bg-grantify-green/10 text-white ring-2 ring-grantify-green/50' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/80'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider text-grantify-gold mb-1">{tier.tierName}</div>
                      <div className="text-base font-black">{(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</div>
                      <div className="text-[9px] text-white/60 mt-1">{tier.durationDays} Days Duration</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estimated Metrics Output */}
            {estimatorMetrics && (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-grantify-green/5 to-transparent rounded-bl-full pointer-events-none"></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-grantify-gold mb-3">Estimated Performance Indicators</h4>
                <p className="text-xs text-white/85 mb-4 leading-relaxed">{estimatorMetrics.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block mb-1">Target Views</span>
                    <span className="text-base font-black text-white">{estimatorMetrics.impressions}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block mb-1">Estimated CTR</span>
                    <span className="text-base font-black text-grantify-green">{estimatorMetrics.ctr}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block mb-1">Expected Clicks</span>
                    <span className="text-base font-black text-white">{estimatorMetrics.clicks}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase block mb-1">Est. Cost Per Click</span>
                    <span className="text-base font-black text-grantify-gold">{estimatorMetrics.cpc}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visual Ad Placements Mockups */}
          <div className="space-y-4 text-left">
            <div>
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Ad Placement Previews</h3>
              <div className="flex gap-2 mb-3">
                {(['banner', 'in-article', 'directory'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePreviewTab(tab)}
                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                      activePreviewTab === tab
                        ? 'bg-grantify-gold text-gray-900 border-grantify-gold font-bold'
                        : 'border-white/10 text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Dynamic Interactive Preview Mockup Box */}
              {activePreviewTab === 'banner' && (
                <div className="bg-gray-950 p-4 rounded-2xl border border-white/5 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-center justify-between text-[9px] text-white/40 mb-3 border-b border-white/5 pb-2">
                    <span>Homepage Top Banner Mockup</span>
                    <span className="bg-grantify-gold/20 text-grantify-gold px-2 py-0.5 rounded text-[8px] font-black uppercase">Banner Slot</span>
                  </div>
                  <div className="bg-gradient-to-r from-grantify-green/20 via-grantify-gold/15 to-grantify-green/20 rounded-xl p-4 border border-grantify-gold/20 text-center relative shadow-inner">
                    <div className="absolute top-2 right-2 text-[7px] font-black uppercase bg-white/10 px-1.5 py-0.5 rounded text-white/80 tracking-wider">Sponsored</div>
                    <div className="text-xs text-grantify-gold font-black uppercase tracking-wider mb-1">Boost Your Business Capital</div>
                    <div className="text-[9px] text-white/80 mb-2 leading-relaxed">Match with instant credit lines from top Nigerian providers.</div>
                    <span className="inline-block bg-white text-gray-900 font-black text-[8px] px-3 py-1 rounded shadow-md hover:scale-105 transition-transform">Apply Now</span>
                  </div>
                </div>
              )}

              {activePreviewTab === 'in-article' && (
                <div className="bg-gray-950 p-4 rounded-2xl border border-white/5 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-center justify-between text-[9px] text-white/40 mb-3 border-b border-white/5 pb-2">
                    <span>In-Article Inline Mockup</span>
                    <span className="bg-grantify-gold/20 text-grantify-gold px-2 py-0.5 rounded text-[8px] font-black uppercase">Editorial Slot</span>
                  </div>
                  <div className="border border-white/10 bg-white/5 rounded-xl p-3 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[7px] font-bold text-grantify-gold tracking-widest uppercase">SPONSORED SPOTLIGHT</span>
                      <span className="text-[7px] bg-white/10 text-white/70 px-1 rounded">2 min read</span>
                    </div>
                    <div className="text-xs font-bold text-white">Grow your retail outlet with the Retail Credit Scheme</div>
                    <p className="text-[9px] text-white/60 mt-1 leading-relaxed">Featured partner is offering micro-loans with low interest matching for eligible female merchants.</p>
                  </div>
                </div>
              )}

              {activePreviewTab === 'directory' && (
                <div className="bg-gray-950 p-4 rounded-2xl border border-white/5 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-center justify-between text-[9px] text-white/40 mb-3 border-b border-white/5 pb-2">
                    <span>Provider Directory Listing Mockup</span>
                    <span className="bg-grantify-gold/20 text-grantify-gold px-2 py-0.5 rounded text-[8px] font-black uppercase">Highlight Slot</span>
                  </div>
                  <div className="border border-grantify-green bg-grantify-green/5 rounded-xl p-3 flex justify-between items-center relative shadow-inner">
                    <div className="absolute top-1 right-2 text-[7px] font-bold text-grantify-green">PROMOTED</div>
                    <div>
                      <span className="text-[7px] font-black uppercase bg-grantify-green text-white px-2 py-0.5 rounded-full">Recommended</span>
                      <div className="text-xs font-black text-white mt-1">Renmoney Microfinance</div>
                      <div className="text-[8px] text-white/60">Interest rate: 4.5% | Max duration: 24m</div>
                    </div>
                    <span className="bg-white text-gray-900 font-bold text-[8px] px-3 py-1 rounded shadow-md">View Deal</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
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
