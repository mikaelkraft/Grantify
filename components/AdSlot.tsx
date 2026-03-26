import React, { useEffect, useRef, useState } from 'react';

interface AdSlotProps {
  htmlContent: string;
  className?: string;
  label?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ htmlContent, className = "", label = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
    
    // Google AdSense Initialization
    // For AdSense, we need to call push() for each ad unit injected via SPA
    const adSenseUnits = containerRef.current?.querySelectorAll('.adsbygoogle') || [];
    if (adSenseUnits.length) {
      try {
        // Ensure the global queue exists even if the script is still loading.
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];

        // In SPAs, multiple units can be injected during navigation. Initialize each unit.
        // Avoid throwing if AdSense isn't ready yet.
        adSenseUnits.forEach(() => {
          try {
            (window as any).adsbygoogle.push({});
          } catch (e) {
            // Common benign cases:
            // - script not yet loaded
            // - "All 'ins' elements in the DOM with class=adsbygoogle already have ads in them"
            // - account not active yet
            console.warn('[AdSlot] AdSense push error (safe to ignore):', e);
          }
        });
      } catch (e) {
        console.warn('[AdSlot] AdSense init error (safe to ignore):', e);
      }
    }

    setIsLoading(false);
  };

  const loadSingleScript = (originalScript: HTMLScriptElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      // If someone pasted the AdSense loader script into a slot, ignore it here.
      // It should be loaded once globally (index.html or head injection).
      const srcLower = String(originalScript.src || '').toLowerCase();
      if (srcLower.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) {
        try {
          originalScript.parentNode?.removeChild(originalScript);
        } catch {
          // no-op
        }
        resolve();
        return;
      }

      // Determine if we should handle script manually or let contextual fragment do it
      // Note: for some ad networks like Monetag, we want to ensure scripts are completely fresh
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(originalScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Handle external scripts with src
      if (originalScript.src) {
        const scriptSrc = originalScript.src;

        // Do not add ad-hoc cache-busting attributes; many ad networks are sensitive to script tags.
        // If a network needs cache busting, it should be done via the URL query param by that network.

        newScript.onload = () => {
          triggerAdRefresh(scriptSrc);
          resolve();
        };
        
        newScript.onerror = () => {
          console.error(`Failed to load ad script: ${scriptSrc}`);
          reject(new Error(`Script load failed: ${scriptSrc}`));
        };

        // For async scripts, let onload/onerror resolve; we already run them in parallel upstream.
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
      {label && label.trim() ? (
        <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      ) : null}
      <div 
        className="w-full overflow-hidden min-h-[50px] flex items-center justify-center relative"
      >
        {/* No placeholder copy: keep slots quiet until filled */}
        <div ref={containerRef} className="w-full flex justify-center" />
      </div>
    </div>
  );
};