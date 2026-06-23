import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExternalLink, AlertTriangle, ShieldCheck, Info, Loader2, Star, CheckCircle, Zap, Award, Smartphone, MessageCircle, X, Send, CornerDownRight, ThumbsUp, ThumbsDown, Flag, Sparkles } from 'lucide-react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig, LoanProvider, ProviderReview } from '../types';

export const LoanProviders: React.FC = () => {
  const location = useLocation();
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [activeSponsorships, setActiveSponsorships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightProviderId, setHighlightProviderId] = useState<string>('');
  const [lookupRefId, setLookupRefId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);

  // User submission (suggest a provider/app)
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [isSuggestSubmitting, setIsSuggestSubmitting] = useState(false);
  const [suggestForm, setSuggestForm] = useState<Partial<LoanProvider>>({
    name: '',
    website: '',
    description: '',
    loanRange: '',
    interestRange: '',
    tenure: '',
    requirements: '',
    playStoreUrl: '',
    tag: '',
    rating: 0,
    logo: ''
  });
  
  // Review Modal State
  const [selectedProvider, setSelectedProvider] = useState<LoanProvider | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewsSort, setReviewsSort] = useState<'newest' | 'oldest' | 'helpful'>('newest');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, content: '' });
  const [myLikedReviews, setMyLikedReviews] = useState<Record<string, boolean>>({});
  const [myDislikedReviews, setMyDislikedReviews] = useState<Record<string, boolean>>({});
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const myUserIdRef = useRef<string>('');
  const providerCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<number | null>(null);
  if (!myUserIdRef.current) {
    try {
      const key = 'grantify_uid';
      let id = localStorage.getItem(key);
      if (!id) {
        id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? (globalThis.crypto as Crypto).randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
        localStorage.setItem(key, id);
      }
      myUserIdRef.current = id;
    } catch {
      myUserIdRef.current = '';
    }
  }
  const myUserId = myUserIdRef.current;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantify_provider_review_name') || '';
      if (saved && !newReview.name) {
        setNewReview(prev => ({ ...prev, name: saved }));
      }
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search || '');
      const highlight = String(qs.get('highlight') || '').trim();
      setHighlightProviderId(highlight);
    } catch {
      setHighlightProviderId('');
    }
  }, [location.search]);

  useEffect(() => {
    if (!highlightProviderId || isLoading || providers.length === 0) return;

    const match = providers.find((p) => String(p.id || '') === highlightProviderId);
    if (!match) return;

    const key = String(match.id || '');
    const el = providerCardRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightProviderId('');
    }, 3500);

    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [highlightProviderId, isLoading, providers]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [providersData, adsData, activeSponsorshipsData] = await Promise.all([
          ApiService.getLoanProviders(),
          ApiService.getAds(),
          ApiService.getActiveSponsoredListings().catch(() => [])
        ]);
        setProviders(providersData);
        setAds(adsData);
        setActiveSponsorships(Array.isArray(activeSponsorshipsData) ? activeSponsorshipsData : []);
      } catch (e) {
        console.error("Failed to load loan providers", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const loadReviews = async (providerId: number) => {
    setIsReviewsLoading(true);
    try {
      const data = await ApiService.getProviderReviews(providerId, { sort: reviewsSort });
      setReviews(data);
    } catch (e) {
      console.error("Failed to load reviews", e);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProvider?.id) return;
    loadReviews(selectedProvider.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsSort]);

  const handleOpenReviews = (provider: LoanProvider) => {
    setSelectedProvider(provider);
    setReplyTo(null);
    loadReviews(provider.id!);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !newReview.name || !newReview.content) return;

    if (/(https?:\/\/|\bwww\.)/i.test(newReview.content)) {
      alert('Links are not allowed in reviews. Please remove any URLs and try again.');
      return;
    }

    try {
      await ApiService.addProviderReview({
        providerId: selectedProvider.id,
        name: newReview.name,
        rating: replyTo ? 0 : newReview.rating,
        content: newReview.content,
        parentId: replyTo?.id || undefined
      });
      setNewReview({ name: '', rating: 5, content: '' });
      setReplyTo(null);
      loadReviews(selectedProvider.id!);
    } catch (e: any) {
      alert(e?.message || 'Failed to post review');
    }
  };

  const handleHelpfulReview = async (reviewId: string) => {
    try {
      const res = await ApiService.toggleProviderReviewLike(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: Number(res.likes ?? r.likes) } : r));
      setMyLikedReviews(prev => ({ ...prev, [reviewId]: Boolean(res.liked) }));
    } catch (e: any) {
      alert(e?.message || 'Failed to update helpful vote');
    }
  };

  const handleNotHelpfulReview = async (reviewId: string) => {
    try {
      const res = await ApiService.toggleProviderReviewDislike(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, dislikes: Number(res.dislikes ?? r.dislikes ?? 0) } : r));
      setMyDislikedReviews(prev => ({ ...prev, [reviewId]: Boolean(res.disliked) }));
    } catch (e: any) {
      alert(e?.message || 'Failed to update not-helpful vote');
    }
  };

  const handleFlagReview = async (reviewId: string) => {
    try {
      await ApiService.flagContent({ entityType: 'provider_review', entityId: reviewId, reason: 'spam' });
      alert('Thanks — reported for review.');
    } catch (e: any) {
      alert(e?.message || 'Failed to report');
    }
  };

  const renderStars = (rating: number = 0, size = 14) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={size} 
            className={`${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        {rating > 0 && <span className="ml-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">{rating.toFixed(1)}</span>}
      </div>
    );
  };

  const reviewCountsByUserId = (() => {
    const m = new Map<string, number>();
    for (const r of reviews) {
      if (!r.userId) continue;
      m.set(r.userId, (m.get(r.userId) || 0) + 1);
    }
    return m;
  })();

  // Helper to build recursive comment tree
  const ReviewItem: React.FC<{ review: ProviderReview, allReviews: ProviderReview[], depth?: number }> = ({ review, allReviews, depth = 0 }) => {
    const replies = allReviews.filter(r => r.parentId === review.id);
    const date = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
      <div className={`space-y-4 ${depth > 0 ? 'ml-6 mt-4 border-l-2 border-gray-100 dark:border-gray-800 pl-4' : 'border-b border-gray-100 dark:border-gray-800 pb-6'}`}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>{review.name}</span>
              {review.userId && review.userId === myUserId && (
                <span className="text-[10px] bg-grantify-green/15 text-grantify-green px-2 py-0.5 rounded font-black uppercase">You</span>
              )}
              {review.userId && review.userId !== myUserId && (reviewCountsByUserId.get(review.userId) || 0) > 1 && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded font-black uppercase">Returning</span>
              )}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black">{date}</span>
          </div>
          {review.rating > 0 && renderStars(review.rating, 10)}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{review.content}</p>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <button
              type="button"
              onClick={() => handleHelpfulReview(review.id)}
              className={`flex items-center gap-1 text-[10px] font-black uppercase transition-colors ${myLikedReviews[review.id] ? 'text-grantify-green' : 'text-gray-500 dark:text-gray-400 hover:text-grantify-green'}`}
              title={myLikedReviews[review.id] ? 'Helpful (click to undo)' : 'Helpful'}
              aria-label={myLikedReviews[review.id] ? 'Helpful (undo)' : 'Helpful'}
            >
              <ThumbsUp size={12} className={myLikedReviews[review.id] ? 'fill-green-200' : ''} />
              <span>{review.likes || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => handleNotHelpfulReview(review.id)}
              className={`flex items-center gap-1 text-[10px] font-black uppercase transition-colors ${myDislikedReviews[review.id] ? 'text-red-600' : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'}`}
              title={myDislikedReviews[review.id] ? 'Not helpful (click to undo)' : 'Not helpful'}
              aria-label={myDislikedReviews[review.id] ? 'Not helpful (undo)' : 'Not helpful'}
            >
              <ThumbsDown size={12} className={myDislikedReviews[review.id] ? 'fill-red-200' : ''} />
              <span>{Number(review.dislikes || 0)}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setReplyTo({ id: review.id, name: review.name });
                window.setTimeout(() => replyTextareaRef.current?.focus(), 0);
              }}
              className="text-[10px] font-black text-grantify-green uppercase hover:underline flex items-center gap-1"
            >
              <CornerDownRight size={10} /> Reply
            </button>

            <button
              type="button"
              onClick={() => handleFlagReview(review.id)}
              className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
              title="Report for review"
              aria-label="Report for review"
            >
              <Flag size={12} /> Report
            </button>
          </div>
        </div>
        
        {replies.map(reply => (
          <ReviewItem key={reply.id} review={reply} allReviews={allReviews} depth={depth + 1} />
        ))}
      </div>
    );
  };

  const getSponsorshipPriority = (provider: LoanProvider) => {
    const sponsorship = activeSponsorships.find(s => s.provider_id === provider.id);
    if (!sponsorship) return 0;
    const tierName = String(sponsorship.tier_name || '').toLowerCase();
    if (tierName.includes('premium') || tierName.includes('gold') || tierName.includes('enterprise')) {
      return 3;
    }
    if (tierName.includes('standard') || tierName.includes('silver') || tierName.includes('popular')) {
      return 2;
    }
    return 1;
  };

  const handleLookupSponsorId = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupResult(null);
    const cleanId = lookupRefId.replace(/SPO-/i, '').trim();
    const idNum = Number(cleanId);
    if (Number.isNaN(idNum)) {
      setLookupResult({
        success: false,
        title: 'Invalid Format',
        details: 'Sponsorship Reference ID must be a numeric ID (e.g. 101 or SPO-101).'
      });
      return;
    }

    const match = activeSponsorships.find(s => Number(s.id) === idNum);
    if (match) {
      const isCurrentlyActive = match.payment_status === 'paid' && (!match.end_at || new Date(match.end_at) > new Date());
      if (isCurrentlyActive) {
        setLookupResult({
          success: true,
          title: 'Verified Active Sponsorship',
          details: `Reference ID SPO-${match.id} is an ACTIVE, CBN-compliant sponsorship slot for ${match.provider_name || 'Custom Brand'}. Tier: ${match.tier_name || 'Basic'}. Active until ${match.end_at ? new Date(match.end_at).toLocaleDateString() : 'indefinite'}.`,
          providerId: match.provider_id
        });
      } else {
        setLookupResult({
          success: false,
          title: 'Expired Sponsorship',
          details: `Reference ID SPO-${match.id} exists but is currently expired or inactive.`
        });
      }
    } else {
      setLookupResult({
        success: false,
        title: 'Not Found',
        details: `Reference ID SPO-${idNum} could not be found or is not active.`
      });
    }
  };

  const sortedRecommended = React.useMemo(() => {
    const recommended = providers.filter(p => p.isRecommended);
    return [...recommended].sort((a, b) => {
      const prioA = getSponsorshipPriority(a);
      const prioB = getSponsorshipPriority(b);
      if (prioB !== prioA) return prioB - prioA;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [providers, activeSponsorships]);

  const sortedVerified = React.useMemo(() => {
    const verified = providers.filter(p => !p.isRecommended);
    return [...verified].sort((a, b) => {
      const prioA = getSponsorshipPriority(a);
      const prioB = getSponsorshipPriority(b);
      if (prioB !== prioA) return prioB - prioA;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [providers, activeSponsorships]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Section */}
      <div className="bg-grantify-green relative overflow-hidden py-16 px-4 mb-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-grantify-gold/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6 border border-white/20 backdrop-blur-sm">
            <ShieldCheck size={16} /> Community Reviewed
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-heading text-white mb-6 drop-shadow-md">
            Instant Loan Apps
          </h1>
          <p className="text-green-50 text-xl max-w-2xl mx-auto leading-relaxed">
            Select an app below to view community ratings. <br/>
            <span className="font-bold text-white">Read reviews, share your experience, and learn from others</span> before applying.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Important Disclaimer Banner */}
        <div className="bg-white dark:bg-gray-900 border-l-4 border-red-500 p-6 mb-12 rounded-xl shadow-sm flex flex-col md:flex-row items-center md:items-start gap-5 border border-gray-100 dark:border-gray-800">
          <div className="bg-red-50 dark:bg-gray-950 p-3 rounded-full">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <div>
            <h2 className="font-black text-red-700 text-xl mb-2">Important Disclaimer</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              <strong className="text-red-800">Grantify does NOT offer loans directly.</strong> We are an educational platform helping you discover legitimate financial services. 
              The information provided is for reference only. <strong>Always</strong> verify lender details independently and read all terms carefully before sharing sensitive personal data.
            </p>
          </div>
        </div>

        <div className="mb-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-grantify-gold/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3">Partner With Grantify</p>
              <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">Monetize your audience with featured placement, leads, and sponsored editorial.</h2>
              <p className="text-sm md:text-base text-white/80 leading-relaxed max-w-xl">
                Lenders and fintech brands can buy visibility where users are already comparing options. We offer featured listings, lead packages, and sponsored content placements that stay clearly labeled.
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all w-full lg:w-auto"
            >
              Get Featured <ExternalLink size={16} />
            </Link>
          </div>

          <div className="relative z-10 grid gap-4 md:grid-cols-3 mt-6">
            {[
              { title: 'Featured Listing', copy: 'Top placement in the provider grid, badge styling, and priority discovery on high-intent traffic.' },
              { title: 'Qualified Leads', copy: 'Pay for real enquiries from users who are actively comparing lenders and ready to apply.' },
              { title: 'Sponsored Content', copy: 'Run labeled editorial placements in the blog and home page to build trust before the click.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-sm font-black uppercase tracking-widest text-grantify-gold mb-2">{item.title}</div>
                <p className="text-sm text-white/75 leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggest a Loan App */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-12">
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap size={18} className="text-grantify-gold" /> Suggest a Loan App
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Know a legit instant-loan app we should list? Submit the details for review.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestForm(v => !v)}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-950 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-800"
            >
              {showSuggestForm ? (<><X size={16} /> Close</>) : (<><Send size={16} /> Submit Details</>)}
            </button>
          </div>

          {showSuggestForm && (
            <div className="px-6 pb-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSuggestSubmitting(true);
                  try {
                    await ApiService.submitLoanProviderSubmission({
                      name: String(suggestForm.name || '').trim(),
                      website: String(suggestForm.website || '').trim(),
                      description: String(suggestForm.description || '').trim(),
                      loanRange: String(suggestForm.loanRange || '').trim(),
                      interestRange: String(suggestForm.interestRange || '').trim(),
                      tenure: String(suggestForm.tenure || '').trim(),
                      requirements: String(suggestForm.requirements || '').trim(),
                      playStoreUrl: String(suggestForm.playStoreUrl || '').trim(),
                      tag: String(suggestForm.tag || '').trim(),
                      rating: Number(suggestForm.rating || 0),
                      logo: String(suggestForm.logo || '').trim(),
                    });
                    alert('Thanks! Your submission was received for review.');
                    setSuggestForm({
                      name: '', website: '', description: '', loanRange: '', interestRange: '', tenure: '',
                      requirements: '', playStoreUrl: '', tag: '', rating: 0, logo: ''
                    });
                    setShowSuggestForm(false);
                  } catch (err: any) {
                    alert(err?.message || 'Failed to submit. Please try again.');
                  } finally {
                    setIsSuggestSubmitting(false);
                  }
                }}
                className="grid md:grid-cols-2 gap-4"
              >
                <div className="md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">App / Provider Name *</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.name || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g. QuickCash Nigeria"
                    title="App or provider name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Website / Referral Link *</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.website || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, website: e.target.value }))}
                    required
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Description *</label>
                  <textarea
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    rows={3}
                    value={suggestForm.description || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    placeholder="What does the app offer? Any licensing/legitimacy notes?"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Loan Range</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.loanRange || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, loanRange: e.target.value }))}
                    placeholder="NGN 10,000 - NGN 500,000"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Interest Range</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.interestRange || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, interestRange: e.target.value }))}
                    placeholder="e.g. 3% - 15% monthly"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Tenure</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.tenure || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, tenure: e.target.value }))}
                    placeholder="e.g. 14 days - 6 months"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Requirements</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.requirements || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, requirements: e.target.value }))}
                    placeholder="NIN, BVN, Valid ID"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Play Store URL</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.playStoreUrl || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, playStoreUrl: e.target.value }))}
                    placeholder="https://play.google.com/..."
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Tag</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.tag || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, tag: e.target.value }))}
                    placeholder="e.g. Fastest Approval"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Rating (1-5)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={Number(suggestForm.rating || 0)}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                    placeholder="e.g. 4.5"
                    title="Rating from 0 to 5"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Logo URL (Optional)</label>
                  <input
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green"
                    value={suggestForm.logo || ''}
                    onChange={(e) => setSuggestForm(prev => ({ ...prev, logo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSuggestSubmitting}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${isSuggestSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-grantify-green text-white hover:bg-green-700'}`}
                  >
                    {isSuggestSubmitting ? (<><Loader2 className="animate-spin" size={16} /> Sending...</>) : (<>Submit for Review</>)}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Direct Sponsor Reference ID Lookup Widget */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-12 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ShieldCheck size={20} className="text-grantify-green" /> Verify Sponsor Reference ID
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Verify the legitimacy and active status of any microfinance bank, fintech platform, or loan provider's sponsorship slot using their unique Sponsor Reference ID.
              </p>
            </div>
            <form onSubmit={handleLookupSponsorId} className="flex gap-2 w-full md:w-auto">
              <input
                type="text"
                className="w-full md:w-64 p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-grantify-green text-sm text-gray-800 dark:text-gray-150"
                placeholder="Enter Reference ID (e.g. SPO-101)"
                value={lookupRefId}
                onChange={(e) => setLookupRefId(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-grantify-green hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all"
              >
                Verify
              </button>
            </form>
          </div>
          {lookupResult && (
            <div className={`mt-4 p-4 rounded-xl border ${
              lookupResult.success 
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900 dark:text-green-300' 
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-300'
            } text-sm flex items-start gap-3`}>
              <Info className="flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold">{lookupResult.title}</p>
                <p className="text-xs mt-1">{lookupResult.details}</p>
                {lookupResult.providerId && (
                  <button
                    onClick={() => {
                      setHighlightProviderId(String(lookupResult.providerId));
                      const el = providerCardRefs.current[String(lookupResult.providerId)];
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="mt-2 text-xs font-black underline hover:no-underline text-grantify-green dark:text-grantify-gold"
                  >
                    Scroll to Provider Card &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Header Ad Slot */}
        {ads?.header && (
          <div className="mb-12 flex justify-center">
            <div className="bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
              <AdSlot htmlContent={ads.header} label="Sponsored" />
            </div>
          </div>
        )}

        {/* Featured Section */}
        {!isLoading && providers.some(p => p.isRecommended) && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-8 border-b pb-4">
              <Award className="text-grantify-gold" size={28} />
              <div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter">Highly Recommended</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">Premium or featured placements can occupy this section.</p>
              </div>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {sortedRecommended.map((provider, index) => {
                const sponsorship = activeSponsorships.find(s => s.provider_id === provider.id);
                const tierName = sponsorship ? String(sponsorship.tier_name || '').toLowerCase() : '';
                const isPremium = tierName.includes('premium') || tierName.includes('gold') || tierName.includes('enterprise');
                const isStandard = tierName.includes('standard') || tierName.includes('silver') || tierName.includes('popular');

                let cardBorderClass = 'border-grantify-green/20 dark:border-gray-800 hover:border-grantify-green';
                if (highlightProviderId && String(provider.id || '') === highlightProviderId) {
                  cardBorderClass = 'border-grantify-gold ring-4 ring-grantify-gold/30 shadow-2xl -translate-y-1';
                } else if (sponsorship) {
                  if (isPremium) {
                    cardBorderClass = 'border-grantify-gold ring-2 ring-grantify-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.15)] dark:shadow-[0_0_20px_rgba(212,175,55,0.05)] hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:border-grantify-gold';
                  } else if (isStandard) {
                    cardBorderClass = 'border-grantify-green ring-2 ring-grantify-green/30 shadow-[0_0_20px_rgba(34,197,94,0.1)] dark:shadow-[0_0_20px_rgba(34,197,94,0.03)] hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] hover:border-grantify-green';
                  } else {
                    cardBorderClass = 'border-blue-500/30 ring-1 ring-blue-500/10 hover:border-blue-500';
                  }
                }

                return (
                  <div 
                    key={provider.id || `rec-${index}`} 
                    ref={(el) => { if (provider.id != null) providerCardRefs.current[String(provider.id)] = el; }}
                    className={`group relative bg-white dark:bg-gray-900 border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${cardBorderClass}`}
                  >
                    {sponsorship ? (
                      isPremium ? (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-grantify-gold text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={10} /> Premium Partner
                        </div>
                      ) : isStandard ? (
                        <div className="absolute top-0 right-0 bg-grantify-green text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                          <Zap size={10} /> Sponsored Partner
                        </div>
                      ) : (
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                          Sponsored
                        </div>
                      )
                    ) : (
                      <div className="absolute top-0 right-0 bg-grantify-green text-white text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                        Featured
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {provider.logo ? (
                          <img src={provider.logo} alt={provider.name} className="w-12 h-12 object-contain rounded-lg bg-white dark:bg-gray-900 p-1 border border-gray-100 dark:border-gray-800 shadow-sm" />
                        ) : (
                           <div className="w-12 h-12 bg-green-50 dark:bg-gray-950 rounded-lg flex items-center justify-center text-grantify-green font-black text-xl border border-green-100 dark:border-gray-800">
                             {provider.name.charAt(0)}
                           </div>
                        )}
                        <h3 className="text-xl font-black text-grantify-green leading-tight">{provider.name}</h3>
                      </div>
                      {renderStars(provider.rating)}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 line-clamp-3 italic leading-relaxed">
                      "{provider.description}"
                    </p>

                    {sponsorship?.campaign_note && (
                      <div className={`mb-4 p-3 rounded-xl text-xs font-semibold italic flex items-start gap-1.5 border ${
                        isPremium 
                          ? 'bg-grantify-gold/10 dark:bg-grantify-gold/5 border-grantify-gold/20 text-grantify-gold'
                          : isStandard
                            ? 'bg-grantify-green/10 dark:bg-grantify-green/5 border-grantify-green/20 text-grantify-green'
                            : 'bg-blue-500/10 dark:bg-blue-500/5 border-blue-500/20 text-blue-500'
                      }`}>
                        <Sparkles size={13} className="shrink-0 mt-0.5" />
                        <span>"{sponsorship.campaign_note}"</span>
                      </div>
                    )}

                  <div className="space-y-3 mb-8 bg-green-50/50 dark:bg-gray-950 p-4 rounded-xl border border-green-100 dark:border-gray-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-green-700 font-bold uppercase tracking-wider">Loan Range</span>
                      <span className="font-black text-gray-800 dark:text-gray-100">{provider.loanRange}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-green-700 font-bold uppercase tracking-wider">Interest</span>
                      <span className="font-black text-gray-800 dark:text-gray-100">{provider.interestRange}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-6 font-bold uppercase overflow-hidden">
                    <Smartphone size={14} className="flex-shrink-0" />
                    <span className="truncate">{provider.requirements || "Standard Requirements"}</span>
                  </div>

                  <div className="flex gap-2">
                    <a 
                      href={provider.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => {
                        const sponsorship = activeSponsorships.find(s => s.provider_id === provider.id);
                        if (sponsorship?.id) {
                          void ApiService.trackSponsorClick(sponsorship.id);
                        }
                      }}
                      className="flex-[2] flex items-center justify-center gap-2 bg-grantify-green text-white py-3 rounded-lg text-xs font-bold transition-all group-hover:bg-green-700 group-hover:shadow-md"
                    >
                      APPLY NOW <ExternalLink size={14} />
                    </a>
                    <button 
                      onClick={() => handleOpenReviews(provider)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-200 py-3 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-900 transition-all border border-gray-200 dark:border-gray-800"
                      aria-label="Read Reviews"
                      title="Read & Write Reviews"
                    >
                      <MessageCircle size={16} /> Reviews
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* All Providers Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter flex items-center gap-2">
                <CheckCircle className="text-green-500" size={24} /> Verified Lenders
              </h2>
              <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">Browse our complete list of approved digital banks</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <Loader2 className="animate-spin text-grantify-green mb-4" size={48} />
              <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing Lenders Database...</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedVerified.map((provider, index) => {
                const sponsorship = activeSponsorships.find(s => s.provider_id === provider.id);
                const tierName = sponsorship ? String(sponsorship.tier_name || '').toLowerCase() : '';
                const isPremium = tierName.includes('premium') || tierName.includes('gold') || tierName.includes('enterprise');
                const isStandard = tierName.includes('standard') || tierName.includes('silver') || tierName.includes('popular');

                let cardBorderClass = 'border-gray-100 dark:border-gray-800';
                if (highlightProviderId && String(provider.id || '') === highlightProviderId) {
                  cardBorderClass = 'border-grantify-gold ring-4 ring-grantify-gold/30 shadow-xl';
                } else if (sponsorship) {
                  if (isPremium) {
                    cardBorderClass = 'border-grantify-gold ring-2 ring-grantify-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.15)] dark:shadow-[0_0_20px_rgba(212,175,55,0.05)] hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:border-grantify-gold';
                  } else if (isStandard) {
                    cardBorderClass = 'border-grantify-green ring-2 ring-grantify-green/30 shadow-[0_0_20px_rgba(34,197,94,0.1)] dark:shadow-[0_0_20px_rgba(34,197,94,0.03)] hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] hover:border-grantify-green';
                  } else {
                    cardBorderClass = 'border-blue-500/30 ring-1 ring-blue-500/10 hover:border-blue-500';
                  }
                }

                return (
                  <div 
                    key={provider.id || index} 
                    ref={(el) => { if (provider.id != null) providerCardRefs.current[String(provider.id)] = el; }}
                    className={`bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-900 border rounded-2xl p-6 transition-all duration-200 hover:shadow-lg flex flex-col h-full group relative overflow-hidden ${cardBorderClass}`}
                  >
                    {sponsorship && (
                      isPremium ? (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-grantify-gold text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-0.5 z-10">
                          <Sparkles size={8} className="shrink-0" /> Premium Partner
                        </div>
                      ) : isStandard ? (
                        <div className="absolute top-0 right-0 bg-grantify-green text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-0.5 z-10">
                          <Zap size={8} className="shrink-0" /> Sponsored Partner
                        </div>
                      ) : (
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider z-10">
                          Sponsored
                        </div>
                      )
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-grow flex items-start gap-3">
                        {provider.logo ? (
                           <img src={provider.logo} alt={provider.name} className="w-10 h-10 object-contain rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800" />
                        ) : (
                           <div className="w-10 h-10 bg-gray-50 dark:bg-gray-950 rounded flex items-center justify-center text-gray-400 font-bold border border-gray-100 dark:border-gray-800">
                             {provider.name.charAt(0)}
                           </div>
                        )}
                        <div>
                          {provider.tag && (
                            <span className="inline-block bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter mb-1">
                              {provider.tag}
                            </span>
                          )}
                          <h3 className="font-black text-gray-800 dark:text-gray-100 group-hover:text-grantify-green transition-colors leading-tight">{provider.name}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        {renderStars(provider.rating)}
                      </div>
                    </div>

                    <p className="text-gray-500 dark:text-gray-300 text-xs mb-6 flex-grow line-clamp-3">{provider.description}</p>

                    {sponsorship?.campaign_note && (
                      <div className={`mb-4 p-2.5 rounded-xl text-[11px] font-semibold italic flex items-start gap-1 border ${
                        isPremium 
                          ? 'bg-grantify-gold/10 dark:bg-grantify-gold/5 border-grantify-gold/20 text-grantify-gold'
                          : isStandard
                            ? 'bg-grantify-green/10 dark:bg-grantify-green/5 border-grantify-green/20 text-grantify-green'
                            : 'bg-blue-500/10 dark:bg-blue-500/5 border-blue-500/20 text-blue-500'
                      }`}>
                        <Sparkles size={11} className="shrink-0 mt-0.5" />
                        <span>"{sponsorship.campaign_note}"</span>
                      </div>
                    )}
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-950 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold uppercase mb-0.5">Rate</span>
                      <span className="text-[11px] font-black text-gray-700 dark:text-gray-100">{provider.interestRange}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-950 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold uppercase mb-0.5">Tenure</span>
                      <span className="text-[11px] font-black text-gray-700 dark:text-gray-100">{provider.tenure}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a 
                      href={provider.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => {
                        const sponsorship = activeSponsorships.find(s => s.provider_id === provider.id);
                        if (sponsorship?.id) {
                          void ApiService.trackSponsorClick(sponsorship.id);
                        }
                      }}
                      className="flex-[3] inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl text-xs font-black hover:bg-grantify-green transition-all"
                    >
                      Visit Site <ExternalLink size={14} />
                    </a>
                    <button 
                      onClick={() => handleOpenReviews(provider)}
                      className="flex-1 inline-flex items-center justify-center bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-900 transition-all border border-gray-200 dark:border-gray-800"
                      aria-label="View Reviews"
                      title="View Reviews"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
                );
              })}
              
              {providers.length === 0 && (
                <div className="col-span-full py-20 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                  <div className="max-w-xs mx-auto">
                    <Zap className="text-gray-300 mx-auto mb-4" size={40} />
                    <p className="text-gray-400 dark:text-gray-500 font-medium">No providers matching your criteria were found. Please check back later.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Body Ad Slot */}
        {ads?.body && (
          <div className="my-16 flex justify-center bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <AdSlot htmlContent={ads.body} label="Featured Promotion" />
          </div>
        )}

        {/* Educational Section / FAQ Style */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
            <ShieldCheck className="mb-4 text-blue-200" size={40} />
            <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter leading-tight">Safety First Protocol</h3>
            <ul className="space-y-3">
              {[
                "Never pay any 'processing fee' upfront",
                "Only download apps from official stores",
                "Protect your BVN and NIN carefully",
                "Verify lender lists on CBN's official site"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-medium text-blue-50">
                  <CheckCircle size={16} className="text-blue-300 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
            <Info className="text-grantify-green mb-4" size={40} />
            <h3 className="text-2xl font-black mb-4 text-gray-800 dark:text-gray-100 uppercase tracking-tighter leading-tight">Borrow Smart</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
              Taking a loan is a major responsibility. We advise calculating your debt-to-income ratio before committing. 
              The lenders listed here offer varying terms—compare at least three before deciding.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-950 text-gray-500 dark:text-gray-300 px-3 py-1.5 rounded-full uppercase border border-gray-200 dark:border-gray-800">Term Comparison</span>
              <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-950 text-gray-500 dark:text-gray-300 px-3 py-1.5 rounded-full uppercase border border-gray-200 dark:border-gray-800">Late Fee Check</span>
              <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-950 text-gray-500 dark:text-gray-300 px-3 py-1.5 rounded-full uppercase border border-gray-200 dark:border-gray-800">Credit Impact</span>
            </div>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Information last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Grantify Data Engine
          </p>
        </div>

        <div className="mt-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-gray-900 text-white p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3">Monetize This Directory</p>
              <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">Buy placement where users are actively choosing a lender.</h2>
              <p className="text-sm md:text-base text-white/80 leading-relaxed">
                Upgrade to a featured slot, run a sponsored listing, or capture lead-intent traffic from people comparing offers in real time.
              </p>
            </div>
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all w-full lg:w-auto">
              Request Pricing <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Review Sidebar / Tray */}
      <div className={`fixed inset-0 z-50 transition-visibility duration-300 ${selectedProvider ? 'visible' : 'invisible'}`}>
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${selectedProvider ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setSelectedProvider(null)}
        />
        <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 transform flex flex-col border-l border-gray-100 dark:border-gray-800 ${selectedProvider ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950">
            <div>
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter">User Reviews</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">{selectedProvider?.name}</p>
            </div>
            <button 
              onClick={() => setSelectedProvider(null)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-6">
            {!isReviewsLoading && selectedProvider && (
              <div className="flex items-center justify-end gap-2 mb-4">
                {([
                  { id: 'newest', label: 'Newest' },
                  { id: 'helpful', label: 'Most helpful' },
                  { id: 'oldest', label: 'Oldest' }
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReviewsSort(opt.id)}
                    className={`text-[10px] font-black px-3 py-2 rounded-xl border transition uppercase tracking-widest ${reviewsSort === opt.id ? 'bg-gray-900 dark:bg-gray-950 text-white border-gray-900 dark:border-gray-950' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {isReviewsLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest">Loading Feedback...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-300 italic text-center px-10">
                <MessageCircle size={48} />
                <p>No reviews yet for {selectedProvider?.name}. Be the first to share your experience!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.filter(r => !r.parentId).map(review => (
                  <ReviewItem key={review.id} review={review} allReviews={reviews} />
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-widest">
              {replyTo ? `Replying to Review` : `Post a Review`}
            </h3>

            {replyTo && (
              <div className="mb-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2">
                <div className="text-xs text-gray-700 dark:text-gray-200 font-bold">
                  Replying to <span className="text-grantify-green">{replyTo.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-[10px] font-black text-red-500 uppercase"
                >
                  Cancel
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input 
                    type="text"
                    required
                    placeholder="Your Name"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-grantify-green text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    value={newReview.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewReview({ ...newReview, name: v });
                      try { localStorage.setItem('grantify_provider_review_name', v); } catch { /* no-op */ }
                    }}
                  />
                </div>
                {!replyTo && (
                  <div className="flex-1">
                    <select 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-grantify-green text-gray-900 dark:text-gray-100"
                      value={newReview.rating}
                      onChange={(e) => setNewReview({...newReview, rating: parseInt(e.target.value)})}
                      aria-label="Rating"
                    >
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <textarea 
                  required
                  placeholder={replyTo ? "Write your reply..." : "Share your honest experience..."}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-grantify-green min-h-[100px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  value={newReview.content}
                  onChange={(e) => setNewReview({...newReview, content: e.target.value})}
                  ref={replyTextareaRef}
                />
                <button 
                  type="submit"
                  className="absolute bottom-4 right-4 bg-grantify-green text-white p-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                  aria-label="Submit Review"
                  title="Submit Review"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
