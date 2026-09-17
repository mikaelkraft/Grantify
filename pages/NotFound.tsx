import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, BookOpen, Landmark, Trophy, ArrowRight, HelpCircle, AlertCircle } from 'lucide-react';
import { SEO } from '../components/SEO';

export const NotFound: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/blog?q=${encodeURIComponent(q)}`);
    }
  };

  const POPULAR_STATES = [
    { name: 'Lagos', slug: 'lagos' },
    { name: 'Abuja (FCT)', slug: 'fct-abuja' },
    { name: 'Kano', slug: 'kano' },
    { name: 'Rivers', slug: 'rivers' },
    { name: 'Oyo', slug: 'oyo' },
    { name: 'Kaduna', slug: 'kaduna' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <SEO
        title="404 - Page Not Found | Grantify"
        description="The requested page or grant resource could not be found. Search Grantify for verified grants, loan providers, and financial intelligence in Nigeria."
      />

      <div className="max-w-3xl w-full text-center space-y-10">
        {/* Animated Badge & Error Code */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-black uppercase tracking-wider">
            <AlertCircle size={14} /> Error 404 • Resource Moved or Unavailable
          </div>
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-black font-heading text-grantify-green dark:text-grantify-gold tracking-tight">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Looking for Funding? This Page Got Lost.
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            The link you followed may be outdated, expired, or mistyped. Use the search bar below or explore our verified capital hubs.
          </p>
        </div>

        {/* Interactive Search Bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search grants, loan providers, or guides (e.g. SMEDAN, BOI, Lagos)..."
              className="w-full pl-12 pr-28 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-grantify-green transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 bg-grantify-green hover:bg-green-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
            >
              Search
            </button>
          </div>
        </form>

        {/* Popular Hubs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
          <Link
            to="/"
            className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-grantify-green dark:hover:border-grantify-gold transition-all shadow-sm hover:shadow-md flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/60 text-grantify-green dark:text-green-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Home size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-grantify-green dark:group-hover:text-grantify-gold transition-colors flex items-center gap-1.5">
                Grant Match Engine <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Check eligibility for verified federal, state, and donor intervention grants.
              </p>
            </div>
          </Link>

          <Link
            to="/loan-providers"
            className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-grantify-green dark:hover:border-grantify-gold transition-all shadow-sm hover:shadow-md flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Landmark size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-grantify-green dark:group-hover:text-grantify-gold transition-colors flex items-center gap-1.5">
                Verified Loan Providers <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Compare licensed instant loan apps, interest ceilings, and community reviews.
              </p>
            </div>
          </Link>

          <Link
            to="/blog"
            className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-grantify-green dark:hover:border-grantify-gold transition-all shadow-sm hover:shadow-md flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-grantify-green dark:group-hover:text-grantify-gold transition-colors flex items-center gap-1.5">
                Funding Intelligence Blog <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Step-by-step guides on CAC registration, application tips, and new grants.
              </p>
            </div>
          </Link>

          <Link
            to="/pitch"
            className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-grantify-green dark:hover:border-grantify-gold transition-all shadow-sm hover:shadow-md flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Trophy size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-grantify-green dark:group-hover:text-grantify-gold transition-colors flex items-center gap-1.5">
                Weekly ₦50K Pitch Hub <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Submit your business pitch and vote for community winners every week.
              </p>
            </div>
          </Link>
        </div>

        {/* State Quick Links */}
        <div className="pt-2">
          <p className="text-xs uppercase font-black tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Popular State Grant Registries
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_STATES.map((s) => (
              <Link
                key={s.slug}
                to={`/grants/${s.slug}`}
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-grantify-green hover:text-white dark:hover:bg-grantify-gold dark:hover:text-gray-950 transition-colors"
              >
                {s.name} Grants
              </Link>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-grantify-green hover:bg-green-800 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <Home size={18} /> Back to Homepage
          </Link>
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold px-6 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all"
          >
            <HelpCircle size={18} /> Contact Help Desk
          </Link>
        </div>
      </div>
    </div>
  );
};
