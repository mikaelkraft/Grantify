import React, { useEffect, useRef } from 'react';

// Google AdSense Multiplex Ad Component
export const AdSenseMultiplex: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || adLoadedRef.current) return;

    // Create the ins element for AdSense
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-format', 'autorelaxed');
    ins.setAttribute('data-ad-client', 'ca-pub-5375979347378755');
    ins.setAttribute('data-ad-slot', '6679510219');

    containerRef.current.appendChild(ins);

    // Push to adsbygoogle to initialize the ad
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adLoadedRef.current = true;
      console.log('AdSense multiplex ad initialized');
    } catch (error) {
      console.error('AdSense initialization error:', error);
    }

    return () => {
      // Cleanup not typically needed for AdSense
    };
  }, []);

  return (
    <div className="my-6 flex flex-col items-center justify-center bg-gray-100 py-4">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Sponsored Content</span>
      <div ref={containerRef} className="w-full max-w-4xl" style={{minHeight: '250px'}} />
    </div>
  );
};
