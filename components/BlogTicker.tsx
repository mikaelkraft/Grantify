import React, { useEffect, useState } from 'react';
import { BlogPost } from '../types';
import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';

interface Props {
  posts: BlogPost[];
}

export const BlogTicker: React.FC<Props> = ({ posts }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (posts.length === 0) return;
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % posts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [posts.length]);

  if (posts.length === 0) return null;

  const current = posts[offset];

  return (
    <div className="bg-grantify-gold text-grantify-green py-2 px-4 flex items-center justify-center gap-4 overflow-hidden relative border-b border-yellow-500/20">
      <div className="flex items-center gap-2 text-grantify-green text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
        <Megaphone size={12} /> Latest News
      </div>
      
      <div className="h-6 flex items-center overflow-hidden flex-grow justify-center md:justify-start">
        <div key={offset} className="animate-slide-up">
          <Link 
            to={`/blog/${current.id}`}
            className="flex items-center gap-2 hover:underline transition-all duration-500 ease-in-out whitespace-nowrap"
          >
            <span className="text-xs font-bold truncate max-w-[200px] md:max-w-none">{current.title}</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-green-900 font-mono hidden md:inline-block">
              {new Date(current.createdAt).toLocaleDateString()}
            </span>
          </Link>
        </div>
      </div>

      <div className="hidden md:flex ml-auto items-center gap-4 opacity-70 text-[10px] font-bold uppercase tracking-wider">
        <Link to="/blog" className="hover:text-white transition-colors">Read All Updates</Link>
      </div>
    </div>
  );
};
