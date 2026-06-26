import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft, Share2, ExternalLink, Sparkles, RotateCcw, Trophy } from 'lucide-react';
import { GRANT_NETWORKS } from '../utils/grantMatcher';

const SECTORS = ['Agriculture', 'Tech', 'Trade', 'Creative', 'Manufacturing', 'Health', 'Education', 'Other'];
const STAGES = ['Just an Idea', 'Early Stage (0–1 yr)', 'Growing (1–3 yrs)', 'Established (3+ yrs)'];
const STATES = [
  'Lagos', 'Abuja (FCT)', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Anambra', 'Ogun', 'Delta',
  'Enugu', 'Imo', 'Edo', 'Kwara', 'Borno', 'Plateau', 'Sokoto', 'Katsina', 'Bauchi',
  'Niger', 'Ondo', 'Cross River', 'Akwa Ibom', 'Abia', 'Osun', 'Ekiti', 'Taraba',
  'Nasarawa', 'Ebonyi', 'Kebbi', 'Zamfara', 'Gombe', 'Adamawa', 'Yobe', 'Jigawa',
  'Benue', 'Kogi', 'Bayelsa', 'Other'
];
const REVENUES = ['₦0 – ₦100,000 / mo', '₦100K – ₦500K / mo', '₦500K – ₦2M / mo', '₦2M+ / mo'];
const TEAM_SIZES = ['Solo (just me)', '2–5 people', '6–20 people', '20+ people'];

type Step = 0 | 1 | 2 | 3 | 4;

interface Answers {
  stage: string;
  sector: string;
  state: string;
  revenue: string;
  teamSize: string;
}

interface MatchResult {
  network: typeof GRANT_NETWORKS[0];
  score: number;
  percentage: number;
}

