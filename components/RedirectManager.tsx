import { useEffect } from 'react';

/**
 * RedirectManager Component
 * Handles the 'Delayed Redirect' script to ensure it doesn't trigger immediately.
 * satisfy: "takes time to show up or on another in-page click"
 */
export const RedirectManager = () => {
  useEffect(() => {
    // Wait 30 seconds before injecting the redirect script
    // This allows the user to explore the page first
    const timer = setTimeout(() => {
      console.log('Injecting delayed redirect ad...');
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//data527.click/8df5f6963d4b436cb1bb/1002627a93/?placementName=delayed';
      script.async = true;
      document.body.appendChild(script);
    }, 30000); // 30 second delay

    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything UI-wise
};
