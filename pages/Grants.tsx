import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Landmark, Award, Zap, ArrowRight, CheckCircle, ExternalLink, HelpCircle, ChevronRight, Info } from 'lucide-react';
import { GRANT_NETWORKS } from '../utils/grantMatcher';
import { GrantNetwork } from '../types';

const STATES = [
  'Lagos', 'Abuja (FCT)', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Anambra', 'Ogun', 'Delta',
  'Enugu', 'Imo', 'Edo', 'Kwara', 'Borno', 'Plateau', 'Sokoto', 'Katsina', 'Bauchi',
  'Niger', 'Ondo', 'Cross River', 'Akwa Ibom', 'Abia', 'Osun', 'Ekiti', 'Taraba',
  'Nasarawa', 'Ebonyi', 'Kebbi', 'Zamfara', 'Gombe', 'Adamawa', 'Yobe', 'Jigawa',
  'Benue', 'Kogi', 'Bayelsa'
];

const stateToSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const slugToState = (slug: string) => {
  const normalized = slug.replace(/-/g, ' ');
  return STATES.find(s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ') === normalized || (s.toLowerCase().includes('abuja') && normalized.includes('abuja'))) || 'Lagos';
};

export const Grants: React.FC = () => {
  const { state } = useParams<{ state: string }>();
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState('Lagos');

  useEffect(() => {
    if (state) {
      const matched = slugToState(state);
      setSelectedState(matched);
      document.title = `SME Grants & Loans in ${matched} State — CAC Funding Registry | Grantify`;
      
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', `Verified list of business grants, government interest-free loans, and startup funding programs available for SMEs and entrepreneurs in ${matched} State, Nigeria.`);
      }
    }
  }, [state]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextState = e.target.value;
    setSelectedState(nextState);
    navigate(`/grants/${stateToSlug(nextState)}`);
  };

  const stateGrants = React.useMemo(() => {
    const stateLower = selectedState.toLowerCase();
    return GRANT_NETWORKS.filter(n => {
      // LSETF only applies to Lagos
      if (n.id === 'lsetf') {
        return stateLower.includes('lagos');
      }
      return true;
    });
  }, [selectedState]);

  // JSON-LD local SEO schemas
  const jsonLdSchema = React.useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@context': 'https://schema.org',
          '@type': 'Guide',
          'name': `Guide to Small Business Grants & Funding in ${selectedState} State`,
          'description': `Discover verified state, federal, and international funding programs matching CAC-registered companies and startups operating in ${selectedState} State, Nigeria.`,
          'url': `${window.location.origin}/grants/${stateToSlug(selectedState)}`,
          'inLanguage': 'en-NG',
          'publisher': {
            '@type': 'Organization',
            'name': 'Grantify',
            'url': 'https://grantify.help'
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': [
            {
              '@type': 'Question',
              'name': `What grants are available for small businesses in ${selectedState} State?`,
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': `SMEs in ${selectedState} can apply for federal schemes such as SMEDAN and the Bank of Industry (BOI) loans. For Lagos residents, the Lagos State Employment Trust Fund (LSETF) provides local state-backed micro-grants and low-interest capital.`
              }
            },
            {
              '@type': 'Question',
              'name': `Do I need a CAC registration to get a business grant in ${selectedState}?`,
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': `Yes, almost all official government and institutional funding bodies require active registration with the Corporate Affairs Commission (CAC), along with a Tax Identification Number (TIN).`
              }
            }
          ]
        }
      ]
    };
  }, [selectedState]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-emerald-950 via-gray-950 to-emerald-950 py-16 px-4 mb-10 overflow-hidden text-center text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-grantify-gold/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-grantify-green/20 rounded-full blur-[100px] -ml-40 -mb-40"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-grantify-gold/20 border border-grantify-gold/30 text-grantify-gold rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-6">
            <Landmark size={12} /> Localized State Directory
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            SME Grants & Loans in <span className="text-grantify-gold">{selectedState} State</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
            Verified local state incentives, federal development funding, and international grants matching small businesses and startups based in {selectedState}.
          </p>

          {/* Quick State Switcher Dropdown */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 max-w-md mx-auto backdrop-blur-sm">
            <span className="text-sm font-bold text-gray-300">Switch State:</span>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full sm:w-auto bg-gray-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-grantify-gold"
              title="Select State"
              aria-label="Select State"
            >
              {STATES.map(s => (
                <option key={s} value={s} className="bg-gray-950">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 grid lg:grid-cols-[1fr_360px] gap-8">
        
        {/* Left Column: Mapped Grants */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Available Programs</h2>
              <p className="text-sm text-gray-500 mt-0.5">{stateGrants.length} verified program{stateGrants.length !== 1 ? 's' : ''} matched for your region</p>
            </div>
            <Link to="/quiz" className="hidden sm:inline-flex items-center gap-2 bg-grantify-green text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md hover:bg-green-700 transition-all">
              <Zap size={12} /> Test Eligibility
            </Link>
          </div>

          <div className="grid gap-6">
            {stateGrants.map((network) => {
              const isLocal = network.id === 'lsetf';
              const isFederal = network.region === 'nigeria' && !isLocal;
              const isInternational = network.region !== 'nigeria';

              return (
                <div
                  key={network.id}
                  className={`relative rounded-3xl border bg-white dark:bg-gray-900 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
                    isLocal 
                      ? 'border-grantify-gold ring-1 ring-grantify-gold/25' 
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  {/* Badge */}
                  <div className="absolute top-0 right-0">
                    {isLocal && (
                      <span className="bg-gradient-to-r from-amber-500 to-grantify-gold text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                        State-Level Program
                      </span>
                    )}
                    {isFederal && (
                      <span className="bg-grantify-green/10 text-grantify-green text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                        Federal Scheme
                      </span>
                    )}
                    {isInternational && (
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                        International Grant
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-4 mt-2">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-950 rounded-2xl flex items-center justify-center text-grantify-green font-black text-xl border border-gray-100 dark:border-gray-800 shrink-0">
                      {network.name.charAt(0)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-xl font-black text-gray-900 dark:text-gray-105 hover:text-grantify-green transition-colors leading-tight mb-1">
                        {network.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Region: {network.region}</span>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">·</span>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">CAC Required</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                        {network.description}
                      </p>
                      
                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {network.keywords.slice(0, 5).map(kw => (
                          <span key={kw} className="text-[10px] font-bold bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-gray-500 px-2 py-0.5 rounded-md">
                            #{kw}
                          </span>
                        ))}
                      </div>
                      
                      {/* Action link */}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-gray-800">
                        <Link to="/quiz" className="text-xs font-black text-grantify-green hover:underline flex items-center gap-1">
                          Verify Eligibility Match <ChevronRight size={14} />
                        </Link>
                        <a
                          href={network.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all"
                        >
                          Official Portal <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Local Checklist & Info */}
        <div className="space-y-6">
          {/* Checklist card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-grantify-green" /> Mapped Requirements
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Standard compliance needed to successfully qualify for business funding in {selectedState} State:
            </p>
            
            <ul className="space-y-3">
              {[
                { title: 'CAC Incorporation', desc: 'Registered Business Name or LTD entity.' },
                { title: 'Tax Clearance Certificate', desc: 'Active Tax ID (TIN) for business/personal.' },
                { title: 'Business Address', desc: 'Rent receipt or utility bill in the state.' },
                { title: 'Residency Verification', desc: `${selectedState === 'Lagos' ? 'LASSRA residency card' : 'State voter registration or residency card.'}` },
                { title: 'Valid Identity Proof', desc: 'National Identity Number (NIN) slip.' }
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle size={16} className="text-grantify-green flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">{item.title}</div>
                    <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick FAQ info widget */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <HelpCircle className="text-grantify-gold" /> Frequently Asked
            </h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">How long does disbursement take?</h4>
                <p className="text-[10px] text-gray-505 leading-relaxed mt-1">
                  Federal programs (e.g. BOI) typically take 2-4 months. Local state microloans (LSETF) average 4-6 weeks.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Are these loans interest-free?</h4>
                <p className="text-[10px] text-gray-505 leading-relaxed mt-1">
                  Some micro-grants are completely free (zero interest, non-repayable). Other state-backed SME loan rates vary from 5% to 9% per annum.
                </p>
              </div>
            </div>
          </div>

          {/* Quiz CTA Widget */}
          <div className="bg-gradient-to-br from-grantify-green to-emerald-800 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <h3 className="text-lg font-black mb-2 flex items-center gap-2">
              <Zap className="text-grantify-gold" /> Eligibility Checker
            </h3>
            <p className="text-xs text-green-150 leading-relaxed mb-4">
              Not sure which funding fits your CAC business best? Answer 5 short questions on our matcher.
            </p>
            <Link to="/quiz" className="block text-center bg-white text-grantify-green font-black py-3 rounded-xl text-xs shadow-md hover:bg-gray-50 hover:scale-102 transition-all">
              Run Free Check
            </Link>
          </div>
        </div>

      </div>

      {/* JSON-LD Script tag for Local SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />
    </div>
  );
};
