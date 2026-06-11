import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { LoanProvider } from '../types';
import { ArrowRight, CheckCircle, ExternalLink, Loader2, Sparkles, Zap } from 'lucide-react';

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
    note: ''
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
      const providerId = Number(form.providerId);
      const tierId = Number(form.tierId);
      if (!providerId || !tierId) throw new Error('Choose a provider and package.');

      const payerInfo = {
        name: form.name,
        email: form.email,
        company: form.company,
        website: form.website,
        note: form.note,
        placement: 'sponsor-page'
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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-12">
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
              <a href="#launch" className="inline-flex items-center gap-2 bg-white text-gray-900 font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                Book Sponsorship <ArrowRight size={16} />
              </a>
              <Link to="/blog#media-kit" className="inline-flex items-center gap-2 border border-white/10 text-white font-black px-5 py-3 rounded-xl hover:bg-white/5 transition-all">
                View Media Kit <ExternalLink size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              'Featured provider placements',
              'Sponsored content and newsletter slots',
              'Invoice support and activation workflow',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="launch" className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr] items-start">
        <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-grantify-green font-black uppercase tracking-widest text-xs">
            <Sparkles size={14} /> Packages
          </div>
          <div className="space-y-3">
            {pricing.map((tier, index) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, tierId: String(tier.id) }))}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${String(form.tierId) === String(tier.id) ? 'border-grantify-green bg-grantify-green/5' : 'border-gray-100 dark:border-gray-800 hover:border-grantify-green/30'} ${isFeaturedTier(tier, index) ? 'ring-2 ring-grantify-gold/70 shadow-lg' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-black uppercase tracking-widest text-grantify-gold">{tier.tierName}</div>
                      {isFeaturedTier(tier, index) && (
                        <span className="inline-flex items-center rounded-full bg-grantify-gold text-grantify-green px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                          Most Popular
                        </span>
                      )}
                      {sponsorMeta?.tiers && sponsorMeta.tiers.find((t: any) => String(t.id) === String(tier.id))?.slotsLeft !== null && (
                        (() => {
                          const m = sponsorMeta.tiers.find((t: any) => String(t.id) === String(tier.id));
                          if (!m) return null;
                          const left = m.slotsLeft;
                          if (left === null) return null;
                          return (
                            <span className="inline-flex items-center ml-2 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                              {left <= 5 ? `Only ${left} left` : `${left} slots`}
                            </span>
                          );
                        })()
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-black">{(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{tier.description}</p>
                  </div>
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">{tier.durationDays} days</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">Compare</div>
              <h3 className="text-xl font-black">Pick the right sponsorship tier</h3>
            </div>
            <CheckCircle className="text-grantify-green" size={18} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-gray-400">
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Use Case</th>
                  <th className="px-3 py-2">Launch</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((tier, index) => (
                  <tr key={tier.id} className={`rounded-2xl ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-950/40' : 'bg-transparent'} ${isFeaturedTier(tier, index) ? 'ring-2 ring-inset ring-grantify-gold/50' : ''}`}>
                    <td className="px-3 py-4 rounded-l-2xl font-black text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{tier.tierName}</span>
                        {isFeaturedTier(tier, index) && (
                          <span className="inline-flex items-center rounded-full bg-grantify-gold text-grantify-green px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                            Popular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-gray-700 dark:text-gray-300">{(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</td>
                    <td className="px-3 py-4 text-gray-700 dark:text-gray-300">{tier.durationDays} days</td>
                    <td className="px-3 py-4 text-gray-700 dark:text-gray-300">{tier.description}</td>
                    <td className="px-3 py-4 rounded-r-2xl">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, tierId: String(tier.id) }))}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${String(form.tierId) === String(tier.id) ? 'bg-grantify-green text-white' : 'bg-gray-900 text-white hover:bg-grantify-green'}`}
                      >
                        Choose
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">Placement Preview</div>
              <h3 className="text-xl font-black">Where your sponsorship appears</h3>
            </div>
            <ExternalLink className="text-grantify-green" size={18} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Home Page Banner', text: 'Top-of-funnel visibility on the main Grantify homepage and partner revenue section.' },
              { title: 'Blog Intel', text: 'Media-kit placement on the blog page where readers are already comparing options.' },
              { title: 'Provider Directory', text: 'Direct sponsored exposure alongside the relevant provider or listing context.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
                <div className="text-sm font-black uppercase tracking-widest text-grantify-gold mb-2">{item.title}</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials / Proof */}
        <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm lg:col-span-2 mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">Proof</div>
              <h3 className="text-xl font-black">Advertiser results & testimonials</h3>
            </div>
            <Sparkles className="text-grantify-gold" size={18} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.length ? testimonials.map((t, i) => (
              <div key={t.id || i} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2">{t.author || t.name || 'Advertiser'}</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{t.quote || t.content}</p>
              </div>
            )) : (
              <div className="text-sm text-gray-600">No testimonials yet — contact sales to be featured.</div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">Direct Launch</div>
              <h2 className="text-2xl font-black">Create sponsorship booking</h2>
            </div>
            {loading && <Loader2 className="animate-spin text-grantify-green" size={18} />}
          </div>

          <form onSubmit={launchSponsor} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Provider</label>
              <select
                value={form.providerId}
                onChange={(e) => setForm(prev => ({ ...prev, providerId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3"
                aria-label="Sponsor provider"
                title="Sponsor provider"
                required
              >
                <option value="">Select provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Package</label>
              <select
                value={form.tierId}
                onChange={(e) => setForm(prev => ({ ...prev, tierId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3"
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
              <input className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Your full name" title="Your full name" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Email</label>
              <input type="email" className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="name@company.com" title="Email address" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Company</label>
              <input className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3" value={form.company} onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))} placeholder="Company or brand" title="Company" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Website</label>
              <input className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3" value={form.website} onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))} placeholder="https://your-site.com" title="Website" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Campaign note</label>
              <textarea className="w-full min-h-[120px] rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3" value={form.note} onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))} placeholder="What are you promoting?" />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {message || 'We will create the booking and either open checkout or queue an invoice for confirmation.'}
              </div>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 bg-grantify-green text-white font-black px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle size={16} /> Launch Sponsorship</>}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 mb-2">FAQ</div>
              <h3 className="text-xl font-black">Quick answers for advertisers</h3>
            </div>
            <CheckCircle className="text-grantify-green" size={18} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { q: 'What happens after I click launch?', a: 'We create the sponsored booking, then either open checkout or queue an invoice for admin approval and activation.' },
              { q: 'Can I sponsor a specific provider?', a: 'Yes. The form lets you choose the provider you want featured so the booking maps to the right listing.' },
              { q: 'Will I get an invoice?', a: 'Yes. If checkout is not available, the admin flow can generate and email an invoice automatically.' },
              { q: 'Can I change the campaign note later?', a: 'Yes. The admin team can update invoice and billing details from the sponsored listings dashboard.' },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2">{item.q}</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};