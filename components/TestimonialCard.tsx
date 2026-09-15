import React, { useState } from 'react';
import { Testimonial } from '../types';
import { ApiService } from '../services/storage';
import { ThumbsUp, Heart, Hand, ShieldCheck, CheckCircle } from 'lucide-react';

interface Props {
  data: Testimonial;
}

type ReactionType = 'likes' | 'loves' | 'claps';

// Default fallback avatar for broken/missing images
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22%23006400%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2255%22%20font-size%3D%2240%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E';

export const TestimonialCard: React.FC<Props> = ({ data }) => {
  const [counts, setCounts] = useState({
    likes: data.likes,
    loves: data.loves,
    claps: data.claps
  });

  const [currentVote, setCurrentVote] = useState<ReactionType | null>(null);
  const [imageError, setImageError] = useState(false);

  // Determine if testimonial is loan or grant
  const isLoan = data.fundingType === 'loan' || 
    (!data.fundingType && /(loan|lender|credit score|interest rate|repayment|credited on wednesday|fast-track loan)/i.test(data.content));

  const handleVote = async (type: ReactionType) => {
    const newCounts = { ...counts };
    
    if (currentVote === type) {
      // User is clicking the same reaction -> Toggle OFF
      newCounts[type] = Math.max(0, newCounts[type] - 1);
      setCurrentVote(null);
    } else {
      // User is switching reaction or adding new one
      if (currentVote) {
        newCounts[currentVote] = Math.max(0, newCounts[currentVote] - 1);
      }
      newCounts[type] = newCounts[type] + 1;
      setCurrentVote(type);
    }

    // Update Local State immediately
    setCounts(newCounts);

    // Update Backend
    const updatedTestimonial = { ...data, ...newCounts };
    await ApiService.updateTestimonial(updatedTestimonial);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 mb-4 flex flex-col h-full relative group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <img 
            src={imageError ? DEFAULT_AVATAR : data.image} 
            alt={data.name} 
            className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800 shrink-0"
            onError={handleImageError}
          />
          <div className="min-w-0">
            <h4 className="font-black text-gray-900 dark:text-gray-100 text-sm truncate">{data.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.date} • <span className={isLoan ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-emerald-700 dark:text-emerald-400 font-semibold"}>
                {isLoan ? 'Approved' : 'Received'} {formatCurrency(data.amount)}
              </span>
            </p>
          </div>
        </div>

        {/* Funding Type Badge */}
        <div className="shrink-0">
          {isLoan ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
              <ShieldCheck size={11} /> {data.provider ? `${data.provider} Loan` : 'Loan Approved'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <CheckCircle size={11} /> {data.provider ? `${data.provider} Grant` : 'Grant Match'}
            </span>
          )}
        </div>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed flex-grow">
        "{data.content}"
      </p>

      <div className="flex gap-4 border-t border-gray-100 dark:border-gray-800 pt-2 mt-auto">
        <button 
          onClick={() => handleVote('likes')}
          className={`flex items-center gap-1 text-xs transition-colors ${currentVote === 'likes' ? 'text-blue-600 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600'}`}
        >
          <ThumbsUp size={14} className={currentVote === 'likes' ? 'fill-blue-100' : ''} />
          <span>{counts.likes}</span>
        </button>
        <button 
          onClick={() => handleVote('loves')}
          className={`flex items-center gap-1 text-xs transition-colors ${currentVote === 'loves' ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-red-600'}`}
        >
          <Heart size={14} className={currentVote === 'loves' ? 'fill-red-100' : ''} />
          <span>{counts.loves}</span>
        </button>
        <button 
          onClick={() => handleVote('claps')}
          className={`flex items-center gap-1 text-xs transition-colors ${currentVote === 'claps' ? 'text-orange-500 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-orange-500'}`}
        >
          <Hand size={14} className={currentVote === 'claps' ? 'fill-orange-100' : ''} />
          <span>{counts.claps}</span>
        </button>
      </div>
    </div>
  );
};