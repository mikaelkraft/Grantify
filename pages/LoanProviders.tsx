import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle, ShieldCheck, Info, Loader2, Star, CheckCircle, Zap, Award, Smartphone, MessageCircle, X, Send, CornerDownRight } from 'lucide-react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig, LoanProvider, ProviderReview } from '../types';

export const LoanProviders: React.FC = () => {
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review Modal State
  const [selectedProvider, setSelectedProvider] = useState<LoanProvider | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, content: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [providersData, adsData] = await Promise.all([
          ApiService.getLoanProviders(),
          ApiService.getAds()
        ]);
        setProviders(providersData);
        setAds(adsData);
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
      const data = await ApiService.getProviderReviews(providerId);
      setReviews(data);
    } catch (e) {
      console.error("Failed to load reviews", e);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const handleOpenReviews = (provider: LoanProvider) => {
    setSelectedProvider(provider);
    setReplyTo(null);
    loadReviews(provider.id!);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !newReview.name || !newReview.content) return;

    try {
      await ApiService.addProviderReview({
        providerId: selectedProvider.id,
        name: newReview.name,
        rating: replyTo ? 0 : newReview.rating,
        content: newReview.content,
        parentId: replyTo || undefined
      });
      setNewReview({ name: '', rating: 5, content: '' });
      setReplyTo(null);
      loadReviews(selectedProvider.id!);
    } catch (e) {
      alert("Failed to post review");
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
        {rating > 0 && <span className="ml-1.5 text-xs font-bold text-gray-600">{rating.toFixed(1)}</span>}
      </div>
    );
  };

  // Helper to build recursive comment tree
  const ReviewItem: React.FC<{ review: ProviderReview, allReviews: ProviderReview[], depth?: number }> = ({ review, allReviews, depth = 0 }) => {
    const replies = allReviews.filter(r => r.parentId === review.id);
    const date = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
      <div className={`space-y-4 ${depth > 0 ? 'ml-6 mt-4 border-l-2 border-gray-100 pl-4' : 'border-b pb-6'}`}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-800">{review.name}</span>
            <span className="text-[10px] text-gray-400 uppercase font-black">{date}</span>
          </div>
          {review.rating > 0 && renderStars(review.rating, 10)}
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.content}</p>
          <button 
            onClick={() => setReplyTo(review.id)}
            className="text-[10px] font-black text-grantify-green uppercase mt-1 hover:underline flex items-center gap-1"
          >
            <CornerDownRight size={10} /> Reply
          </button>
        </div>
        
        {replies.map(reply => (
          <ReviewItem key={reply.id} review={reply} allReviews={allReviews} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-grantify-green relative overflow-hidden py-16 px-4 mb-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-grantify-gold/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black font-heading text-white mb-6 drop-shadow-md">
            Verified Loan Providers
          </h1>
          <p className="text-green-50 text-xl max-w-2xl mx-auto leading-relaxed">
            We've curated and vetted the most reliable CBN-approved digital lenders in Nigeria to help you fund your growth safely.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Important Disclaimer Banner */}
        <div className="bg-white border-l-4 border-red-500 p-6 mb-12 rounded-xl shadow-sm flex flex-col md:flex-row items-center md:items-start gap-5">
          <div className="bg-red-50 p-3 rounded-full">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <div>
            <h2 className="font-black text-red-700 text-xl mb-2">Important Disclaimer</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              <strong className="text-red-800">Grantify does NOT offer loans directly.</strong> We are an educational platform helping you discover legitimate financial services. 
              The information provided is for reference only. <strong>Always</strong> verify lender details independently and read all terms carefully before sharing sensitive personal data.
            </p>
          </div>
        </div>

        {/* Header Ad Slot */}
        {ads?.header && (
          <div className="mb-12 flex justify-center">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
              <AdSlot htmlContent={ads.header} label="Sponsored" />
            </div>
          </div>
        )}

        {/* Featured Section */}
        {!isLoading && providers.some(p => p.isRecommended) && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-8 border-b pb-4">
              <Award className="text-grantify-gold" size={28} />
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Highly Recommended</h2>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {providers.filter(p => p.isRecommended).map((provider, index) => (
                <div 
                  key={provider.id || `rec-${index}`} 
                  className="group relative bg-white border-2 border-grantify-green/20 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:border-grantify-green hover:-translate-y-1 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-grantify-green text-white text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                    Top Pick
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {provider.logo ? (
                        <img src={provider.logo} alt={provider.name} className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-gray-100 shadow-sm" />
                      ) : (
                         <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-grantify-green font-black text-xl border border-green-100">
                           {provider.name.charAt(0)}
                         </div>
                      )}
                      <h3 className="text-xl font-black text-grantify-green leading-tight">{provider.name}</h3>
                    </div>
                    {renderStars(provider.rating)}
                  </div>

                  <p className="text-gray-600 text-sm mb-6 line-clamp-3 italic leading-relaxed">
                    "{provider.description}"
                  </p>

                  <div className="space-y-3 mb-8 bg-green-50/50 p-4 rounded-xl border border-green-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-green-700 font-bold uppercase tracking-wider">Loan Range</span>
                      <span className="font-black text-gray-800">{provider.loanRange}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-green-700 font-bold uppercase tracking-wider">Interest</span>
                      <span className="font-black text-gray-800">{provider.interestRange}</span>
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
                      className="flex-[2] flex items-center justify-center gap-2 bg-grantify-green text-white py-3 rounded-lg text-xs font-bold transition-all group-hover:bg-green-700 group-hover:shadow-md"
                    >
                      APPLY NOW <ExternalLink size={14} />
                    </a>
                    <button 
                      onClick={() => handleOpenReviews(provider)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all"
                      aria-label="View Reviews"
                      title="View Reviews"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Providers Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                <CheckCircle className="text-green-500" size={24} /> Verified Lenders
              </h2>
              <p className="text-gray-500 text-sm mt-1">Browse our complete list of approved digital banks</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Loader2 className="animate-spin text-grantify-green mb-4" size={48} />
              <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing Lenders Database...</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {providers.filter(p => !p.isRecommended).map((provider, index) => (
                <div 
                  key={provider.id || index} 
                  className="bg-white hover:bg-gray-50/50 border border-gray-100 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg flex flex-col h-full group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-grow flex items-start gap-3">
                      {provider.logo ? (
                         <img src={provider.logo} alt={provider.name} className="w-10 h-10 object-contain rounded bg-white border border-gray-100" />
                      ) : (
                         <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center text-gray-400 font-bold border border-gray-100">
                           {provider.name.charAt(0)}
                         </div>
                      )}
                      <div>
                        {provider.tag && (
                          <span className="inline-block bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter mb-1">
                            {provider.tag}
                          </span>
                        )}
                        <h3 className="font-black text-gray-800 group-hover:text-grantify-green transition-colors leading-tight">{provider.name}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      {renderStars(provider.rating)}
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs mb-6 flex-grow line-clamp-3">{provider.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase mb-0.5">Rate</span>
                      <span className="text-[11px] font-black text-gray-700">{provider.interestRange}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase mb-0.5">Tenure</span>
                      <span className="text-[11px] font-black text-gray-700">{provider.tenure}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a 
                      href={provider.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-[3] inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl text-xs font-black hover:bg-grantify-green transition-all"
                    >
                      Visit Site <ExternalLink size={14} />
                    </a>
                    <button 
                      onClick={() => handleOpenReviews(provider)}
                      className="flex-1 inline-flex items-center justify-center bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                      aria-label="View Reviews"
                      title="View Reviews"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {providers.length === 0 && (
                <div className="col-span-full py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                  <div className="max-w-xs mx-auto">
                    <Zap className="text-gray-300 mx-auto mb-4" size={40} />
                    <p className="text-gray-400 font-medium">No providers matching your criteria were found. Please check back later.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Body Ad Slot */}
        {ads?.body && (
          <div className="my-16 flex justify-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
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

          <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm">
            <Info className="text-grantify-green mb-4" size={40} />
            <h3 className="text-2xl font-black mb-4 text-gray-800 uppercase tracking-tighter leading-tight">Borrow Smart</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Taking a loan is a major responsibility. We advise calculating your debt-to-income ratio before committing. 
              The lenders listed here offer varying terms—compare at least three before deciding.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full uppercase">Term Comparison</span>
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full uppercase">Late Fee Check</span>
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full uppercase">Credit Impact</span>
            </div>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-gray-100">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Information last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Grantify Data Engine
          </p>
        </div>
      </div>

      {/* Review Sidebar / Tray */}
      <div className={`fixed inset-0 z-50 transition-visibility duration-300 ${selectedProvider ? 'visible' : 'invisible'}`}>
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${selectedProvider ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setSelectedProvider(null)}
        />
        <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl transition-transform duration-300 transform flex flex-col ${selectedProvider ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter">User Reviews</h2>
              <p className="text-xs text-gray-500 font-bold uppercase">{selectedProvider?.name}</p>
            </div>
            <button 
              onClick={() => setSelectedProvider(null)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-6">
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

          <div className="p-6 border-t bg-gray-50">
            <h3 className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">
              {replyTo ? `Replying to Review` : `Post a Review`}
            </h3>
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input 
                    type="text"
                    required
                    placeholder="Your Name"
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-grantify-green"
                    value={newReview.name}
                    onChange={(e) => setNewReview({...newReview, name: e.target.value})}
                  />
                </div>
                {!replyTo && (
                  <div className="flex-1">
                    <select 
                      className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-grantify-green"
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
                  className="w-full bg-white border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-grantify-green min-h-[100px]"
                  value={newReview.content}
                  onChange={(e) => setNewReview({...newReview, content: e.target.value})}
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

              {replyTo && (
                <button 
                  type="button" 
                  onClick={() => setReplyTo(null)}
                  className="text-[10px] font-black text-red-500 uppercase"
                >
                  Cancel Reply
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
