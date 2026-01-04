import React, { useEffect, useRef } from 'react';

/**
 * Advertica Responsive Banner Component
 * This handles the 'responsive' ad unit that adjusts its size.
 */
export const AdverticaResponsiveBanner: React.FC<{ placement?: string }> = ({ placement = 'default' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptLoadedRef.current) return;

    // Create the ins element provided by the user
    const ins = document.createElement('ins');
    ins.style.width = '0px';
    ins.style.height = '0px';
    ins.setAttribute('data-width', '0');
    ins.setAttribute('data-height', '0');
    ins.className = 'w726dd010b5';
    ins.setAttribute('data-domain', '//data527.click');
    ins.setAttribute('data-affquery', `/dcf6853ab9def03463b0/726dd010b5/?placementName=${placement}`);

    // Create and append the script inside the ins element
    const script = document.createElement('script');
    script.src = '//data527.click/js/responsive.js';
    script.async = true;
    script.setAttribute('fetchpriority', 'high');

    ins.appendChild(script);
    containerRef.current.appendChild(ins);
    scriptLoadedRef.current = true;
  }, [placement]);

  return (
    <div className="my-6 flex flex-col items-center justify-center w-full min-h-[50px]">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Recommended for you</span>
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  );
};
