import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { LoanProvider } from '../types';
import { ArrowRight, CheckCircle, ExternalLink, Loader2, Sparkles, Zap, Shield, Lock, RefreshCw, Star, Building2, CreditCard, Copy } from 'lucide-react';

type PricingTier = { id: number; tierName: string; priceCents: number; durationDays: number; description: string };

export const Sponsor: React.FC = () => {
  const location = useLocation();
  const [providers, setProviders] = useState<LoanProvider[]>([]);
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [sponsorMeta, setSponsorMeta] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState<'homepage' | 'directory'>('homepage');
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
          setTestimonials(Array.isArray(meta.testimonials) ? meta.testimonials : []);
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
              <Link to="/blog#media-kit" className="inline-flex items-center gap-2 border border-white/10 text-white font-black px-5 py-3 rounded-xl hover:bg-white/5 transition-all">
                Interactive Media Kit <ExternalLink size={16} />
              </Link>
            </div>
          </div>
 
          <div className="grid gap-3">
            {[
              'Premium top-of-funnel listing placements for maximum conversions',
              'Targeted sponsored editorial features and direct newsletter spots',
              'Real-time traffic performance dashboard and transparent click attribution',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur-sm">
                {item}
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
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={18} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Bank Wire Transfer Details</div>
                      <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">Transfer the package amount to the account below, then submit this form. Our team will verify and activate within 24hrs.</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {([
                      { label: 'Bank Name', value: 'Zenith Bank PLC' },
                      { label: 'Account Name', value: 'Grantify Media Ltd' },
                      { label: 'Account Number', value: '2212345678' },
                      { label: 'Sort Code / SWIFT', value: '057 / ZENITHNG' },
                      { label: 'Reference', value: form.email ? `SPONSOR-${form.email.split('@')[0].toUpperCase()}` : 'SPONSOR-[YOUR-EMAIL-PREFIX]' },
                    ] as const).map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800/40 rounded-xl px-4 py-2.5">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">{label}</span>
                          <span className="text-sm font-black text-gray-800 dark:text-gray-100 font-mono">{value}</span>
                        </div>
                        <button
                          type="button"
                          title={`Copy ${label}`}
                          onClick={() => {
                            navigator.clipboard.writeText(value).catch(() => {});
                            setCopiedField(label);
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className="text-gray-400 hover:text-grantify-green transition-colors flex-shrink-0"
                        >
                          {copiedField === label ? <CheckCircle size={14} className="text-grantify-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700/60 dark:text-amber-400/60 mt-3 leading-relaxed">
                    <strong>Note:</strong> Include your email as payment reference. VAT-compliant corporate invoices are issued upon payment confirmation. Wire transfers are processed within 1–2 business days.
                  </p>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-2">
              <div className={`text-xs ${message ? (message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'text-red-500' : 'text-grantify-green font-bold') : 'text-gray-500 dark:text-gray-400'}`}>
                {message || (form.paymentProvider === 'bankwire' ? 'Submit this form after completing your bank transfer. We will verify and activate your sponsorship.' : 'We will create the booking and either open checkout or queue an invoice for confirmation.')}
              </div>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 bg-grantify-green text-white font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : form.paymentProvider === 'bankwire' ? <><CreditCard size={16} /> Request Invoice</> : <><CheckCircle size={16} /> Launch Sponsorship</>}
              </button>
            </div>
          </form>
        </div>

        {/* Info & Proof Sidebar */}
        <div className="grid gap-6">
          {/* Testimonials */}
          <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-1">Proof</div>
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Advertiser results & testimonials</h3>
              </div>
              <Sparkles className="text-grantify-gold" size={18} />
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {testimonials.length ? testimonials.map((t, i) => (
                <div key={t.id || i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
                  <div className="text-xs font-black text-gray-900 dark:text-gray-100 mb-1">{t.author || t.name || 'Advertiser'}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">"{t.quote || t.content}"</p>
                </div>
              )) : (
                <div className="text-xs text-gray-500">No testimonials yet — contact sales to be featured.</div>
              )}
            </div>
          </div>

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
    </div>
  );
};