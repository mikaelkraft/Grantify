import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdSlot } from './AdSlot';
import { ApiService } from '../services/storage';
import { AdConfig } from '../types';
import { Menu, X, Banknote, AlertTriangle, ShieldAlert, RefreshCw, HelpCircle } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [blockerDetected, setBlockerDetected] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const loadAds = async () => {
      try {
        const adData = await ApiService.getAds();
        setAds(adData);
        
        // Inject head scripts (e.g., Google AdSense, analytics) after a small delay
        // to ensure DOM is fully ready
        if (adData?.head) {
          setTimeout(() => {
            injectHeadScripts(adData.head);
          }, 200);
        }
      } catch (error) {
        console.error('Error loading ads:', error);
      }
    };
    
    loadAds();
    
    // Check local storage for initial compliance acceptance
    const hasSeenCompliance = localStorage.getItem('grantify_compliance_seen');
    if (!hasSeenCompliance) {
      setShowCompliance(true);
    }

    // Adblock Detection - run after a delay to ensure page is loaded
    const detectAdBlock = () => {
      const bait = document.createElement('div');
      // Using 'adsbox' is a common class targeted by EasyList
      bait.className = 'adsbox ad-banner-container'; 
      bait.style.position = 'absolute';
      bait.style.top = '-1000px';
      bait.style.left = '-1000px';
      bait.style.width = '1px';
      bait.style.height = '1px';
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);

      setTimeout(() => {
        try {
          const style = window.getComputedStyle(bait);
          if (
            bait.offsetHeight === 0 || 
            style.display === 'none' || 
            style.visibility === 'hidden'
          ) {
             setBlockerDetected(true);
             setShowCompliance(true);
          }
          document.body.removeChild(bait);
        } catch (error) {
          console.error('Ad blocker detection error:', error);
        }
      }, 1000);
    };

    // Delay ad blocker detection slightly
    setTimeout(detectAdBlock, 500);
  }, []);

  // Inject scripts into document head (for AdSense, GTM, etc.)
  const injectHeadScripts = (headContent: string) => {
    if (!headContent || !headContent.trim()) return;

    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = headContent;

    // Check if scripts are already injected (by data attribute)
    const existingMarker = document.head.querySelector('[data-grantify-ads]');
    if (existingMarker) {
      console.log('Head scripts already injected, skipping...');
      return; // Already injected
    }

    // Add a marker to prevent duplicate injection
    const marker = document.createElement('meta');
    marker.setAttribute('data-grantify-ads', 'true');
    document.head.appendChild(marker);

    console.log('Injecting head scripts...');

    // Process all direct children of temp container
    Array.from(temp.children).forEach((el, index) => {
      if (el.tagName === 'SCRIPT') {
        // Scripts need to be recreated to execute
        const newScript = document.createElement('script');
        
        // Copy all attributes
        Array.from(el.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy inline script content
        if (el.innerHTML) {
          newScript.innerHTML = el.innerHTML;
        }
        
        // Add error handling for external scripts
        if (el.getAttribute('src')) {
          const scriptSrc = el.getAttribute('src');
          newScript.onerror = (error) => {
            console.error(`Failed to load head script: ${scriptSrc}`, error);
          };
          newScript.onload = () => {
            console.log(`Successfully loaded head script: ${scriptSrc}`);
          };
        }
        
        document.head.appendChild(newScript);
        console.log(`Injected head script #${index + 1}`);
      } else if (el.tagName === 'META' || el.tagName === 'LINK' || el.tagName === 'STYLE') {
        // Other elements (meta, link, style, etc.) can be cloned directly
        document.head.appendChild(el.cloneNode(true));
        console.log(`Injected ${el.tagName.toLowerCase()} element`);
      }
    });
  };

  const handleDismissCompliance = () => {
    if (blockerDetected) {
      const confirm = window.confirm("If you are using an adblocker, the loan application form may fail to submit. Are you sure you want to proceed?");
      if (!confirm) return;
    }
    localStorage.setItem('grantify_compliance_seen', 'true');
    setShowCompliance(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/repayment", label: "Repayment Plan" },
    { to: "/loan-providers", label: "Loan Providers" },
    { to: "/contact", label: "Contact Us" },
    { to: "/admin", label: "Admin Login" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      
      {/* Compliance Warning Modal */}
      {showCompliance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-8 border-red-600 animate-in fade-in zoom-in duration-300 my-8">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <ShieldAlert size={32} />
              <h2 className="text-xl font-bold font-heading">
                {blockerDetected ? "Action Required" : "Important Requirement"}
              </h2>
            </div>
            
            <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
              <p>
                To ensure your loan application is <strong>processed successfully</strong>, please adhere to the following:
              </p>
              
              {blockerDetected && (
                <div className="bg-red-50 p-3 rounded border border-red-200 text-red-700 text-xs font-bold mb-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <p>We detected an Adblocker. Please disable it to ensure the form works correctly.</p>
                  </div>
                </div>
              )}

              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className={`font-bold ${blockerDetected ? 'text-red-600' : 'text-gray-900'}`}>Disable Adblockers:</span> Our platform relies on sponsor transparency.
                </li>
                <li>
                  <span className="font-bold text-gray-900">No VPNs/Proxy:</span> We strictly verify location.
                </li>
                <li>
                  <span className="font-bold text-gray-900">Recommended Browser:</span> <span className="text-blue-600 font-bold">Google Chrome</span>.
                </li>
              </ul>

              {/* Guide Toggle */}
              {blockerDetected && (
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700"
                  >
                    <span>How to unblock this site?</span>
                    <HelpCircle size={14} />
                  </button>
                  {showGuide && (
                    <div className="p-3 bg-white text-xs text-gray-600 space-y-2 border-t">
                      <p className="font-bold">Google Chrome:</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Click the lock icon 🔒 or the extension icon 🧩 in the address bar.</li>
                        <li>Find your Adblocker extension.</li>
                        <li>Select <strong>"Pause on this site"</strong> or <strong>"Don't run on pages on this domain"</strong>.</li>
                        <li>Refresh the page.</li>
                      </ol>
                      <p className="font-bold mt-2">Opera / Brave:</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Click the shield icon in the address bar.</li>
                        <li>Toggle the switch to <strong>OFF</strong> for this site.</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {blockerDetected ? (
                <button 
                  onClick={handleReload}
                  className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} /> Refresh Page
                </button>
              ) : (
                <button 
                  onClick={handleDismissCompliance}
                  className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-lg"
                >
                  I Understand & Agree
                </button>
              )}

              {blockerDetected && (
                <button 
                  onClick={handleDismissCompliance}
                  className="w-full text-gray-400 text-xs hover:text-gray-600 underline text-center"
                >
                  I am not using an adblocker (Continue anyway)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Ad */}
      {ads && <AdSlot htmlContent={ads.header} className="bg-gray-100" label="Sponsor" />}

      {/* Navbar */}
      <header className="bg-grantify-green text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold font-heading text-grantify-gold">
            <Banknote className="w-8 h-8" />
            <span>Grantify</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className={`hover:text-grantify-gold transition-colors font-medium ${location.pathname === link.to ? 'text-grantify-gold border-b-2 border-grantify-gold' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <nav className="md:hidden bg-green-800 p-4 flex flex-col gap-4">
             {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className="block text-white py-2 px-4 hover:bg-green-700 rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        <div className="flex-grow w-full">
            {children}
        </div>
        
        {/* Sidebar Ad (Only on larger screens for layout logic) */}
        {ads && ads.sidebar && (
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
             <div className="sticky top-24">
                <AdSlot htmlContent={ads.sidebar} />
             </div>
          </aside>
        )}
      </main>

      {/* Footer Ad */}
      {ads && <AdSlot htmlContent={ads.footer} className="bg-gray-900" label="Sponsor" />}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
             <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-700/50">
               <AlertTriangle size={12} />
               <span>For best results, disable Adblockers and avoid VPNs.</span>
             </div>
          </div>
          <p className="mb-4 text-sm">
            &copy; {new Date().getFullYear()} Grantify Nigeria. Empowering communities.
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};