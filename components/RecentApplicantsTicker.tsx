import React, { useEffect, useState } from 'react';
import { QualifiedPerson } from '../types';
import { formatNairaCompact } from '../utils/currency';
import { TrendingUp } from 'lucide-react';

interface Props {
  applicants: QualifiedPerson[];
}

export const RecentApplicantsTicker: React.FC<Props> = ({ applicants }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (applicants.length === 0) return;
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % applicants.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [applicants.length]);

  if (applicants.length === 0) return null;

  const current = applicants[offset];

  return (
    <div className="bg-gray-900 text-white py-2 px-4 flex items-center justify-center gap-4 overflow-hidden relative border-y border-white/5">
      <div className="flex items-center gap-2 text-grantify-gold text-[10px] font-black uppercase tracking-widest whitespace-nowrap animate-pulse">
        <TrendingUp size={12} /> Live Updates
      </div>
      
      <div className="h-6 flex items-center overflow-hidden">
        <div 
          key={offset}
          className="flex items-center gap-3 transition-transform duration-500 ease-in-out whitespace-nowrap animate-slide-up"
        >
          <span className="text-xs font-bold">{current.name}</span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
            {formatNairaCompact(current.amount)}
          </span>
          <span className="text-[10px] text-green-400 font-black uppercase tracking-tighter">
            {current.status}
          </span>
        </div>
      </div>

      <div className="hidden md:flex ml-auto items-center gap-4 opacity-50">
        {applicants.slice(0, 3).map((a, i) => (
          <div key={i} className="text-[10px] flex gap-2">
            <span className="font-bold">{a.name}</span>
            <span className="text-grantify-gold">{formatNairaCompact(a.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
