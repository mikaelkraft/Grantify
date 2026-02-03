import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { TestimonialCard } from '../components/TestimonialCard';
import { RecentApplicantsTicker } from '../components/RecentApplicantsTicker';
import { BlogTicker } from '../components/BlogTicker';
import { matchGrantNetwork, GRANT_NETWORKS } from '../utils/grantMatcher';
import { LoanType, ApplicationStatus, LoanApplication, Testimonial, QualifiedPerson, AdConfig, BlogPost, GrantNetwork } from '../types';
import { 
  Calculator, CheckCircle, AlertCircle, ArrowRight, Share2, Copy, 
  Info, Loader2, MessageSquarePlus, Send, Zap, Landmark, 
  ExternalLink, ShieldCheck, Search, Award, TrendingUp, Sparkles,
  BookOpen, ChevronRight
} from 'lucide-react';
import { formatNaira, formatNairaCompact } from '../utils/currency';

export const Home: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    country: 'Nigeria',
    amount: '',
    purpose: '',
    businessType: '',
    referralCode: ''
  });
  
  const [matchedNetwork, setMatchedNetwork] = useState<GrantNetwork | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data State
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [qualifiedPersons, setQualifiedPersons] = useState<QualifiedPerson[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [referralData] = useState(ApiService.getMyReferralData());

  useEffect(() => {
    // 1. Fetch Ads Immediately for speed
    const loadAds = async () => {
      try {
        const fetchedAds = await ApiService.getAds();
        setAds(fetchedAds);
      } catch (e) {
        console.warn("Failed to load ads early", e);
      }
    };
    loadAds();

    // 2. Fetch other content
    const loadData = async () => {
      try {
        const [fetchedTestimonials, fetchedQualified, fetchedBlog] = await Promise.all([
          ApiService.getTestimonials(),
          ApiService.getQualified(),
          ApiService.getBlogPosts()
        ]);
        setAllTestimonials(fetchedTestimonials);
        setQualifiedPersons(fetchedQualified);
        setBlogPosts(fetchedBlog.slice(0, 3));
      } catch (e) {
        console.error("Failed to load home data", e);
        setError('Failed to load data. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePurposeChange = (val: string) => {
    setFormData({ ...formData, purpose: val });
    if (val.length > 10) {
      const match = matchGrantNetwork(val);
      setMatchedNetwork(match);
    } else {
      setMatchedNetwork(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple validation
    if (!formData.phone.match(/^[0-9+]{10,14}$/)) {
      setError('Please enter a valid phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newApp: LoanApplication = {
        id: Date.now().toString(),
        fullName: formData.fullName,
        phoneNumber: formData.phone,
        email: formData.email,
        country: formData.country,
        amount: parseInt(formData.amount) || 0,
        purpose: formData.purpose,
        businessType: formData.businessType,
        matchedNetwork: matchedNetwork?.name || 'General Financial Hub',
        type: LoanType.GRANT,
        status: ApplicationStatus.PENDING,
        dateApplied: new Date().toISOString().split('T')[0],
        referralCode: formData.referralCode
      };

      await ApiService.addApplication(newApp);
      setSubmitted(true);
    } catch (e) {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p className="font-bold tracking-widest uppercase text-xs">Calibrating Grant Matcher...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-grantify-green p-12 text-center text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <CheckCircle className="w-20 h-20 text-grantify-gold mx-auto mb-6" />
            <h2 className="text-4xl font-black font-heading mb-4">Application Success!</h2>
            <p className="text-green-100 text-lg">
              You've been successfully matched with the <span className="text-grantify-gold font-bold underline">{matchedNetwork?.name || 'appropriate grant body'}</span>.
            </p>
          </div>
          <div className="p-12 space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <span className="text-[10px] uppercase font-black text-gray-400 block mb-2">Matched Body</span>
                <span className="text-xl font-bold text-gray-800">{matchedNetwork?.name || 'Grantify Network'}</span>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <span className="text-[10px] uppercase font-black text-gray-400 block mb-2">Status</span>
                <span className="text-xl font-bold text-blue-600 flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin" /> {ApplicationStatus.PENDING}
                </span>
              </div>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
              <Info className="text-blue-500 flex-shrink-0" size={24} />
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Next Steps:</strong> Our specialists are now reviewing your profile. If you qualify for the {matchedNetwork?.name} program, you will receive a follow-up email and phone call within 48-72 hours.
              </p>
            </div>

            <button 
              onClick={() => setSubmitted(false)}
              className="w-full bg-grantify-green text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              Done & View Other Opportunities
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 pb-20">
      <RecentApplicantsTicker applicants={qualifiedPersons} />
      <BlogTicker posts={blogPosts} />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden rounded-[3rem] mx-4 md:mx-0">
        <div className="absolute inset-0 bg-grantify-green">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-grantify-gold/20 rounded-full blur-[120px] -mr-64 -mt-64"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-[120px] -ml-64 -mb-64"></div>
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black text-grantify-gold uppercase tracking-[0.2em] mb-8 border border-white/5">
            <Sparkles size={14} /> Nigeria's #1 Grant Intelligence Hub
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-heading text-white mb-8 leading-[1.1]">
            Bridge the Gap Between <br/>
            <span className="text-grantify-gold">Your Vision</span> & Funding.
          </h1>
          <p className="text-xl md:text-2xl text-green-100/80 max-w-3xl mx-auto mb-12 leading-relaxed">
            Stop searching for 'fake' loans. Use our match-making engine to find verified grants and low-interest capital from BOI, TEF, and private foundations.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => document.getElementById('matcher')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-grantify-green font-bold py-3 px-8 rounded-xl shadow-xl hover:scale-105 transition-all text-base flex items-center gap-2"
            >
              Find My Grant Match <Search size={18} />
            </button>
            <Link 
              to="/loan-providers"
              className="bg-grantify-gold text-grantify-green font-bold py-3 px-8 rounded-xl shadow-xl hover:scale-105 transition-all text-base flex items-center gap-2"
            >
              <Zap size={18} /> Instant Loan Apps
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Total Matches', value: '1,200+', icon: Sparkles },
            { label: 'Disbursed Capital', value: '₦750M+', icon: Award },
            { label: 'Success Rate', value: '85%', icon: TrendingUp },
            { label: 'Trusted Partners', value: '12+', icon: Landmark },
          ].map((stat, i) => (
            <div key={i} className="text-center group">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-grantify-green group-hover:text-white transition-all transform group-hover:rotate-12">
                <stat.icon size={24} />
              </div>
              <div className="text-2xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-[10px] uppercase font-black text-gray-400 tracking-tighter">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Matcher Form Section */}
      <section id="matcher" className="max-w-6xl mx-auto px-4 grid lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-3">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-100 relative">
            <div className="absolute top-0 right-0 p-8">
              <Sparkles className="text-gray-100" size={80} />
            </div>
            
            <h2 className="text-3xl font-black font-heading text-gray-900 mb-10 flex items-center gap-4">
              <div className="w-2 h-10 bg-grantify-green rounded-full"></div>
              Intelligent Matcher
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-widest pl-1 font-mono">Full Legal Name</label>
                  <input 
                    className="w-full p-5 bg-gray-50 rounded-2xl border-none ring-1 ring-gray-100 focus:ring-2 focus:ring-grantify-green outline-none transition-all shadow-inner"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-widest pl-1 font-mono">Mobile Number</label>
                  <input 
                    className="w-full p-5 bg-gray-50 rounded-2xl border-none ring-1 ring-gray-100 focus:ring-2 focus:ring-grantify-green outline-none transition-all shadow-inner"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="+234..."
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500 tracking-widest pl-1 font-mono">Business Industry</label>
                <select 
                  className="w-full p-5 bg-gray-50 rounded-2xl border-none ring-1 ring-gray-100 focus:ring-2 focus:ring-grantify-green outline-none transition-all shadow-inner cursor-pointer"
                  value={formData.businessType}
                  onChange={e => setFormData({...formData, businessType: e.target.value})}
                  required
                  aria-label="Business Industry"
                  title="Business Industry"
                >
                  <option value="">Select Category</option>
                  <option value="Agriculture">Agriculture & Farming</option>
                  <option value="Tech">Technology & Innovation</option>
                  <option value="Trade">Retail & Trading</option>
                  <option value="Creative">Creative Arts & Media</option>
                  <option value="Manufacturing">Manufacturing & Industry</option>
                  <option value="Education">Education & Skills</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500 tracking-widest pl-1 font-mono">Reason for Grant / Grant Proposal Summary</label>
                <textarea 
                  rows={4}
                  className="w-full p-5 bg-gray-50 rounded-2xl border-none ring-1 ring-gray-100 focus:ring-2 focus:ring-grantify-green outline-none transition-all shadow-inner resize-none"
                  value={formData.purpose}
                  onChange={e => handlePurposeChange(e.target.value)}
                  placeholder="Describe your business needs and how funding will impact your growth..."
                  required
                />
              </div>

              {/* Dynamic Matching Feedback */}
              {matchedNetwork && (
                <div className="bg-grantify-green/5 border border-grantify-green/20 p-6 rounded-2xl flex items-center gap-6 animate-in slide-in-from-top-4">
                  <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-2">
                    <img src={matchedNetwork.logo} alt={matchedNetwork.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-grantify-green tracking-widest block mb-1">Optimal Network Found</span>
                    <h4 className="text-lg font-bold text-gray-800">{matchedNetwork.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{matchedNetwork.description}</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  disabled={isSubmitting}
                  className="w-full bg-grantify-green text-white font-black py-6 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xl"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Award size={24} />}
                  Submit Proposal for Matching
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Landmark className="text-grantify-green" /> Robust Partners
              </h3>
              <div className="space-y-4">
                {GRANT_NETWORKS.map(network => (
                  <div key={network.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-grantify-green/30 transition-all cursor-pointer group">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm">
                      <img src={network.logo} alt={network.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 group-hover:text-grantify-green transition-colors">{network.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Verified Provider</p>
                    </div>
                    <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-grantify-green group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 rounded-[2.5rem] shadow-xl text-white">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="text-grantify-gold" /> Fast-Track Service
              </h3>
              <p className="text-sm text-blue-100/80 mb-6 leading-relaxed">
                Need urgent operating capital before your grant is processed? Our "Fast Track" partners provide rapid micro-loans to keep you afloat.
              </p>
              <Link to="/loan-providers" className="block w-full text-center bg-white text-blue-900 font-black py-4 rounded-xl shadow-lg hover:bg-blue-50 transition-all">
                Access Fast-Track
              </Link>
           </div>
        </div>
      </section>

      {/* Blog/Intelligence Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-black font-heading text-gray-900 mb-2">Financial Intelligence</h2>
              <p className="text-gray-500 font-medium">Expert guides on scaling your business with government support.</p>
            </div>
            <Link to="/blog" className="text-grantify-green font-black flex items-center gap-1 hover:gap-2 transition-all">
              View Publication <ArrowRight size={18} />
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map(post => (
              <Link key={post.id} to={`/blog/${post.id}`} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-grantify-green to-blue-900 flex items-center justify-center p-6 text-white font-bold text-center text-sm">
                      {post.title}
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded uppercase">
                    {post.category}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-800 group-hover:text-grantify-green transition-colors line-clamp-2 min-h-[3rem]">
                    {post.title}
                  </h3>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>{post.author}</span>
                    <span className="flex items-center gap-1"><BookOpen size={12} /> {post.likes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-black font-heading text-center text-gray-900 mb-12">Successful Grant Matches</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {allTestimonials.filter(t => !t.status || t.status === 'approved').slice(0, 3).map(t => (
            <TestimonialCard key={t.id} data={t} />
          ))}
        </div>
        <div className="text-center mt-10">
          <p className="text-gray-400 text-sm italic">Join 45,000+ businesses already growing with Grantify intelligence.</p>
        </div>
      </section>
    </div>
  );
};
