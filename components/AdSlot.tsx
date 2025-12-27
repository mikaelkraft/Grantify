import React, { useEffect, useRef, useState } from 'react';

interface AdSlotProps {
  htmlContent: string;
  className?: string;
  label?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ htmlContent, className = "", label = "Advertisement" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptsLoadedRef = useRef<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !htmlContent) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        loadAdContent();
      } catch (error) {
        console.error('Error loading ad content:', error);
        setHasError(true);
        setIsLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Don't clear content on unmount to avoid interrupting ad loading
    };
  }, [htmlContent]);

  const loadAdContent = () => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;

    // Find all script elements and handle them specially
    // const scripts = temp.getElementsByTagName('script');
    // const scriptsArray = Array.from(scripts); 
    // MOVED: We need to find them in the REAL DOM to replace them.

    // Remove scripts from temp? NO. Leave them so they are added to DOM.
    // They won't execute yet because we are adding via innerHTML/Fragment.
    // scriptsArray.forEach(script => script.remove());

    // Add content (including dead scripts) first
    if (temp.innerHTML.trim()) {
      const range = document.createRange();
      range.selectNode(containerRef.current);
      try {
        const fragment = range.createContextualFragment(temp.innerHTML);
        containerRef.current.appendChild(fragment);
      } catch (e) {
        console.warn('Using innerHTML fallback for ad content');
        containerRef.current.innerHTML = temp.innerHTML;
      }
    }

    // Load scripts sequentially to maintain execution order
    const scripts = containerRef.current.getElementsByTagName('script');
    const scriptsArray = Array.from(scripts);
    loadScriptsSequentially(scriptsArray);
  };

  const loadScriptsSequentially = async (scripts: HTMLScriptElement[]) => {
    for (const originalScript of scripts) {
      try {
        await loadSingleScript(originalScript);
      } catch (error) {
        console.error('Error loading ad script:', error);
      }
    }
    setIsLoading(false);
  };

  const loadSingleScript = (originalScript: HTMLScriptElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Create new script element
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(originalScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Handle external scripts with src
      if (originalScript.src) {
        const scriptSrc = originalScript.src;
        
        // Simple dedupe for global libraries if needed
        // For nested ads, we might want to re-run them if they are specific to the slot
        
        newScript.onload = () => {
          scriptsLoadedRef.current.add(scriptSrc);
          triggerAdRefresh(scriptSrc);
          resolve();
        };
        
        newScript.onerror = () => {
          console.error(`Failed to load ad script: ${scriptSrc}`);
          reject(new Error(`Script load failed: ${scriptSrc}`));
        };

        // For async scripts, don't wait but still execute
        if (newScript.hasAttribute('async')) {
           // We resolve immediately for async so next scripts don't wait
           resolve();
        }
      } else {
        // Inline script - copy content
        if (originalScript.innerHTML) {
          newScript.innerHTML = originalScript.innerHTML;
        }
      }
      
      // CRITICAL CHANGE: Replace the original script IN PLACE
      // This preserves the DOM hierarchy (e.g. script inside <ins>)
      try {
        if (originalScript.parentNode) {
          originalScript.parentNode.replaceChild(newScript, originalScript);
        } else {
          // Fallback if somehow detached (shouldn't happen with current logic)
          containerRef.current?.appendChild(newScript);
        }
        
        // For inline/defer, resolve quickly
        if (!originalScript.src || newScript.hasAttribute('defer')) {
          setTimeout(resolve, 50);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Trigger ad network refresh/initialization
  const triggerAdRefresh = (scriptSrc: string) => {
    try {
      // Google AdSense
      if (scriptSrc.includes('adsbygoogle')) {
        if (window.adsbygoogle) {
          window.adsbygoogle.push({});
        }
      }
      
      // Propeller Ads
      if (scriptSrc.includes('propellerads') || scriptSrc.includes('propeller')) {
        // Propeller ads typically auto-initialize
        console.log('Propeller Ads script loaded');
      }

      // Generic ad refresh
      setTimeout(() => {
        // Check if there are any ins elements for AdSense
        const adsenseElements = containerRef.current?.querySelectorAll('ins.adsbygoogle');
        if (adsenseElements && adsenseElements.length > 0) {
          adsenseElements.forEach((el) => {
            const adElement = el as HTMLElement;
            if (!adElement.getAttribute('data-adsbygoogle-status')) {
              try {
                if (window.adsbygoogle) {
                  window.adsbygoogle.push({});
                }
              } catch (e) {
                console.warn('AdSense push failed:', e);
              }
            }
          });
        }
      }, 100);
    } catch (error) {
      console.warn('Error triggering ad refresh:', error);
    }
  };

  if (!htmlContent) return null;

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <div 
        className="w-full overflow-hidden min-h-[50px] flex items-center justify-center relative"
      >
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-gray-400 text-xs">Loading...</div>
          </div>
        )}
        {hasError && (
           <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <div className="text-red-400 text-xs">Ad failed to load</div>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
};