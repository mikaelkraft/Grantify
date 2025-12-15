import React, { useEffect, useRef } from 'react';

interface AdSlotProps {
  htmlContent: string;
  className?: string;
  label?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ htmlContent, className = "", label = "Advertisement" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create a range to create a fragment that executes scripts
    const range = document.createRange();
    range.selectNode(containerRef.current);
    
    // createContextualFragment parses the markup and allows scripts to execute when appended
    try {
      const documentFragment = range.createContextualFragment(htmlContent);
      containerRef.current.appendChild(documentFragment);
    } catch (e) {
      console.error("AdSlot Error:", e);
      // Fallback
      containerRef.current.innerHTML = htmlContent;
    }

  }, [htmlContent]);

  if (!htmlContent) return null;

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <div 
        ref={containerRef}
        className="w-full overflow-hidden"
      />
    </div>
  );
};