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

    try {
      loadAdContent();
    } catch (error) {
      console.error('Error loading ad content:', error);
      setHasError(true);
      setIsLoading(false);
    }

    return () => {
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
    const promises: Promise<void>[] = [];
    for (const originalScript of scripts) {
      const isAsync = originalScript.hasAttribute('async');
      const promise = loadSingleScript(originalScript);
      
      if (!isAsync) {
        try {
          await promise;
        } catch (error) {
          console.error('Error loading ad script:', error);
        }
      } else {
        promises.push(promise.catch(e => console.error('Async ad script error:', e)));
      }
    }
    // Still wait for all (including async) before setting loading to false
    await Promise.all(promises);
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
          // Set fetchpriority for external scripts
          if (originalScript.src) {
             newScript.setAttribute('fetchpriority', 'high');
          }
          originalScript.parentNode.replaceChild(newScript, originalScript);
        } else {
          // Fallback if somehow detached (shouldn't happen with current logic)
          containerRef.current?.appendChild(newScript);
        }
        
        // For inline/defer, resolve quickly
        if (!originalScript.src || newScript.hasAttribute('defer')) {
          // Use a micro-task or next frame for stability without fixed delays
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
          } else {
            setTimeout(resolve, 0);
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Trigger ad network refresh/initialization
  const triggerAdRefresh = (scriptSrc: string) => {
    try {
      // Propeller Ads / Generic Refresh
      if (scriptSrc.includes('propellerads') || scriptSrc.includes('propeller') || scriptSrc.includes('advertica')) {
        console.log('Ad script loaded successfully');
      }

      // Add other network-specific refresh triggers here if needed
    } catch (error) {
      console.warn('Error triggering ad refresh:', error);
    }
  };

  if (!htmlContent || !htmlContent.trim()) return null;

  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <div 
        className="w-full overflow-hidden min-h-[50px] flex items-center justify-center relative"
      >
        {isLoading && !hasError ? (
          <div className="text-gray-400 text-[10px] animate-pulse py-2">Loading sponsor content...</div>
        ) : hasError ? (
          <div className="text-gray-300 text-[9px] py-1">Sponsor content temporarily unavailable</div>
        ) : null}
        <div ref={containerRef} className="w-full flex justify-center" />
      </div>
    </div>
  );
};