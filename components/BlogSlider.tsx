import React from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '../types';
import { BookOpen, ChevronRight, Share2 } from 'lucide-react';

interface Props {
  posts: BlogPost[];
}

export const BlogSlider: React.FC<Props> = ({ posts }) => {
  if (posts.length === 0) return null;

  return (
    <section className="py-12 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black font-heading text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-2 h-6 bg-grantify-gold rounded-full"></span>
            Recommended Reading
          </h2>
          <p className="text-gray-500 text-sm">Intelligence to help you scale your business</p>
        </div>
        <Link 
          to="/blog" 
          className="text-xs font-black uppercase text-grantify-green tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
        >
          Explore All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="relative group">
        <div className="flex overflow-x-auto gap-6 px-4 pb-8 md:px-[calc((100vw-72rem)/2+1rem)] no-scrollbar snap-x snap-mandatory">
          {posts.map((post) => (
            <div 
              key={post.id} 
              className="flex-shrink-0 w-[280px] md:w-[320px] snap-start"
            >
              <Link 
                to={`/blog/${post.id}`}
                className="block h-full bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500 group/card hover:-translate-y-2"
              >
                <div className="h-40 relative overflow-hidden">
                  {post.image ? (
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-900/10 to-grantify-green/20 flex items-center justify-center p-6 text-grantify-green font-bold text-center text-xs">
                      {post.title}
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-grantify-green text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                      {post.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-bold text-gray-800 line-clamp-2 min-h-[3rem] mb-4 group-hover/card:text-grantify-green transition-colors">
                    {post.title}
                  </h3>
                  
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-grantify-green flex items-center justify-center text-[10px] text-white font-bold">
                        {post.author.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <span className="flex items-center gap-1 text-[10px] font-bold"><BookOpen size={10} /> {post.likes}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
          
          {/* Last card to encourage viewing all */}
          <div className="flex-shrink-0 w-[140px] md:w-[180px] snap-start py-4">
            <Link 
              to="/blog"
              className="h-full bg-grantify-green/5 border border-dashed border-grantify-green/30 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-grantify-green hover:bg-grantify-green/10 transition-all group/all"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md group-hover/all:scale-110 transition-transform">
                <ChevronRight />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">View All</span>
            </Link>
          </div>
        </div>
        
        {/* Custom scroll indicators or arrows could go here, but native scroll is best for mobile */}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
};
