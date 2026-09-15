import React, { useState, useRef } from 'react';
import { Download, Share2, Check, MessageSquare, Sparkles, Loader2 } from 'lucide-react';

export const FundingAlertCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const todayFormatted = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const todayShort = new Date().toISOString().slice(0, 10);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz?ref=funding-alert`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShareText = `🔔 Today's Verified Capital Highlights on Grantify (${todayFormatted}):\n• BOI SME Facility (up to ₦50M)\n• SMEDAN MSME Fund (up to ₦5M)\n• Tony Elumelu Seed Grant ($5,000 USD)\n\nCheck your eligibility here: ${window.location.origin}/quiz`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;

  const handleDownloadPng = async () => {
    setIsGenerating(true);
    try {
      // Build raw SVG string for high-res export
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
        <defs>
          <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#052e16" />
            <stop offset="50%" stop-color="#064e3b" />
            <stop offset="100%" stop-color="#022c22" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1080" fill="url(#mainBg)" />
        <circle cx="950" cy="120" r="320" fill="#F59E0B" opacity="0.15" />
        <circle cx="100" cy="980" r="360" fill="#10B981" opacity="0.15" />
        <rect x="40" y="40" width="1000" height="1000" rx="36" fill="none" stroke="#F59E0B" stroke-opacity="0.3" stroke-width="3" />
        
        <g transform="translate(80, 80)">
          <rect width="260" height="44" rx="22" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1.5" />
          <circle cx="28" cy="22" r="6" fill="#34D399" />
          <text x="46" y="28" fill="#A7F3D0" font-family="sans-serif" font-size="16" font-weight="900" letter-spacing="1.5">DAILY FUNDING ALERT</text>
        </g>

        <text x="80" y="195" fill="#FFFFFF" font-family="sans-serif" font-size="56" font-weight="900">Today's Verified Capital</text>
        <text x="80" y="240" fill="#FBBF24" font-family="sans-serif" font-size="24" font-weight="700">${todayFormatted}</text>

        <!-- Item 1 -->
        <g transform="translate(80, 280)">
          <rect width="920" height="180" rx="24" fill="#022c22" fill-opacity="0.9" stroke="#059669" stroke-width="2" />
          <rect x="36" y="28" width="220" height="28" rx="14" fill="#10B981" fill-opacity="0.2" />
          <text x="50" y="47" fill="#6EE7B7" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">MANUFACTURING &amp; AGRO</text>
          <text x="36" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900">Bank of Industry (BOI) SME Facility</text>
          <text x="36" y="132" fill="#9CA3AF" font-family="sans-serif" font-size="16">Single-digit interest capital for equipment &amp; industrial scale-up</text>
          <rect x="680" y="44" width="200" height="92" rx="18" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-opacity="0.4" stroke-width="1.5" />
          <text x="780" y="80" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="700">MAX ALLOCATION</text>
          <text x="780" y="115" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="26" font-weight="900">₦50,000,000</text>
        </g>

        <!-- Item 2 -->
        <g transform="translate(80, 485)">
          <rect width="920" height="180" rx="24" fill="#022c22" fill-opacity="0.9" stroke="#059669" stroke-width="2" />
          <rect x="36" y="28" width="230" height="28" rx="14" fill="#10B981" fill-opacity="0.2" />
          <text x="50" y="47" fill="#6EE7B7" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">SMALL BUSINESS &amp; TRADERS</text>
          <text x="36" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900">SMEDAN National Enterprise Support</text>
          <text x="36" y="132" fill="#9CA3AF" font-family="sans-serif" font-size="16">Collateral-free grants &amp; operational credit lines for artisans &amp; retailers</text>
          <rect x="680" y="44" width="200" height="92" rx="18" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-opacity="0.4" stroke-width="1.5" />
          <text x="780" y="80" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="700">MAX ALLOCATION</text>
          <text x="780" y="115" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="26" font-weight="900">₦5,000,000</text>
        </g>

        <!-- Item 3 -->
        <g transform="translate(80, 690)">
          <rect width="920" height="180" rx="24" fill="#022c22" fill-opacity="0.9" stroke="#059669" stroke-width="2" />
          <rect x="36" y="28" width="220" height="28" rx="14" fill="#10B981" fill-opacity="0.2" />
          <text x="50" y="47" fill="#6EE7B7" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">PAN-AFRICAN SEED GRANT</text>
          <text x="36" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900">Tony Elumelu Foundation (TEF)</text>
          <text x="36" y="132" fill="#9CA3AF" font-family="sans-serif" font-size="16">100% non-refundable seed capital for early-stage African entrepreneurs</text>
          <rect x="680" y="44" width="200" height="92" rx="18" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-opacity="0.4" stroke-width="1.5" />
          <text x="780" y="80" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="700">MAX ALLOCATION</text>
          <text x="780" y="115" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="26" font-weight="900">$5,000 USD</text>
        </g>

        <!-- Footer -->
        <g transform="translate(80, 915)">
          <line x1="0" y1="0" x2="920" y2="0" stroke="#F59E0B" stroke-opacity="0.2" stroke-width="1.5" />
          <text x="0" y="48" fill="#FCD34D" font-family="sans-serif" font-size="32" font-weight="900">Grantify.help</text>
          <text x="0" y="78" fill="#9CA3AF" font-family="sans-serif" font-size="15">Nigeria's Leading Grant &amp; MSME Capital Discovery Platform</text>
          <rect x="650" y="20" width="270" height="60" rx="30" fill="#F59E0B" />
          <text x="785" y="58" text-anchor="middle" fill="#052e16" font-family="sans-serif" font-size="17" font-weight="900">CHECK ELIGIBILITY →</text>
        </g>
      </svg>`;

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              const downloadUrl = URL.createObjectURL(pngBlob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `grantify-daily-funding-alert-${todayShort}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(downloadUrl);
            }
            setIsGenerating(false);
          }, 'image/png');
        } else {
          setIsGenerating(false);
        }
        URL.revokeObjectURL(blobURL);
      };
      img.onerror = () => {
        setIsGenerating(false);
        URL.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    } catch (e) {
      console.error('Failed to generate high-res PNG', e);
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-xl max-w-md mx-auto text-left">
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

      {/* Interactive Visual Graphic Card Preview */}
      <div className="relative aspect-square w-full max-w-[320px] mx-auto mb-6 rounded-2xl border border-grantify-gold/20 overflow-hidden shadow-lg group bg-gradient-to-br from-green-950 via-emerald-950 to-gray-950 p-4 flex flex-col justify-between select-none">
        {/* Decorative ambient elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-grantify-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-wider border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Daily Alert
            </span>
            <span className="text-[9px] font-black text-grantify-gold">grantify.help</span>
          </div>
          <h4 className="text-sm font-black text-white leading-tight">Today's Verified Grants</h4>
          <p className="text-[9px] text-gray-300 font-semibold">{todayFormatted}</p>
        </div>

        {/* 3 Grant Highlights */}
        <div className="relative z-10 space-y-1.5 my-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">Manufacturing &amp; Agro</div>
              <div className="text-[10px] font-black text-white">Bank of Industry (BOI)</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-grantify-gold">₦50,000,000</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">Small Business &amp; Traders</div>
              <div className="text-[10px] font-black text-white">SMEDAN Enterprise Fund</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-grantify-gold">₦5,000,000</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">Pan-African Seed Grant</div>
              <div className="text-[10px] font-black text-white">Tony Elumelu Foundation</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-grantify-gold">$5,000 USD</span>
            </div>
          </div>
        </div>

        {/* Card Footer Banner */}
        <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[8px] text-gray-400">Match verified programs</span>
          <span className="text-[8px] font-black bg-grantify-gold text-gray-950 px-2 py-0.5 rounded-full">Free Matching</span>
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold pointer-events-none">
          Click below to download high-res image
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isGenerating}
          className="w-full inline-flex items-center justify-center gap-2 bg-grantify-green hover:bg-green-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-75"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {isGenerating ? 'Generating 1080x1080 PNG...' : 'Download High-Res PNG'}
        </button>

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
