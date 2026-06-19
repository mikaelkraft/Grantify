import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { LoanProvider } from '../types';
import { ArrowRight, CheckCircle, ExternalLink, Loader2, Sparkles, Zap, Shield, Lock, RefreshCw } from 'lucide-react';

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
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3 flex items-center gap-2"><Zap size={12} /> Sponsor</p>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.05] mb-5">Direct advert launch for partners who want results.</h1>
            <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-2xl mb-6">
              Book sponsored listings, article placements, or newsletter mentions directly. Pick a provider, choose a package, and submit the sponsorship request in one step.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#booking-form" className="inline-flex items-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                Book Sponsorship <ArrowRight size={16} />
              </a>
              <Link to="/blog#media-kit" className="inline-flex items-center gap-2 border border-white/10 text-white font-black px-5 py-3 rounded-xl hover:bg-white/5 transition-all">
                View Media Kit <ExternalLink size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              'Featured provider placements for maximum authority',
              'Sponsored content and weekly newsletter slots',
              'Self-serve activation and secure payment verification',
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
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100">Simple, Transparent Placement Packages</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Choose the advertising package that matches your growth goals. Click a card to select it and jump to the booking form below.
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
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">Direct Launch</div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Create sponsorship booking</h2>
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
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {message || 'We will create the booking and either open checkout or queue an invoice for confirmation.'}
              </div>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 bg-grantify-green text-white font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle size={16} /> Launch Sponsorship</>}
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
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-1">Preview</div>
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Where your sponsorship appears</h3>
              </div>
              <ExternalLink className="text-grantify-green" size={18} />
            </div>
            <div className="grid gap-3">
              {[
                { title: 'Home Page Banner', text: 'Top-of-funnel visibility on the main Grantify homepage and partner revenue section.' },
                { title: 'Blog Intel', text: 'Media-kit placement on the blog page where readers are already comparing options.' },
                { title: 'Provider Directory', text: 'Direct sponsored exposure alongside the relevant provider or listing context.' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3">
                  <div className="text-xs font-black uppercase tracking-wider text-grantify-gold mb-1">{item.title}</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
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
            { q: 'What happens after I click launch?', a: 'We create the sponsored booking, then either open checkout or queue an invoice for admin approval and activation.' },
            { q: 'Can I sponsor a specific provider?', a: 'Yes. The form lets you choose the provider you want featured so the booking maps to the right listing.' },
            { q: 'Will I get an invoice?', a: 'Yes. If checkout is not available, the admin flow can generate and email an invoice automatically.' },
            { q: 'Can I change the campaign note later?', a: 'Yes. The admin team can update invoice and billing details from the sponsored listings dashboard.' },
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