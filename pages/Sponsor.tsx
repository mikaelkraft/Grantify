import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { LoanProvider } from '../types';
import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Lock,
  RefreshCw,
  Star,
  Building2,
  CreditCard,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  Layers,
  Globe,
  Award,
  Download,
  Printer,
  X,
  Briefcase,
  Smartphone,
  Landmark,
  HeartHandshake
} from 'lucide-react';

type PricingTier = { id: number; tierName: string; priceCents: number; durationDays: number; description: string };

export const Sponsor: React.FC = () => {
  const location = useLocation();
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [sponsorMeta, setSponsorMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState<'homepage' | 'directory'>('homepage');
  const [selectedUseCase, setSelectedUseCase] = useState<'fintech' | 'banks' | 'donors' | 'b2b'>('fintech');
  const [showExecutiveKitModal, setShowExecutiveKitModal] = useState(false);
  const [form, setForm] = useState({
    providerId: '',
    tierId: '',
    name: '',
    email: '',
    company: '',
    website: '',
    note: '',
    paymentProvider: 'paypal',
    customPartnerName: ''
  });

  useEffect(() => {
    document.title = 'Sponsor & Advertise | Grantify Nigeria';
    
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    
    const desc = 'Advertise your microfinance bank, fintech platform, or loan institution on Grantify Nigeria. Choose from premium top-of-funnel placement and listing features.';
    setMeta('meta[property="og:title"]', 'content', 'Sponsor & Advertise | Grantify Nigeria');
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[name="twitter:title"]', 'content', 'Sponsor & Advertise | Grantify');
    setMeta('meta[name="twitter:description"]', 'content', desc);
    
    const schemaId = 'grantify-sponsor-schema';
    const prev = document.getElementById(schemaId);
    if (prev) prev.remove();
    
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': 'Grantify Sponsorship Packages',
      'description': desc,
      'image': 'https://grantify.help/logo.svg',
      'offers': {
        '@type': 'AggregateOffer',
        'priceCurrency': 'NGN',
        'lowPrice': '25000',
        'highPrice': '150000',
        'offerCount': '3'
      }
    };
    
    const script = document.createElement('script');
    script.id = schemaId;
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schema);
    document.head.appendChild(script);
    
    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [providerData, pricingData, meta] = await Promise.all([
          ApiService.getLoanProviders(),
          ApiService.getSponsoredPricing(),
          ApiService.getSponsorMeta().catch(() => null)
        ]);
        setProviders(Array.isArray(providerData) ? providerData : []);
        setPricing(Array.isArray(pricingData) ? pricingData : []);
        if (meta) {
          setSponsorMeta(meta);
        }
        const featuredTier = Array.isArray(pricingData)
          ? pricingData.find((tier: PricingTier, index: number) => isFeaturedTier(tier, index))
          : null;
        setForm(prev => ({
          ...prev,
          providerId: prev.providerId || String(providerData?.[0]?.id || ''),
          tierId: prev.tierId || String(featuredTier?.id || pricingData?.[0]?.id || '')
        }));
      } catch (err) {
        console.error('Failed to load sponsor page data', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!pricing.length) return;
    try {
      const params = new URLSearchParams(location.search);
      const tierQuery = String(params.get('tier') || '').trim().toLowerCase();
      if (!tierQuery) return;

      const match = pricing.find((tier) => {
        const idMatch = String(tier.id) === tierQuery;
        const nameMatch = String(tier.tierName || '').toLowerCase().includes(tierQuery);
        return idMatch || nameMatch;
      });

      if (match) {
        setForm(prev => ({ ...prev, tierId: String(match.id) }));
      }
    } catch {
      // no-op
    }
  }, [location.search, pricing]);

  const launchSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const isCustom = form.providerId === 'custom';
      const providerId = isCustom ? null : Number(form.providerId);
      const tierId = Number(form.tierId);
      if ((!isCustom && !providerId) || !tierId) throw new Error('Choose a provider and package.');
      if (isCustom && !form.customPartnerName.trim()) throw new Error('Please enter the custom partner name.');

      const payerInfo = {
        name: form.name,
        email: form.email,
        company: form.company,
        website: form.website,
        note: form.note,
        placement: 'sponsor-page',
        paymentProvider: form.paymentProvider,
        customPartnerName: isCustom ? form.customPartnerName.trim() : undefined
      };

      const result = await ApiService.createSponsoredPurchase(providerId, tierId, payerInfo);
      if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      setMessage(result.paymentUrl
        ? 'Checkout opened in a new tab. Complete payment to activate the sponsorship.'
        : `Sponsorship request created. Reference ID: ${result.id}. Our team will invoice and confirm.`);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to launch sponsorship.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFeaturedTier = (tier: PricingTier, index: number) => {
    const name = String(tier.tierName || '').toLowerCase();
    return index === 1 || name.includes('standard') || name.includes('popular');
  };

  const getTierFeatures = (tierName: string) => {
    const name = tierName.toLowerCase();
    if (name.includes('premium') || name.includes('gold') || name.includes('enterprise')) {
      return [
        'Max-exposure top listing placements',
        'Direct newsletter editorial slot',
        'Priority invoice & wire transfer support',
        'Real-time conversion & lead analytics',
        'Dedicated account manager assistance'
      ];
    }
    if (name.includes('standard') || name.includes('silver') || name.includes('popular')) {
      return [
        'Featured homepage sponsor placement',
        'Premium highlighted listing styling',
        'Priority provider directory indexing',
        'Weekly traffic & referral performance metrics',
        'Standard email & dashboard support'
      ];
    }
    return [
      'Standard directory listing placement',
      'Basic styling and metadata display',
      'Direct reference ID lookup support',
      'Monthly referral click summary report'
    ];
  };

  const handleSelectTier = (tierId: number) => {
    setForm(prev => ({ ...prev, tierId: String(tierId) }));
    setTimeout(() => {
      const el = document.getElementById('booking-form');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-12">
      {/* Hero Section */}
      <section className="rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-grantify-gold/10 rounded-full blur-3xl" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3 flex items-center gap-2"><Zap size={12} /> Sponsor & Advertise</p>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.05] mb-5">Put your brand in front of high-intent capital seekers.</h1>
            <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-2xl mb-6">
              Establish your microfinance bank, fintech platform, or loan institution as a trusted partner. Choose from our high-performance sponsorship packages to drive verified, pre-qualified traffic to your products.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#booking-form" className="inline-flex items-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                Select Your Package <ArrowRight size={16} />
              </a>
              <button
                type="button"
                onClick={() => setShowExecutiveKitModal(true)}
                className="inline-flex items-center gap-2 bg-grantify-gold text-gray-950 font-black px-5 py-3 rounded-xl hover:bg-yellow-400 transition-all shadow-lg text-sm"
              >
                <FileText size={16} /> Executive Media Kit
              </button>
              <Link to="/blog#media-kit" className="inline-flex items-center gap-2 border border-white/10 text-white font-black px-5 py-3 rounded-xl hover:bg-white/5 transition-all text-sm">
                Interactive ROI Estimator <ExternalLink size={16} />
              </Link>
            </div>
          </div>
 
          <div className="grid gap-3">
            {[
              'Pre-screened SME and retail borrower leads with verified capital intent',
              'Targeted state-by-state distribution across all 36 states and the FCT',
              'Native integration in loan comparison tables, eligibility quizzes & WhatsApp alerts',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-World Partnering Use Cases */}
      <section className="mt-12">
        <div className="text-center mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-green mb-2">Targeted Commercial Reach</p>
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100">Real-World Partnering Use Cases</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto text-sm md:text-base">
            Grantify connects regulated financial institutions, digital lenders, enterprise enablers, and development programs directly to active, credit-seeking Nigerian operators.
          </p>
        </div>

        {/* Use Case Selection Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {([
            { id: 'fintech', label: 'Digital Lenders & MFBs', icon: <Smartphone size={15} /> },
            { id: 'banks', label: 'Commercial Bank SME Desks', icon: <Landmark size={15} /> },
            { id: 'donors', label: 'Development Donors & NGOs', icon: <HeartHandshake size={15} /> },
            { id: 'b2b', label: 'B2B SaaS & Merchant Services', icon: <Briefcase size={15} /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedUseCase(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                selectedUseCase === tab.id
                  ? 'bg-grantify-green text-white border-grantify-green shadow-md ring-2 ring-grantify-green/30'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-grantify-green/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Use Case Deep Dive Card */}
        <div className="rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
          {selectedUseCase === 'fintech' && (
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 mb-3">
                  <Zap size={12} /> Digital Lenders & Microfinance Banks
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3">
                  Acquire verified borrowers with lower default risk and higher repayment intent.
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  <strong>The Real Problem:</strong> Digital lenders in Nigeria burn millions on generic social media ads, resulting in high customer acquisition costs (CAC) and high default rates from impulse borrowers.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  <strong>The Grantify Advantage:</strong> Grantify users actively seek structured working capital and growth financing. By presenting your licensed credit products directly on our loan comparison directory with interest and tenure transparency, you convert high-intent SME owners who have already verified their operational revenue.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">Typical Partners: Carbon, FairMoney, Renmoney, OPay, Moniepoint, LAPO MFB</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="text-xs font-black uppercase tracking-wider text-grantify-green mb-4">Verified Campaign Impact</div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Conversion Rate</span>
                    <span className="text-2xl font-black text-grantify-green">3.8x</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">vs generic social ads</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Cost Per Booked Loan</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">-42%</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">lower acquisition cost</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-grantify-green shrink-0" /> Directory Top-Ranked Placement with Verified Badge</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-grantify-green shrink-0" /> Real-time Click-Out Attribution tracking</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-grantify-green shrink-0" /> Direct link into Google Play Store or web onboarding</li>
                </ul>
              </div>
            </div>
          )}

          {selectedUseCase === 'banks' && (
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 mb-3">
                  <Landmark size={12} /> Commercial Banks & SME Divisions
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3">
                  Deploy intervention funds and scale corporate SME account openings.
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  <strong>The Real Problem:</strong> Commercial banks struggle to identify bankable, formalizing businesses for CBN/BOI special credit facilities, women entrepreneur initiatives, and merchant terminal deployments.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  <strong>The Grantify Advantage:</strong> Our audience actively consumes content on CAC formalization, tax clearance, and business structuring. Position your bank's specialized SME desks (e.g. Women-in-Business, Agri-finance, Tech Scale-up) directly to operators looking for banking partnerships.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">Typical Partners: Access Bank W, Sterling AgFin, Zenith SME, Providus Bank, FirstBank</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">Verified Campaign Impact</div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Corporate Accounts</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">High Volume</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">SMEs opening business accounts</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Avg. Business Deposit</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">₦2.4M+</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">initial operating float</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-600 shrink-0" /> Featured Article Spotlight on Grantify Editorial</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-600 shrink-0" /> Inclusion in monthly SME Financial Guide download</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-600 shrink-0" /> Direct referral into relationship manager desk</li>
                </ul>
              </div>
            </div>
          )}

          {selectedUseCase === 'donors' && (
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 mb-3">
                  <HeartHandshake size={12} /> Development Donors, NGOs & Foundations
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3">
                  Broadcast grant callouts and discover verified grassroots founders across all 36 states.
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  <strong>The Real Problem:</strong> Major empowerment programs and donor-backed funds often struggle to reach qualified female founders and youth entrepreneurs outside Lagos and Abuja, leading to skewed demographic impact.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  <strong>The Grantify Advantage:</strong> With localized state directories (`/grants/:state`) and active community channels, Grantify offers direct grassroots distribution into agricultural cooperatives, manufacturing hubs, and women-led networks throughout Nigeria.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">Typical Programs: Tony Elumelu Foundation, SMEDAN, BOI, GIZ, USAID, Fate Foundation</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4">Verified Campaign Impact</div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Female Founder Ratio</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">54%</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">verified women-led applicants</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">State Coverage</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">36 + FCT</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">nationwide application reach</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-600 shrink-0" /> State-specific Grant Page Sponsorship banner</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-600 shrink-0" /> WhatsApp Funding Alert blast to 20,000+ founders</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-600 shrink-0" /> Eligibility checklist guidance custom tailored to your grant rules</li>
                </ul>
              </div>
            </div>
          )}

          {selectedUseCase === 'b2b' && (
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 mb-3">
                  <Briefcase size={12} /> B2B SaaS & Merchant Enablers
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3">
                  Engage expanding businesses at the exact moment they require formal operational tools.
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  <strong>The Real Problem:</strong> Business software, CAC filing services, POS distributors, and insurance providers find it difficult to catch Nigerian SMEs right when they are ready to invest in compliance and infrastructure.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  <strong>The Grantify Advantage:</strong> To qualify for loans and grants, Nigerian operators must prepare financial records, register their business, and set up merchant payment terminals. Our platform captures businesses during this high-intent preparation window.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">Typical Enablers: CAC Registration Agents, POS Providers, Bookkeeping Apps, Legal Services</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-4">Verified Campaign Impact</div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Ready-to-Buy Intent</span>
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400">82%</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">actively seeking compliance tools</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Tool Adoption Rate</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">4.1x</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">higher software signup rate</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-600 shrink-0" /> Native Resource & Toolkit sidebar slot</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-600 shrink-0" /> Recommended Partner Badge on preparation pages</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-purple-600 shrink-0" /> Direct click to promo landing page or WhatsApp bot</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Audience Demographics & Geographic Reach */}
      <section className="mt-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-1">Audience Demographics</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100">Verified Platform Reach in Nigeria</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Globe size={14} className="text-grantify-green" /> All 36 Nigerian States + FCT Abuja
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-1">Monthly Active Reach</span>
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100">45,000+</span>
            <p className="text-xs text-gray-500 mt-2">Business owners actively searching for loans, grants, and credit facilities.</p>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-black uppercase tracking-wider text-grantify-green block mb-1">Female Founders</span>
            <span className="text-3xl font-black text-grantify-green">54%</span>
            <p className="text-xs text-gray-500 mt-2">Women-led enterprises seeking working capital, equipment, and expansion grants.</p>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-black uppercase tracking-wider text-grantify-gold block mb-1">Target Capital Size</span>
            <span className="text-3xl font-black text-grantify-gold">₦500k – ₦10M</span>
            <p className="text-xs text-gray-500 mt-2">Prime working capital bracket with verified commercial repayment intent.</p>
          </div>
        </div>

        {/* Geopolitical Distribution Bars */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Geopolitical Distribution of Applicants</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {[
              { zone: 'South-West', pct: '38%', states: 'Lagos, Oyo, Ogun, etc.' },
              { zone: 'North-Central', pct: '20%', states: 'Abuja FCT, Plateau, Kwara' },
              { zone: 'South-East', pct: '16%', states: 'Anambra, Enugu, Abia' },
              { zone: 'South-South', pct: '12%', states: 'Rivers, Delta, Edo' },
              { zone: 'North-West', pct: '9%', states: 'Kano, Kaduna, Katsina' },
              { zone: 'North-East', pct: '5%', states: 'Bauchi, Gombe, Taraba' },
            ].map((z) => (
              <div key={z.zone} className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="text-lg font-black text-gray-900 dark:text-gray-100">{z.pct}</div>
                <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mt-0.5">{z.zone}</div>
                <div className="text-[9px] text-gray-400 truncate mt-1">{z.states}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="mt-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100">Tailored Sponsorship Packages</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Select the optimal visibility tier for your institution. All plans include comprehensive traffic metrics and direct applicant referral tracking.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pricing.map((tier, index) => {
            const isFeatured = isFeaturedTier(tier, index);
            const isSelected = String(form.tierId) === String(tier.id);
            const features = getTierFeatures(tier.tierName);
            const slotsLeft = sponsorMeta?.tiers?.find((t: any) => String(t.id) === String(tier.id))?.slotsLeft;

            return (
              <div
                key={tier.id}
                onClick={() => handleSelectTier(tier.id)}
                className={`cursor-pointer rounded-3xl border p-6 flex flex-col justify-between transition-all relative ${
                  isSelected
                    ? 'border-grantify-green bg-grantify-green/5 dark:bg-grantify-green/5 shadow-xl ring-2 ring-grantify-green'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-grantify-green/50 hover:shadow-lg'
                } ${isFeatured && !isSelected ? 'ring-2 ring-grantify-gold/50 shadow-md' : ''}`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-grantify-gold text-grantify-green px-3 py-1 text-xs font-black uppercase tracking-widest shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">{tier.tierName}</h3>
                      <p className="text-xs text-gray-500 mt-1">{tier.durationDays} Days Sponsorship</p>
                    </div>
                    {slotsLeft !== null && slotsLeft !== undefined && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                        slotsLeft <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {slotsLeft <= 3 ? `Only ${slotsLeft} Left` : `${slotsLeft} Slots`}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-black text-gray-900 dark:text-gray-100">
                      {(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}
                    </span>
                    <span className="text-gray-500 text-sm font-bold"> / tier</span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 min-h-[40px]">{tier.description}</p>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mb-6">
                    <ul className="space-y-3">
                      {features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle className="text-grantify-green flex-shrink-0 mt-0.5" size={16} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  className={`w-full py-3 px-4 rounded-xl text-center font-black uppercase tracking-wider text-sm transition-all ${
                    isSelected
                      ? 'bg-grantify-green text-white hover:bg-green-700 shadow-md'
                      : 'bg-gray-900 text-white hover:bg-grantify-green dark:bg-gray-800 dark:hover:bg-grantify-green'
                  }`}
                >
                  {isSelected ? 'Selected Package' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Deliverables Comparison Matrix */}
      <section className="mt-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-2">Detailed Specifications</p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100">Sponsorship Deliverables Matrix</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto text-xs md:text-sm">
            Compare visibility features, editorial integration, community outreach, and attribution capabilities across packages.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="py-3 px-4 font-black uppercase tracking-wider text-gray-500">Deliverable / Capability</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">Standard Tier</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-grantify-gold">Featured Tier</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-grantify-green">Enterprise Partner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300">
              {[
                { feature: 'Directory Listing with Verified Partner Badge', std: true, feat: true, ent: true },
                { feature: 'Top-of-Funnel Placement on Loan Directory', std: 'Standard Rank', feat: 'Priority #2-3', ent: 'Guaranteed #1 Sticky' },
                { feature: 'Homepage Top Sponsor Banner Spotlight', std: false, feat: true, ent: true },
                { feature: 'WhatsApp Funding Alert Co-Sponsorship (20,000+ founders)', std: false, feat: '1 Broadcast', ent: '3 Dedicated Blasts' },
                { feature: 'Sponsored Editorial Case Study & Google News Indexing', std: false, feat: 'Co-Branded', ent: 'Dedicated Deep-Dive' },
                { feature: 'State Grant Page Banner Sponsorship (/grants/:state)', std: false, feat: false, ent: true },
                { feature: 'Real-Time Click Attribution & Referral Analytics', std: true, feat: true, ent: true },
                { feature: 'Official VAT-Compliant Corporate Invoice & Receipt', std: true, feat: true, ent: true },
                { feature: 'Dedicated Campaign Support & Creative Revisions', std: 'Email Support', feat: 'Priority SLA (24h)', ent: 'Dedicated Account Lead' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-gray-100">{row.feature}</td>
                  <td className="py-3.5 px-4">
                    {typeof row.std === 'boolean' ? (
                      row.std ? <CheckCircle size={15} className="text-grantify-green" /> : <span className="text-gray-400">—</span>
                    ) : (
                      <span className="font-semibold">{row.std}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {typeof row.feat === 'boolean' ? (
                      row.feat ? <CheckCircle size={15} className="text-grantify-gold" /> : <span className="text-gray-400">—</span>
                    ) : (
                      <span className="font-bold text-grantify-gold">{row.feat}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {typeof row.ent === 'boolean' ? (
                      row.ent ? <CheckCircle size={15} className="text-grantify-green" /> : <span className="text-gray-400">—</span>
                    ) : (
                      <span className="font-black text-grantify-green">{row.ent}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Booking Form and Proof Section */}
      <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
        {/* Booking Form Card */}
        <div id="booking-form" className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm scroll-mt-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">Campaign Setup</div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Configure Your Campaign</h2>
            </div>
            {loading && <Loader2 className="animate-spin text-grantify-green" size={18} />}
          </div>

          <form onSubmit={launchSponsor} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Provider</label>
              <select
                value={form.providerId}
                onChange={(e) => setForm(prev => ({ ...prev, providerId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100"
                aria-label="Sponsor provider"
                title="Sponsor provider"
                required
              >
                <option value="">Select provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
                <option value="custom">Other / Custom Partner</option>
              </select>
            </div>

            {form.providerId === 'custom' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Custom Partner Name</label>
                <input
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100"
                  value={form.customPartnerName}
                  onChange={(e) => setForm(prev => ({ ...prev, customPartnerName: e.target.value }))}
                  placeholder="Enter custom partner or business name"
                  title="Custom Partner Name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Package</label>
              <select
                value={form.tierId}
                onChange={(e) => setForm(prev => ({ ...prev, tierId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100"
                aria-label="Sponsor package"
                title="Sponsor package"
                required
              >
                <option value="">Select package</option>
                {pricing.map((tier) => (
                  <option key={tier.id} value={tier.id}>{tier.tierName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Name</label>
              <input className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Your full name" title="Your full name" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Email</label>
              <input type="email" className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="name@company.com" title="Email address" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Company</label>
              <input className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100" value={form.company} onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))} placeholder="Company or brand" title="Company" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Website</label>
              <input className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100" value={form.website} onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))} placeholder="https://your-site.com" title="Website" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Campaign note</label>
              <textarea className="w-full min-h-[120px] rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100" value={form.note} onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))} placeholder="What are you promoting?" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Payment method</label>
              <div className="flex gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentProvider" value="paypal" checked={form.paymentProvider === 'paypal'} onChange={(e) => setForm(prev => ({ ...prev, paymentProvider: e.target.value }))} className="w-4 h-4 text-grantify-green" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">PayPal (International)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentProvider" value="opay" checked={form.paymentProvider === 'opay'} onChange={(e) => setForm(prev => ({ ...prev, paymentProvider: e.target.value }))} className="w-4 h-4 text-grantify-green" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">OPay (Nigeria)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentProvider" value="bankwire" checked={form.paymentProvider === 'bankwire'} onChange={(e) => setForm(prev => ({ ...prev, paymentProvider: e.target.value }))} className="w-4 h-4 text-grantify-green" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Bank Wire / Corporate Invoice</span>
                </label>
              </div>
            </div>

            {/* Bank Wire Details Panel */}
            {form.paymentProvider === 'bankwire' && (
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-grantify-green/30 bg-green-50/50 dark:bg-green-950/20 p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Building2 className="text-grantify-green dark:text-emerald-400 flex-shrink-0" size={18} />
                    <div className="text-xs font-black uppercase tracking-widest text-grantify-green dark:text-emerald-400">Institutional Invoicing & Bank Wire</div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                    Select your package and submit the request. We generate an official VAT-compliant corporate proforma invoice with bank settlement instructions directly for your finance or accounts team.
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Sponsorship slots are reserved immediately and activated within 24 hours of payment confirmation.
                  </p>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-2">
              <div className={`text-xs ${message ? (message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'text-red-500' : 'text-grantify-green font-bold') : 'text-gray-500 dark:text-gray-400'}`}>
                {message || (form.paymentProvider === 'bankwire' ? 'Submit to request a corporate invoice with bank settlement instructions.' : 'We will create the booking and either open checkout or queue an invoice for confirmation.')}
              </div>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 bg-grantify-green text-white font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : form.paymentProvider === 'bankwire' ? <><CreditCard size={16} /> Request Invoice</> : <><CheckCircle size={16} /> Launch Sponsorship</>}
              </button>
            </div>
          </form>
        </div>

        {/* Info & Proof Sidebar */}
        <div className="grid gap-6">

          {/* Placements Preview */}
          <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-1">Live Placement Preview</div>
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">See your active listing</h3>
              </div>
              <Sparkles className="text-grantify-gold animate-pulse" size={18} />
            </div>

            {/* Preview Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              {(
                [
                  { key: 'homepage', label: 'Homepage Banner' },
                  { key: 'directory', label: 'Directory Highlight' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivePreviewTab(tab.key)}
                  className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                    activePreviewTab === tab.key
                      ? 'bg-grantify-green text-white border-grantify-green shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Resolve Sponsor/Partner Info for live preview */}
            {(() => {
              const selectedProviderObj = form.providerId === 'custom'
                ? null
                : providers.find(p => String(p.id) === String(form.providerId));
              const selectedTierObj = pricing.find(t => String(t.id) === String(form.tierId));

              const partnerName = form.providerId === 'custom'
                ? (form.customPartnerName.trim() || 'Your Brand Name')
                : (selectedProviderObj?.name || 'Your Brand Name');

              const campaignNoteText = form.note.trim() || 'Visit provider for verified funding options.';

              const tierName = selectedTierObj?.tierName || 'Standard Package';
              const tierNameLower = tierName.toLowerCase();
              const isPremium = tierNameLower.includes('premium') || tierNameLower.includes('gold') || tierNameLower.includes('enterprise');
              const isStandard = tierNameLower.includes('standard') || tierNameLower.includes('silver') || tierNameLower.includes('popular');

              if (activePreviewTab === 'homepage') {
                return (
                  <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white rounded-2xl p-5 border border-white/10 shadow-inner relative overflow-hidden animate-in fade-in duration-300">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-grantify-gold/10 rounded-full blur-2xl pointer-events-none" />
                    <span className="absolute top-2 right-2 text-[7px] font-black uppercase bg-white/15 px-1.5 py-0.5 rounded text-white/85 tracking-wider">Sponsored</span>
                    
                    <div className="text-[9px] font-black uppercase tracking-widest text-grantify-gold mb-2">
                      {tierName}
                    </div>
                    <div className="text-base font-bold text-white hover:underline flex items-center gap-1">
                      {partnerName}
                      <ExternalLink size={12} className="opacity-60" />
                    </div>
                    <p className="text-xs text-white/80 mt-1.5 leading-relaxed line-clamp-3">
                      {campaignNoteText}
                    </p>
                  </div>
                );
              }

              // Directory tab
              return (
                <div className="animate-in fade-in duration-300">
                  <div className={`p-5 rounded-2xl border bg-white dark:bg-gray-900 transition-all duration-300 shadow-md relative overflow-hidden ${
                    isPremium
                      ? 'border-grantify-gold ring-2 ring-grantify-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.12)]'
                      : isStandard
                        ? 'border-grantify-green ring-2 ring-grantify-green/30 shadow-[0_0_20px_rgba(34,197,94,0.08)]'
                        : 'border-blue-500/30'
                  }`}>
                    {/* Badge */}
                    {isPremium ? (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-grantify-gold text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-0.5">
                        <Sparkles size={8} /> Premium Partner
                      </div>
                    ) : isStandard ? (
                      <div className="absolute top-0 right-0 bg-grantify-green text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-0.5">
                        <Zap size={8} /> Sponsored Partner
                      </div>
                    ) : (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        Sponsored
                      </div>
                    )}
                    
                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-10 h-10 bg-green-50 dark:bg-gray-950 rounded-lg flex items-center justify-center text-grantify-green font-black border border-green-100 dark:border-gray-800">
                        {partnerName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight">{partnerName}</h4>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={8} className="fill-yellow-400 text-yellow-400" />
                          ))}
                          <span className="text-[9px] font-bold text-gray-500 ml-1">5.0</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-gray-500 dark:text-gray-300 text-[11px] mb-3 line-clamp-2 leading-relaxed">
                      {selectedProviderObj ? selectedProviderObj.description : 'Verified loan provider offering micro-loans, credit lines, and financial support.'}
                    </p>
                    
                    {/* Campaign Note callout */}
                    {form.note.trim() && (
                      <div className={`mb-3 p-2.5 rounded-xl text-[10px] font-semibold italic flex items-start gap-1 border ${
                        isPremium 
                          ? 'bg-grantify-gold/10 border-grantify-gold/20 text-grantify-gold'
                          : isStandard
                            ? 'bg-grantify-green/10 border-grantify-green/20 text-grantify-green'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                      }`}>
                        <Sparkles size={10} className="shrink-0 mt-0.5" />
                        <span>"{form.note.trim()}"</span>
                      </div>
                    )}
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 dark:bg-gray-950 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px]">
                        <span className="text-gray-400 block font-bold uppercase text-[7px] mb-0.5">Rate</span>
                        <span className="font-black text-gray-700 dark:text-gray-200">{selectedProviderObj ? selectedProviderObj.interestRange : '3% - 8%'}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-950 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px]">
                        <span className="text-gray-400 block font-bold uppercase text-[7px] mb-0.5">Tenure</span>
                        <span className="font-black text-gray-700 dark:text-gray-200">{selectedProviderObj ? selectedProviderObj.tenure : '3-12m'}</span>
                      </div>
                    </div>
                    
                    {/* Action */}
                    <div className="flex gap-2">
                      <span className="flex-1 bg-gray-900 text-white text-[10px] py-2 rounded-lg text-center font-bold">Apply Now</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Guarantee Badges */}
          <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-grantify-green/5 to-grantify-gold/5 dark:from-grantify-green/10 dark:to-grantify-gold/10 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-green mb-1">Trusted</div>
                <h3 className="text-base font-black text-gray-900 dark:text-gray-100">Your investment is protected</h3>
              </div>
              <Shield className="text-grantify-green" size={18} />
            </div>

            <div className="grid gap-4">
              <div className="flex gap-3">
                <Lock className="text-grantify-green flex-shrink-0" size={18} />
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-gray-100 mb-0.5">256-bit SSL Encrypted</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">All payments secured with industry-standard encryption</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RefreshCw className="text-grantify-green flex-shrink-0" size={18} />
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-gray-100 mb-0.5">14-Day Guarantee</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Not satisfied? Full refund within 14 days of activation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mt-8 rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">FAQ</div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">Quick answers for advertisers</h3>
          </div>
          <CheckCircle className="text-grantify-green" size={18} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { q: 'How does the onboarding process work?', a: 'Once you select your package and submit details, you can complete payment immediately via our checkout portal. Your sponsored features will go live within 24 hours after editorial verification.' },
            { q: 'Can we promote a new financial product or custom brand?', a: 'Absolutely. Choose "Other / Custom Partner" in the provider dropdown to enter your details, and our design team will construct a bespoke listing card for your product.' },
            { q: 'Are official corporate invoices provided?', a: 'Yes. We issue VAT-compliant corporate invoices and receipts for all transactions. Wire transfers and direct bank deposits are fully supported.' },
            { q: 'Can we adjust our creative assets or redirection links later?', a: 'Yes. Your campaign dashboard and our dedicated support team allow you to update redirect links, promotional copy, and graphics at any time during your active slot.' },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2">{item.q}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Executive Media Kit Modal */}
      {showExecutiveKitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
              <div className="flex items-center gap-2.5">
                <FileText className="text-grantify-gold" size={20} />
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Grantify Media Kit & Partnering Rate Card</h3>
                  <p className="text-xs text-gray-500">Official commercial documentation for institutional advertisers and partners</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowExecutiveKitModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-xs text-gray-700 dark:text-gray-300">
              {/* Executive Summary */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-grantify-green mb-2">1. Executive Overview</h4>
                <p className="leading-relaxed text-sm">
                  Grantify (<code>grantify.help</code>) is Nigeria's leading non-lending grant and loan discovery engine. We connect over <strong>45,000 monthly high-intent business owners and entrepreneurs</strong> across all 36 states and the FCT with licensed credit providers, government intervention programs, and non-dilutive development grants.
                </p>
              </div>

              {/* Verified Audience Stats */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-grantify-gold mb-3">2. Audience Reach & Demographics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-lg font-black text-gray-900 dark:text-gray-100 block">45,000+</span>
                    <span className="text-[10px] text-gray-400 uppercase">Monthly Active Visits</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-lg font-black text-grantify-green block">54%</span>
                    <span className="text-[10px] text-gray-400 uppercase">Women-Led Enterprises</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-lg font-black text-grantify-gold block">68%</span>
                    <span className="text-[10px] text-gray-400 uppercase">Micro & Small Business</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-lg font-black text-blue-600 block">36 + FCT</span>
                    <span className="text-[10px] text-gray-400 uppercase">Nationwide Coverage</span>
                  </div>
                </div>
              </div>

              {/* Geographic Distribution */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-2">3. Geographic Breakdown</h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"><span className="font-black block">38%</span> South-West</div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"><span className="font-black block">20%</span> North-Central / FCT</div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"><span className="font-black block">16%</span> South-East</div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"><span className="font-black block">12%</span> South-South</div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"><span className="font-black block">9%</span> North-West</div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"><span className="font-black block">5%</span> North-East</div>
                </div>
              </div>

              {/* Packages Summary */}
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-grantify-green mb-2">4. Sponsorship Packages & Rate Card</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="font-black text-sm text-gray-900 dark:text-gray-100">Standard Tier</div>
                    <div className="text-base font-black text-grantify-green my-1">₦25,000</div>
                    <p className="text-[10px] text-gray-500">14-Day Directory Listing with Verified Partner Badge, Click Attribution tracking.</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border-2 border-grantify-gold">
                    <div className="font-black text-sm text-gray-900 dark:text-gray-100">Featured Tier (Popular)</div>
                    <div className="text-base font-black text-grantify-gold my-1">₦60,000</div>
                    <p className="text-[10px] text-gray-500">30-Day Homepage Spotlight, Priority Directory Rank, 1x WhatsApp broadcast co-sponsorship.</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-grantify-green">
                    <div className="font-black text-sm text-gray-900 dark:text-gray-100">Enterprise Partner</div>
                    <div className="text-base font-black text-grantify-green my-1">₦150,000</div>
                    <p className="text-[10px] text-gray-500">60-Day Guaranteed #1 Sticky Rank, 3x WhatsApp blasts, Sponsored Case Study, State Guide Header.</p>
                  </div>
                </div>
              </div>

              {/* Settlement & Invoicing */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1">5. Institutional Invoicing & Settlement</h4>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                  Official VAT-compliant corporate invoices are generated upon booking. Institutional bank wire transfers, electronic deposits, and card settlements are processed with same-day confirmation.
                </p>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Custom billing references and purchase orders (POs) are supported for banks, DFIs, and institutional partners.
                </div>
              </div>

              {/* Contacts */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
                <div>Partnerships Desk: <strong>partners@grantify.help</strong></div>
                <div>Grantify • Lagos, Nigeria</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};