import React, { useEffect, useRef } from 'react';

// Hardcoded Advertica Banner Ad Component
// This bypasses the API-based ad loading for more reliable script execution
export const AdverticaBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptLoadedRef.current) return;

    // Create the ins element
    const ins = document.createElement('ins');
    ins.style.width = '300px';
    ins.style.height = '250px';
    ins.setAttribute('data-width', '300');
    ins.setAttribute('data-height', '250');
    ins.className = 'i503b5ca765';
    ins.setAttribute('data-domain', '//data527.click');
    ins.setAttribute('data-affquery', '/1b9b9a2a81bb4d9d02b8/503b5ca765/?placementName=default');

    // Create and append the script inside the ins element
    const script = document.createElement('script');
    script.src = '//data527.click/js/responsive.js';
    script.async = true;
    script.onload = () => {
      console.log('Advertica banner script loaded');
    };
    script.onerror = () => {
      console.error('Failed to load Advertica banner script');
    };

    ins.appendChild(script);
    containerRef.current.appendChild(ins);
    scriptLoadedRef.current = true;

    return () => {
      // Cleanup on unmount (optional, ads typically don't need cleanup)
    };
  }, []);

  return (
    <div className="my-4 flex flex-col items-center justify-center w-full overflow-hidden">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Advertisement</span>
      <div ref={containerRef} className="max-w-full flex justify-center" style={{minHeight: '250px'}} />
    </div>
  );
};
