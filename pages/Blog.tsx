import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { BlogPost } from '../types';
import { Loader2, MessageSquare, ThumbsUp, Calendar, ChevronRight, Eye } from 'lucide-react';
import { getBlogPlaceholderImage } from '../utils/blogPlaceholder';

export const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await ApiService.getBlogPosts();
        setPosts(data);
      } catch (e) {
        setError('Failed to load blog posts.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p>Loading the latest updates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-3 sm:px-4 md:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black font-heading text-gray-900 dark:text-gray-100 mb-4">Financial Intelligence Hub</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Expert insights on Nigerian grants, business strategies, and financial management to help you grow.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No blog posts available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            (() => {
              const previewText = post.content
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              return (
            <Link 
              key={post.id} 
              to={`/blog/${post.id}`}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="aspect-video bg-gray-100 dark:bg-gray-950 overflow-hidden relative">
                <img
                  src={post.image || getBlogPlaceholderImage(post.title)}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 bg-grantify-gold text-grantify-green text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                  {post.category}
                </div>
              </div>
              
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-3 uppercase tracking-widest font-bold">
                  <Calendar size={12} />
                  {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 group-hover:text-grantify-green transition-colors leading-tight">
                  {post.title}
                </h3>
                
                <p className="text-sm text-gray-500 dark:text-gray-300 line-clamp-3 mb-6 flex-grow">
                  {previewText}
                </p>
                
                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-4 text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-1">
                      <ThumbsUp size={14} />
                      <span className="text-xs">{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      <span className="text-xs">{post.commentsCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      <span className="text-xs">{Number(post.views || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-grantify-green font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read More <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
};
