import React, { useEffect, useState } from 'react';
import { BlogPost } from '../types';
import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';

interface Props {
  posts: BlogPost[];
}

export const BlogTicker: React.FC<Props> = ({ posts }) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReducedMotion(Boolean(mq.matches));
      update();
      mq.addEventListener?.('change', update);
      return () => mq.removeEventListener?.('change', update);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;
    const items = (posts || []).filter(p => p && p.title).slice(0, 12);
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % items.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [posts, reducedMotion]);

  const items = (posts || []).filter(p => p && p.title).slice(0, 12);
  if (items.length === 0) return null;

  return (
    <div className="bg-grantify-gold text-grantify-green py-2 px-4 flex items-center justify-center gap-4 overflow-hidden relative border-b border-yellow-500/20">
      <div className="flex items-center gap-2 text-grantify-green text-[10px] font-black uppercase tracking-widest whitespace-nowrap animate-pulse">
        <Megaphone size={12} /> Latest News
      </div>

      <div className="h-6 flex items-center overflow-hidden flex-grow justify-center md:justify-start">
        {reducedMotion ? (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Link
              to={`/blog/${items[carouselIndex]?.id || items[0].id}`}
              className="flex items-center gap-2 hover:underline transition-colors whitespace-nowrap"
            >
              <span className="text-xs font-bold truncate max-w-[240px] md:max-w-none">{(items[carouselIndex]?.title || items[0].title)}</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-green-900 font-mono hidden md:inline-block">
                {new Date((items[carouselIndex]?.createdAt || items[0].createdAt)).toLocaleDateString()}
              </span>
            </Link>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <div
              className="ticker-marquee flex items-center gap-10 w-max whitespace-nowrap"
              style={{ animation: 'ticker-marquee 18s linear infinite' }}
            >
              {[...items, ...items].map((post, idx) => (
                <Link
                  key={`${post.id}_${idx}`}
                  to={`/blog/${post.id}`}
                  className="flex items-center gap-2 hover:underline transition-colors"
                >
                  <span className="text-xs font-bold">{post.title}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-green-900 font-mono hidden md:inline-block">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex ml-auto items-center gap-4 opacity-70 text-[10px] font-bold uppercase tracking-wider">
        <Link to="/blog" className="hover:text-white transition-colors">Read All Updates</Link>
      </div>
    </div>
  );
};
