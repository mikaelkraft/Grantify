import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash (like #repayment), let the browser or specific logic handle it
    if (hash) return;
    
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};