const scoreNetwork = (answers: Answers) => {
  const results: MatchResult[] = [];
  const sectorLower = answers.sector.toLowerCase();
  const stateLower = answers.state.toLowerCase();
  const stageLower = answers.stage.toLowerCase();

  // Map answers to categories
  const userCategories: string[] = [];
  if (['agriculture'].some(k => sectorLower.includes(k))) userCategories.push('agriculture');
  if (['tech', 'other'].some(k => sectorLower.includes(k))) userCategories.push('technology');
  if (['trade'].some(k => sectorLower.includes(k))) userCategories.push('trade');
  if (['creative'].some(k => sectorLower.includes(k))) userCategories.push('creative');
  if (['manufacturing'].some(k => sectorLower.includes(k))) userCategories.push('manufacturing');
  if (['health'].some(k => sectorLower.includes(k))) userCategories.push('health');
  if (['education'].some(k => sectorLower.includes(k))) userCategories.push('education');
  userCategories.push('sme'); // Everyone qualifies for SME

  // Youth preference
  const isYouth = answers.teamSize === TEAM_SIZES[0] || answers.stage.includes('Idea') || answers.stage.includes('Early');
  if (isYouth) userCategories.push('youth');

  const isWomen = false; // Could ask in future

  for (const network of GRANT_NETWORKS) {
    let score = 0;

    // Category match
    for (const cat of userCategories) {
      if (network.categories.includes(cat as any)) score += 10;
    }

    // Region match
    const isLagos = stateLower.includes('lagos');
    if (isLagos && network.id === 'lsetf') score += 20;
    if (network.region === 'nigeria') score += 5;
    if (network.region === 'africa') score += 3;

    // Revenue / stage weighting
    if (answers.revenue === REVENUES[3] && ['boi', 'dbn', 'agmeis'].includes(network.id)) score += 10;
    if ((answers.revenue === REVENUES[0] || answers.revenue === REVENUES[1]) && ['gep', 'nsip'].includes(network.id)) score += 10;
    if (stageLower.includes('idea') && ['tef', 'youwin', 'nitda'].includes(network.id)) score += 8;
    if (stageLower.includes('established') && ['boi', 'dbn'].includes(network.id)) score += 8;

    if (score > 0) results.push({ network, score, percentage: 0 });
  }

  // Normalize to percentages
  const maxScore = Math.max(...results.map(r => r.score), 1);
  return results
    .map(r => ({ ...r, percentage: Math.min(99, Math.round((r.score / maxScore) * 94) + 5) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};

const STEP_LABELS = ['Business Stage', 'Sector', 'Location', 'Monthly Revenue', 'Team Size'];

interface Props {
  onComplete?: (results: MatchResult[]) => void;
}

export const EligibilityQuiz: React.FC<Props> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ stage: '', sector: '', state: '', revenue: '', teamSize: '' });
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [copied, setCopied] = useState(false);

  const steps: { key: keyof Answers; label: string; options: string[] }[] = [
    { key: 'stage', label: 'What stage is your business at?', options: STAGES },
    { key: 'sector', label: 'What sector does your business operate in?', options: SECTORS },
    { key: 'state', label: 'Which state is your business based in?', options: STATES },
    { key: 'revenue', label: 'What is your approximate monthly revenue?', options: REVENUES },
    { key: 'teamSize', label: 'How many people work in your business?', options: TEAM_SIZES },
  ];

  const currentStep = steps[step];
  const currentAnswer = answers[currentStep.key];

  const handleSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentStep.key]: option }));
  };

  const handleNext = () => {
    if (!currentAnswer) return;
    if (step < 4) {
      setStep((step + 1) as Step);
    } else {
      const matched = scoreNetwork(answers);
      setResults(matched);
      onComplete?.(matched);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((step - 1) as Step);
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({ stage: '', sector: '', state: '', revenue: '', teamSize: '' });
    setResults(null);
  };

  const shareUrl = results ? `${window.location.origin}/quiz?match=${results[0]?.network.id}&score=${results[0]?.percentage}` : '';
  const shareText = results ? `I got a ${results[0]?.percentage}% match for ${results[0]?.network.name} on Grantify! Check your grant eligibility at ${shareUrl}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  if (results) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-grantify-green/10 border border-grantify-green/30 text-grantify-green rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
            <Sparkles size={12} /> Your Eligibility Results
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
            You matched {results.length} grant program{results.length !== 1 ? 's' : ''}!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Based on your business profile, here are your best funding matches.</p>
        </div>

        <div className="space-y-4 mb-8">
          {results.map((result, i) => (
            <div
              key={result.network.id}
              className={`rounded-2xl border p-5 transition-all ${
                i === 0
                  ? 'border-grantify-green bg-grantify-green/5 ring-2 ring-grantify-green/30 shadow-lg'
                  : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
              }`}
            >
              {i === 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Trophy size={14} className="text-grantify-gold" />
                  <span className="text-xs font-black uppercase tracking-widest text-grantify-gold">Best Match</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-gray-100 text-base mb-1">{result.network.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{result.network.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-2xl font-black ${i === 0 ? 'text-grantify-green' : 'text-gray-700 dark:text-gray-300'}`}>
                    {result.percentage}%
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">match</div>
                </div>
              </div>
              {/* Score bar */}
              <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${i === 0 ? 'bg-grantify-green' : 'bg-gray-400'}`}
                  ref={(el) => {
                    if (el) el.style.width = `${result.percentage}%`;
                  }}
                />
              </div>
              <div className="flex justify-end mt-3">
                <a
                  href={result.network.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-grantify-green hover:underline"
                >
                  Apply on official site <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Share Row */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Share your results</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={whatsappShare}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-all"
            >
              <Share2 size={14} /> Share on WhatsApp
            </a>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-black text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              {copied ? <CheckCircle size={14} className="text-grantify-green" /> : <Share2 size={14} />}
              {copied ? 'Link Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-500 font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <RotateCcw size={14} /> Retake Quiz
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/loan-providers" className="inline-flex items-center gap-2 text-grantify-green font-black text-sm hover:underline">
            Also browse verified loan providers <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">
            Step {step + 1} of {steps.length}
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-grantify-green">
            {STEP_LABELS[step]}
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-grantify-green to-grantify-gold rounded-full transition-all duration-500"
            ref={(el) => {
              if (el) el.style.width = `${((step + 1) / steps.length) * 100}%`;
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i <= step ? 'bg-grantify-green' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">
          {currentStep.label}
        </h2>
        <p className="text-sm text-gray-500">Select the option that best describes your business.</p>
      </div>

      {/* Options */}
      <div className={`grid gap-3 mb-8 ${currentStep.key === 'state' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {currentStep.options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            className={`text-left p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
              currentAnswer === option
                ? 'border-grantify-green bg-grantify-green/5 text-grantify-green shadow-md ring-2 ring-grantify-green/20'
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-grantify-green/40 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                currentAnswer === option ? 'border-grantify-green bg-grantify-green' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {currentAnswer === option && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              {option}
            </div>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="inline-flex items-center gap-2 text-gray-500 font-bold text-sm px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={handleNext}
          disabled={!currentAnswer}
          className="inline-flex items-center gap-2 bg-grantify-green text-white font-black px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step === 4 ? 'See My Matches' : 'Next'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
