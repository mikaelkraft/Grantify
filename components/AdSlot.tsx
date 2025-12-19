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

    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;

    // Find all script elements and handle them specially
    const scripts = temp.getElementsByTagName('script');
    const scriptsArray = Array.from(scripts);

    // Remove scripts from temp (they'll be added separately)
    scriptsArray.forEach(script => script.remove());

    // Add non-script content using createContextualFragment for inline execution
    if (temp.innerHTML.trim()) {
      const range = document.createRange();
      range.selectNode(containerRef.current);
      try {
        const fragment = range.createContextualFragment(temp.innerHTML);
        containerRef.current.appendChild(fragment);
      } catch (e) {
        containerRef.current.innerHTML = temp.innerHTML;
      }
    }

    // Now handle scripts - create new script elements to ensure they execute
    scriptsArray.forEach(originalScript => {
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(originalScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy inline script content
      if (originalScript.innerHTML) {
        newScript.innerHTML = originalScript.innerHTML;
      }
      
      // Append to container (this triggers execution for external scripts)
      containerRef.current?.appendChild(newScript);
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
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