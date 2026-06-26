import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EligibilityQuiz } from '../components/EligibilityQuiz';
import { Zap, CheckCircle } from 'lucide-react';

export const Quiz: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    document.title = 'Grant Eligibility Quiz — Find Your Best Funding Match | Grantify';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Answer 5 quick questions and instantly discover which Nigerian government grants and funding programs you qualify for. SMEDAN, BOI, LSETF, TEF and more.');
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-grantify-green/10 border border-grantify-green/20 text-grantify-green rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-5">
          <Zap size={12} /> Free · Instant · No Sign-Up Required
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-gray-100 leading-[1.1] mb-4">
          Discover Your Best<br />
          <span className="text-grantify-green">Grant Matches</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto leading-relaxed">
          Answer 5 simple questions about your business and we'll instantly match you with the
          government grants, development funds, and loan schemes you're most likely to qualify for.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-5">
          {['SMEDAN', 'Bank of Industry', 'Tony Elumelu Foundation', 'LSETF Lagos', 'CBN AGSMEIS'].map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1">
              <CheckCircle size={10} className="text-grantify-green" /> {g}
            </span>
          ))}
        </div>
      </div>

      {/* Quiz Card */}
      <div className="rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-10 shadow-xl">
        <EligibilityQuiz />
      </div>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Grantify Grant Eligibility Quiz',
          description: 'Free 5-question quiz to match Nigerian businesses and entrepreneurs with eligible government grants, development funds, and loan programs.',
          url: 'https://grantify.help/quiz',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
        })}}
      />
    </div>
  );
};
