import React, { useState } from 'react';
import { ApiService } from '../services/storage';
import { Download, Share2, Check, MessageSquare, Sparkles } from 'lucide-react';

export const FundingAlertCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const imageUrl = `${ApiService.getFundingAlertImageUrl()}?t=${new Date().toISOString().slice(0, 10)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(imageUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShareText = `Check out today's top government and private grants on Grantify! See which ones you qualify for here: ${window.location.origin}/quiz`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;

  return (
    <div className="rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-xl max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-grantify-green/10 border border-grantify-green/20 text-grantify-green rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-3">
          <Sparkles size={10} /> Daily Shareable Card
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter">
          Today's Funding Alert
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          Download this graphic to share on your WhatsApp status, Facebook, or Instagram to help other entrepreneurs find funding!
        </p>
      </div>

      {/* Card Preview Image */}
      <div className="relative aspect-square w-full max-w-[280px] mx-auto mb-6 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-md group">
        <img
          src={imageUrl}
          alt="Daily Funding Alert"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          crossOrigin="anonymous"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold pointer-events-none">
          Click below to download
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <a
          href={imageUrl}
          download={`grantify-grants-alert-${new Date().toISOString().slice(0, 10)}.png`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-grantify-green hover:bg-green-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <Download size={14} /> Download High-Res PNG
        </a>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-[10px] uppercase py-2.5 px-3 rounded-xl transition-all"
          >
            <MessageSquare size={12} /> Share Status
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 border border-gray-250 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold text-[10px] uppercase py-2.5 px-3 rounded-xl transition-all"
          >
            {copied ? <Check size={12} className="text-grantify-green" /> : <Share2 size={12} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
};
