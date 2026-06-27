import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdSlot } from './AdSlot';
import { ApiService } from '../services/storage';
import { AdConfig, BlogPost, LoanProvider, WhatsappConfig } from '../types';
import { makeBlogPath } from '../utils/blogRouting';
import { Menu, X, AlertTriangle, ShieldAlert, RefreshCw, HelpCircle, Moon, Sun, Search, MessageCircle, Trophy } from 'lucide-react';
import { AiChatbot } from './AiChatbot';

type HeaderSearchResult =
  | { type: 'blog'; key: string; title: string; subtitle?: string; to: string }
  | { type: 'loan'; key: string; title: string; subtitle?: string; to: string }
  ;

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [blockerDetected, setBlockerDetected] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [blogIndex, setBlogIndex] = useState<BlogPost[]>([]);
  const [loanIndex, setLoanIndex] = useState<LoanProvider[]>([]);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('grantify_theme');
      const isDark = document.documentElement.classList.contains('dark') || stored === 'dark';
      setIsDarkMode(isDark);
    } catch {
      // no-op
    }

    const loadAds = async () => {
      try {
        const adData = await ApiService.getAds();
        setAds(adData);
        
        if (adData?.head) {
          injectHeadScripts(adData.head);
        }
      } catch (error) {
        console.error('Error loading ads:', error);
      }
    };
    
    loadAds();

    const loadWhatsappConfig = async () => {
      try {
        const config = await ApiService.getWhatsappConfig();
        setWhatsappConfig(config);
      } catch (error) {
        console.error('Error loading WhatsApp config:', error);
      }
    };
    
    loadWhatsappConfig();
    
    // Modal only shows if adblocker/VPN detected (not on every page load)
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

  useEffect(() => {
    // Close menus/dropdowns on navigation.
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!isSearchOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (searchBoxRef.current && searchBoxRef.current.contains(target)) return;
      setIsSearchOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isSearchOpen]);

  const ensureSearchIndex = async () => {
    if (blogIndex.length && loanIndex.length) return;
    if (isSearchLoading) return;
    setIsSearchLoading(true);
    try {
      const [posts, providers] = await Promise.all([
        ApiService.getBlogPosts().catch(() => [] as BlogPost[]),
        ApiService.getLoanProviders().catch(() => [] as LoanProvider[])
      ]);
      setBlogIndex(Array.isArray(posts) ? posts : []);
      setLoanIndex(Array.isArray(providers) ? providers : []);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const normalize = (s: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/&nbsp;|\u00A0/g, ' ')
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const searchResults: HeaderSearchResult[] = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return [];

    const out: HeaderSearchResult[] = [];

    for (const post of blogIndex) {
      const title = String(post?.title || '').trim();
      const category = String(post?.category || '').trim();
      const author = String(post?.author || '').trim();
      const hay = normalize(`${title} ${category} ${author} ${String(post?.content || '')}`);
      if (!hay.includes(q)) continue;
      const to = makeBlogPath({ id: String(post.id), title });
      out.push({
        type: 'blog',
        key: `blog_${post.id}`,
        title: title || 'Untitled post',
        subtitle: category || 'Community Blog',
        to
      });
      if (out.length >= 8) break;
    }

    if (out.length < 8) {
      for (const provider of loanIndex) {
        const name = String(provider?.name || '').trim();
        const tag = String(provider?.tag || '').trim();
        const website = String(provider?.website || '').trim();
        const hay = normalize(`${name} ${tag} ${website} ${String(provider?.description || '')}`);
        if (!hay.includes(q)) continue;
        out.push({
          type: 'loan',
          key: `loan_${name}`,
          title: name || 'Loan provider',
          subtitle: tag || 'Loan Providers & Reviews',
          to: '/loan-providers'
        });
        if (out.length >= 10) break;
      }
    }

    return out.slice(0, 12);
  }, [searchQuery, blogIndex, loanIndex]);

  const setTheme = (theme: 'light' | 'dark') => {
    const shouldBeDark = theme === 'dark';
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
    try {
      localStorage.setItem('grantify_theme', theme);
    } catch {
      // no-op
    }
  };

  // Inject scripts into document head (for AdSense, GTM, etc.)
  const injectHeadScripts = (headContent: string) => {
    if (!headContent || !headContent.trim()) return;

    // Check if scripts are already injected and if content has changed
    const existingScripts = document.head.querySelectorAll('[data-grantify-injected]');
    // Stable lightweight hash (avoid heavy crypto; good enough for change detection)
    const currentHash = (() => {
      let hash = 0;
      for (let i = 0; i < headContent.length; i++) {
        hash = (hash * 31 + headContent.charCodeAt(i)) >>> 0;
      }
      return String(hash);
    })();
    
    const existingHashMarker = document.head.querySelector('[data-grantify-ads-hash]');
    if (existingHashMarker && existingHashMarker.getAttribute('content') === currentHash) {
      return; // No change, skip
    }

    // Remove previously injected elements if they exist
    existingScripts.forEach(el => el.remove());
    if (existingHashMarker) existingHashMarker.remove();

    // Add a marker for the current hash
    const hashMarker = document.createElement('meta');
    hashMarker.setAttribute('name', 'grantify-ads-hash');
    hashMarker.setAttribute('data-grantify-ads-hash', 'true');
    hashMarker.setAttribute('content', currentHash);
    document.head.appendChild(hashMarker);

    console.log('Injecting/Updating head scripts...');

    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = headContent;

    // Process all children
    Array.from(temp.childNodes).forEach((node) => {
      let el: HTMLElement | null = null;
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.tagName === 'SCRIPT') {
          const newScript = document.createElement('script');
          Array.from(element.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          if (element.innerHTML) newScript.innerHTML = element.innerHTML;
          el = newScript;
        } else {
          el = element.cloneNode(true) as HTMLElement;
        }
      }

      if (el) {
        el.setAttribute('data-grantify-injected', 'true');
        document.head.appendChild(el);
      }
    });
  };

  const handleReload = () => {
    window.location.reload();
  };

  const navLinks = [
    { to: "/", label: "Home", shortLabel: "Home" },
    { to: "/blog", label: "Blog Intel", shortLabel: "Blog" },
    { to: "/quiz", label: "Eligibility Quiz", shortLabel: "Quiz" },
    { to: "/pitch", label: "Pitch Competition", shortLabel: "Pitch" },
    { to: "/sponsor", label: "Sponsor", shortLabel: "Sponsor" },
    { to: "/loan-providers", label: "Instant Loans", shortLabel: "Loans" },
    { to: "/contact", label: "Contact Us", shortLabel: "Contact" },
    { to: "/admin", label: "Admin Login", shortLabel: "Admin" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 relative">
      
      {/* Floating Promo Button 1 (Admin Configurable) */}
      {ads?.promo1Link && (
        <a 
          href={ads.promo1Link}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-6 z-50 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-bounce flex items-center gap-2"
        >
          <span>🔥</span>
          <span>{ads.promo1Text || 'Offer'}</span>
        </a>
      )}

      {/* Floating Promo Button 2 (Admin Configurable) */}
      {ads?.promo2Link && (
        <a 
          href={ads.promo2Link}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse flex items-center gap-2"
        >
          <span>🎁</span>
          <span>{ads.promo2Text || 'Bonus'}</span>
        </a>
      )}

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
                <div className="space-y-3">
                  <p className="text-gray-500 italic">Please consider disabling adblockers to support our free service.</p>
                  <button 
                    onClick={() => setShowCompliance(false)}
                    className="w-full bg-grantify-green text-white font-bold py-3 rounded-lg hover:bg-green-800 transition shadow-lg"
                  >
                    Continue to Site
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowCompliance(false)}
                  className="w-full bg-grantify-green text-white font-bold py-3 rounded-lg hover:bg-green-800 transition shadow-lg"
                >
                  I Understand & Agree
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Header Ad Slot - REMOVED for cleaner site header */}

      {/* Navbar */}
      <header className="relative bg-gradient-to-r from-green-950 via-grantify-green to-green-900 text-white shadow-lg sticky top-0 z-[60] transition-all duration-300 overflow-hidden">
        {/* Wavy Background SVG */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-10 dark:opacity-5">
          <svg className="w-full h-[200%] -top-1/2 left-0" viewBox="0 0 1440 240" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,96C240,140 480,140 720,96C960,52 1200,52 1440,96L1440,240L0,240Z" fill="url(#wave-grad-1)"/>
            <path d="M0,140C300,90 600,180 900,130C1200,80 1350,110 1440,120L1440,240L0,240Z" fill="url(#wave-grad-2)"/>
            <defs>
              <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#006400" />
              </linearGradient>
              <linearGradient id="wave-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#006400" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* Additional wavy design path at the bottom of the header */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 pointer-events-none z-10 overflow-hidden">
          <svg className="absolute bottom-0 w-full h-[15px]" viewBox="0 0 1440 15" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,7 C360,15 720,0 1080,7 L1440,0 L1440,15 L0,15 Z" fill="currentColor" className="text-gray-50 dark:text-gray-950 transition-colors duration-300" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-1.5 text-lg lg:text-xl xl:text-2xl font-black font-heading text-grantify-gold shrink-0">
            <img
              src="/logo.svg"
              alt="Grantify"
              className="w-6 h-6 lg:w-7 lg:h-7"
              loading="eager"
              decoding="async"
            />
            <span className="font-outfit tracking-tight">Grantify</span>
          </Link>

          {/* Desktop Search + Nav */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <div ref={searchBoxRef} className="relative">
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition rounded-full px-3 py-2">
                <Search size={16} className="text-white/80" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => {
                    setIsSearchOpen(true);
                    void ensureSearchIndex();
                  }}
                  placeholder="Search blog, loans, grants…"
                  className="w-[100px] lg:w-[150px] xl:w-[220px] bg-transparent outline-none text-xs placeholder:text-white/70 animate-all"
                  aria-label="Search"
                />
                {Boolean(searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-white/10"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-[440px] max-w-[calc(100vw-24px)] bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span>Search</span>
                    {isSearchLoading && <span>Loading…</span>}
                  </div>

                  {!searchQuery.trim() ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      Type to search the Community Blog, Loan Providers, and Grant Partners.
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      No results found.
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto">
                      {searchResults.map((r) => (
                        <div key={r.key} className="border-b border-gray-50 dark:border-gray-900 last:border-b-0">
                          <Link
                            to={r.to}
                            className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
                            onClick={() => setIsSearchOpen(false)}
                          >
                            <div className="text-sm font-black text-grantify-green">{r.title}</div>
                            {r.subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">{r.subtitle}</div>}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <nav className="flex gap-1.5 lg:gap-3 xl:gap-4 items-center text-xs lg:text-sm font-outfit uppercase tracking-wider">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className={`hover:text-grantify-gold transition-colors font-bold px-1.5 py-1 rounded-sm ${location.pathname === link.to ? 'text-grantify-gold border-b-2 border-grantify-gold' : ''}`}
              >
                <span className="lg:hidden">{link.shortLabel}</span>
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition text-[10px] lg:text-xs font-bold"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              <span className="hidden xl:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
            </nav>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((v) => !v);
                void ensureSearchIndex();
              }}
              className="text-white p-2 rounded-full hover:bg-white/10 transition"
              aria-label={isSearchOpen ? 'Close search' : 'Open search'}
              title="Search"
            >
              <Search size={18} />
            </button>
            <button
              type="button"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="text-white p-2 rounded-full hover:bg-white/10 transition"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
              className="text-white p-1"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Search Panel */}
        {isSearchOpen && (
          <div className="md:hidden px-3 sm:px-4 pb-4" ref={searchBoxRef}>
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-white/80" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blog, loans, grants…"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-white/70"
                  aria-label="Search"
                  autoFocus
                />
                {Boolean(searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full hover:bg-white/10"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="mt-3 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {isSearchLoading ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400 font-bold">Loading…</div>
                ) : !searchQuery.trim() ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Type to search the Community Blog, Loan Providers, and Grant Partners.</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No results found.</div>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto">
                        {searchResults.map((r) => (
                          <div key={r.key} className="border-b border-gray-50 dark:border-gray-900 last:border-b-0">
                            <Link
                              to={r.to}
                              className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <div className="text-sm font-black text-grantify-green">{r.title}</div>
                              {r.subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">{r.subtitle}</div>}
                            </Link>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <nav className="md:hidden bg-green-800 dark:bg-gray-900 p-4 flex flex-col gap-4">
             {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className="block text-white py-2 px-4 hover:bg-green-700 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileMenuOpen(false);
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="w-full">
            {children}
        </div>
      </main>

      {/* Body Ad */}
      {ads?.body && (
        <div className="my-12 flex justify-center">
          <AdSlot htmlContent={ads.body} label="Sponsor" />
        </div>
      )}


      {/* Footer Ad */}
      {ads?.footer && <AdSlot htmlContent={ads.footer} className="bg-gray-900 py-4" label="Sponsor" />}

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-900">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-left">
            {/* Column 1: About */}
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold font-heading text-grantify-gold">
                <img src="/logo.svg" alt="Grantify" className="w-6 h-6" />
                <span className="font-outfit tracking-tight">Grantify</span>
              </Link>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                Empowering entrepreneurs, families, and businesses across Nigeria with smart grant matches, funding alerts, and financial intelligence.
              </p>
              <div className="flex items-start gap-2 text-yellow-500 text-[11px] bg-yellow-900/10 p-2.5 rounded-lg border border-yellow-700/20 max-w-xs">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>For best results, disable Adblockers and avoid VPNs when applying.</span>
              </div>
            </div>

            {/* Column 2: Platform */}
            <div>
              <h3 className="text-xs font-bold text-gray-200 mb-4 uppercase tracking-widest font-outfit">Platform</h3>
              <ul className="space-y-2.5 text-sm font-medium">
                <li><Link to="/" className="hover:text-grantify-gold transition-colors block">Home</Link></li>
                <li><Link to="/blog" className="hover:text-grantify-gold transition-colors block">Blog Intel</Link></li>
                <li><Link to="/contact" className="hover:text-grantify-gold transition-colors block">Contact Us</Link></li>
                <li><Link to="/sponsor" className="hover:text-grantify-gold transition-colors block">Sponsorships</Link></li>
              </ul>
            </div>

            {/* Column 3: Services */}
            <div>
              <h3 className="text-xs font-bold text-gray-200 mb-4 uppercase tracking-widest font-outfit">Services</h3>
              <ul className="space-y-2.5 text-sm font-medium">
                <li><Link to="/quiz" className="hover:text-grantify-gold transition-colors block">Eligibility Quiz</Link></li>
                <li><Link to="/pitch" className="hover:text-grantify-gold transition-colors block">Pitch Competition</Link></li>
                <li><Link to="/loan-providers" className="hover:text-grantify-gold transition-colors block">Instant Loans</Link></li>
              </ul>
            </div>

            {/* Column 4: Legal & Admin */}
            <div>
              <h3 className="text-xs font-bold text-gray-200 mb-4 uppercase tracking-widest font-outfit">Legal</h3>
              <ul className="space-y-2.5 text-sm font-medium">
                <li><Link to="/privacy" className="hover:text-grantify-gold transition-colors block">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-grantify-gold transition-colors block">Terms & Conditions</Link></li>
                <li><Link to="/admin" className="hover:text-grantify-gold transition-colors block font-bold text-grantify-gold/80 hover:text-grantify-gold">Admin Dashboard</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-900 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500 text-center sm:text-left">
              &copy; {new Date().getFullYear()} Grantify Nigeria. Empowering families and businesses nationwide.
            </p>
            <p className="text-xs text-gray-650 text-center sm:text-right">
              Empowering Nigerian SME Growth
            </p>
          </div>
        </div>
      </footer>

      {/* AI Chat Assistant */}
      <AiChatbot />

      {/* WhatsApp Floating Button */}
      {whatsappConfig && whatsappConfig.isEnabled && (
        <a
          href={whatsappConfig.phoneNumber
            ? `https://wa.me/${whatsappConfig.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappConfig.preFilledText)}`
            : `https://wa.me/?text=${encodeURIComponent(whatsappConfig.preFilledText)}`
          }
          target="_blank"
          rel="noopener noreferrer"
          title="Chat on WhatsApp"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-24 left-4 z-50 flex items-center gap-2 bg-[#25D366] text-white font-black text-xs px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true">
            <path d="M12.004 2c-5.523 0-10 4.477-10 10 0 1.762.455 3.42 1.257 4.87L2 22l5.3-.98A9.972 9.972 0 0012.004 22c5.523 0 10-4.477 10-10s-4.477-10-10-10z" fill="#ffffff" />
            <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.762.455 3.42 1.257 4.87L2 22l5.3-.98A9.972 9.972 0 0012.004 22c5.523 0 10-4.477 10-10S17.527 2 12.004 2zm0 18.004c-1.63 0-3.153-.416-4.49-1.144l-.322-.172-3.14.58.59-3.06-.188-.302c-.792-1.3-1.24-2.83-1.24-4.46a8.006 8.006 0 018.004-8.004c4.413 0 8.004 3.591 8.004 8.004s-3.591 8.004-8.004 8.004z" fill="#25D366" />
            <text x="12" y="15.5" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="10" text-anchor="middle" fill="#25D366">B</text>
          </svg>
          <span className="hidden sm:inline group-hover:inline transition-all">{whatsappConfig.buttonLabel || 'Get Grant Alerts'}</span>
        </a>
      )}
    </div>
  );
};