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
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [pricing, setPricing] = useState<Array<{ id: number; tierName: string; priceCents: number; durationDays: number; description: string }>>([]);
  const [isLoadingMediaKit, setIsLoadingMediaKit] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState('');
  const [sponsorForm, setSponsorForm] = useState({
    providerId: '',
    tierId: '',
    name: '',
    email: '',
    company: '',
    website: '',
    note: ''
  });

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
      setIsLoadingMediaKit(true);
      try {
        const [providerData, pricingData] = await Promise.all([
          ApiService.getLoanProviders(),
          ApiService.getSponsoredPricing()
        ]);
        setProviders(Array.isArray(providerData) ? providerData : []);
        setPricing(Array.isArray(pricingData) ? pricingData : []);
        setSponsorForm(prev => ({
          ...prev,
          providerId: prev.providerId || String((providerData && providerData[0] && providerData[0].id) || ''),
          tierId: prev.tierId || String((pricingData && pricingData[0] && pricingData[0].id) || '')
        }));
      } catch (e) {
        console.error('Failed to load media kit data', e);
      } finally {
        setIsLoadingMediaKit(false);
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

  const handleLaunchSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunchMessage('');
    setIsLaunching(true);
    try {
      if (!sponsorForm.providerId || !sponsorForm.tierId) {
        throw new Error('Choose a provider and package first.');
      }

      const payerInfo = {
        name: sponsorForm.name,
        email: sponsorForm.email,
        company: sponsorForm.company,
        website: sponsorForm.website,
        note: sponsorForm.note,
        placement: 'blog-media-kit'
      };

      const result = await ApiService.createSponsoredPurchase(Number(sponsorForm.providerId), Number(sponsorForm.tierId), payerInfo);
      if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      setLaunchMessage(result.paymentUrl
        ? 'Sponsorship created. Complete payment in the new tab to activate it.'
        : `Sponsorship request created. Reference ID: ${result.id}. Our team will issue the invoice and confirm activation.`);
    } catch (err: any) {
      setLaunchMessage(err?.message || 'Failed to launch sponsorship.');
    } finally {
      setIsLaunching(false);
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
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3 flex items-center gap-2"><Zap size={12} /> Media Kit</p>
            <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">Book a sponsorship slot and launch directly.</h2>
            <p className="text-sm md:text-base text-white/80 leading-relaxed">
              Choose a package, pick the provider you want featured, and launch a sponsored listing from the same page readers already trust for grants, providers, and business guidance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/sponsor?tier=standard" className="inline-flex items-center gap-2 border border-white/15 text-white font-black px-5 py-3 rounded-xl hover:bg-white/5 transition-all w-full lg:w-auto">
              Contact Sales <ExternalLink size={16} />
            </Link>
          </div>
          <Link to="/sponsor" className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all w-full lg:w-auto">
            Book Now <ArrowRight size={16} />
          </Link>
        </div>

        <div className="relative z-10 grid gap-4 md:grid-cols-3 mt-6">
          {pricing.slice(0, 3).map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSponsorForm(prev => ({ ...prev, tierId: String(tier.id) }))}
              className={`rounded-2xl border p-4 backdrop-blur-sm text-left transition-all ${String(sponsorForm.tierId) === String(tier.id) ? 'border-grantify-gold bg-grantify-gold/10 shadow-lg' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-sm font-black uppercase tracking-widest text-grantify-gold">{tier.tierName}</div>
                <Sparkles size={14} className="text-grantify-gold" />
              </div>
              <div className="text-lg font-black text-white mb-1">{(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</div>
              <p className="text-sm text-white/75 leading-relaxed">{tier.description} · {tier.durationDays} days</p>
              <ul className="mt-3 space-y-1 text-xs text-white/70">
                <li>• Featured placement on the sponsored listings page</li>
                <li>• Included in the media-kit launch flow</li>
                <li>• Invoice and email support from the admin team</li>
              </ul>
            </button>
          ))}
        </div>

        <div id="sponsor-launch" className="relative z-10 mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 md:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg md:text-xl font-black">Direct Advert Launch</h3>
              <p className="text-sm text-white/70">Fill in the form and launch a sponsored listing immediately.</p>
            </div>
            {isLoadingMediaKit && <Loader2 className="animate-spin" size={18} />}
          </div>

          <form onSubmit={handleLaunchSponsor} className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-1">
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Featured Provider</label>
              <select
                value={sponsorForm.providerId}
                onChange={(e) => setSponsorForm(prev => ({ ...prev, providerId: e.target.value }))}
                className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white"
                aria-label="Featured provider"
                title="Featured provider"
                required
              >
                <option value="">Select provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Package</label>
              <select
                value={sponsorForm.tierId}
                onChange={(e) => setSponsorForm(prev => ({ ...prev, tierId: e.target.value }))}
                className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white"
                aria-label="Sponsorship package"
                title="Sponsorship package"
                required
              >
                <option value="">Select package</option>
                {pricing.map((tier) => (
                  <option key={tier.id} value={tier.id}>{tier.tierName} - {(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Your Name</label>
              <input value={sponsorForm.name} onChange={(e) => setSponsorForm(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white placeholder:text-white/30" placeholder="Partner contact name" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Email</label>
              <input type="email" value={sponsorForm.email} onChange={(e) => setSponsorForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white placeholder:text-white/30" placeholder="name@company.com" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Company</label>
              <input value={sponsorForm.company} onChange={(e) => setSponsorForm(prev => ({ ...prev, company: e.target.value }))} className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white placeholder:text-white/30" placeholder="Company / brand" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Website</label>
              <input value={sponsorForm.website} onChange={(e) => setSponsorForm(prev => ({ ...prev, website: e.target.value }))} className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white placeholder:text-white/30" placeholder="https://..." />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">Campaign Note</label>
              <textarea value={sponsorForm.note} onChange={(e) => setSponsorForm(prev => ({ ...prev, note: e.target.value }))} className="w-full rounded-xl bg-gray-950/80 border border-white/10 p-3 text-sm text-white placeholder:text-white/30 min-h-[110px]" placeholder="What do you want to promote? Article, provider listing, homepage slot, or newsletter mention." />
            </div>

            <div className="lg:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-white/70 max-w-2xl">
                {launchMessage ? launchMessage : 'This will create the booking and either open checkout or queue an invoice for admin approval. Partners can use this flow to book sponsored articles, provider slots, or newsletter mentions without waiting on back-and-forth email.'}
              </div>
              <button
                type="submit"
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-2 bg-grantify-gold text-grantify-green font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLaunching ? <Loader2 className="animate-spin" size={16} /> : <>Launch Sponsorship <ArrowRight size={16} /></>}
              </button>
            </div>
          </form>
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
