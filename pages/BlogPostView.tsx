import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { BlogPost, BlogComment, AdConfig } from '../types';
import { Loader2, ThumbsUp, MessageSquare, ArrowLeft, Send, Calendar, User, Shield, Share2 } from 'lucide-react';
import { AdSlot } from '../components/AdSlot';
import { FacebookShareButton, TwitterShareButton, WhatsappShareButton, LinkedinShareButton, FacebookIcon, TwitterIcon, WhatsappIcon, LinkedinIcon } from 'react-share';

export const BlogPostView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost & { comments: BlogComment[] } | null>(null);
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentForm, setCommentForm] = useState({ name: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const data = await ApiService.getBlogPost(id!);
      setPost(data);
      
      // Fetch recommended posts (excluding current one)
      const allPosts = await ApiService.getBlogPosts();
      setRecommendedPosts(allPosts.filter(p => p.id !== id).slice(0, 3));

      // Fetch ads
      const adData = await ApiService.getAds();
      setAds(adData);
    } catch (e) {
      console.error(e);
      navigate('/blog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      await ApiService.submitBlogAction({ action: 'like', postId: post.id });
      setPost({ ...post, likes: post.likes + 1 });
    } catch (e) {
      alert('Failed to like post');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!post) return;
    try {
      await ApiService.submitBlogAction({ action: 'likeComment', commentId });
      setPost({
        ...post,
        comments: post.comments.map(c => c.id === commentId ? { ...c, likes: c.likes + 1 } : c)
      });
    } catch (e) {
      alert('Failed to like comment');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentForm.name || !commentForm.content) return;
    
    setIsSubmitting(true);
    try {
      await ApiService.submitBlogAction({
        action: 'comment',
        postId: id,
        name: commentForm.name,
        content: commentForm.content
      });
      setCommentForm({ name: '', content: '' });
      await fetchPost(); // Refresh
    } catch (e) {
      alert('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !post) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p>Reading the article...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-grantify-green mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Hub
      </Link>

      <article className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-12">
        {post.image && (
          <img src={post.image} alt={post.title} className="w-full h-80 object-cover" />
        )}
        
        <div className="p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-4 text-gray-400 text-xs mb-6 uppercase tracking-widest font-bold">
            <span className="bg-grantify-gold/20 text-grantify-green px-2 py-1 rounded">{post.category}</span>
            <div className="flex items-center gap-1"><Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString()}</div>
            <div className="flex items-center gap-1"><User size={14} /> By {post.author}</div>
            <div className="flex items-center gap-1"><Shield size={14} className="text-blue-500" /> {post.authorRole}</div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black font-heading text-gray-900 mb-8 leading-tight">
            {post.title}
          </h1>


          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed quill-content">
            {ads?.body ? (
              (() => {
                // Since content is now HTML from ReactQuill
                // We'll try to split by the first paragraph ending
                const content = post.content;
                const splitIndex = content.indexOf('</p>');
                
                if (splitIndex !== -1) {
                  const firstPart = content.substring(0, splitIndex + 4);
                  const secondPart = content.substring(splitIndex + 4);
                  
                  return (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: firstPart }} />
                      <div className="my-10 flex justify-center">
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-inner max-w-full overflow-hidden w-full">
                           <span className="text-[10px] text-gray-400 uppercase block mb-2 text-center tracking-widest">Sponsored Information</span>
                           <AdSlot htmlContent={ads.body} label="" />
                        </div>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: secondPart }} />
                    </>
                  );
                }
                
                return <div dangerouslySetInnerHTML={{ __html: content }} />;
              })()
            ) : (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 border-y border-gray-100 py-6">
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Share2 size={16} /> Share:</span>
                <FacebookShareButton url={window.location.href} className="hover:opacity-80 transition-opacity"><FacebookIcon size={32} round /></FacebookShareButton>
                <TwitterShareButton url={window.location.href} title={post.title} className="hover:opacity-80 transition-opacity"><TwitterIcon size={32} round /></TwitterShareButton>
                <WhatsappShareButton url={window.location.href} title={post.title} separator=" - " className="hover:opacity-80 transition-opacity"><WhatsappIcon size={32} round /></WhatsappShareButton>
                <LinkedinShareButton url={window.location.href} title={post.title} summary={post.content.substring(0, 100)} source="Grantify" className="hover:opacity-80 transition-opacity"><LinkedinIcon size={32} round /></LinkedinShareButton>
             </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-50 flex items-center justify-between">
            <button 
              onClick={handleLike}
              className="flex items-center gap-2 bg-gray-50 hover:bg-red-50 hover:text-red-500 px-6 py-3 rounded-full transition-all group font-bold"
            >
              <ThumbsUp size={20} className="group-hover:scale-110 transition-transform" />
              {post.likes} Likes
            </button>
            <div className="flex items-center gap-2 text-gray-400 font-bold">
              <MessageSquare size={20} />
              {post.comments.length} Comments
            </div>
          </div>
        </div>
      </article>

      {/* Recommended Posts */}
      {recommendedPosts.length > 0 && (
        <section className="mb-16">
          <h3 className="text-2xl font-black font-heading text-gray-900 mb-6">You Might Also Like</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {recommendedPosts.map(rec => (
              <Link key={rec.id} to={`/blog/${rec.id}`} className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="h-32 bg-gray-100 relative">
                  {rec.image ? (
                    <img src={rec.image} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-grantify-green to-blue-900 text-white p-4 text-center text-xs font-bold">
                       {rec.title}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-[10px] bg-grantify-gold/20 text-grantify-green px-2 py-0.5 rounded font-bold uppercase mb-2 inline-block">
                    {rec.category}
                  </span>
                  <h4 className="font-bold text-gray-800 leading-tight group-hover:text-grantify-green transition-colors line-clamp-2">
                    {rec.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Engagement Section */}
      <section className="space-y-8">
        <h3 className="text-2xl font-black font-heading text-gray-900">Community Discussion</h3>
        
        {/* Comment Form */}
        <div className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Your Name"
              className="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-grantify-green bg-white shadow-inner outline-none"
              value={commentForm.name}
              onChange={e => setCommentForm({...commentForm, name: e.target.value})}
              required
            />
            <textarea 
              rows={4}
              placeholder="Share your thoughts or ask a question..."
              className="w-full p-4 rounded-xl border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-grantify-green bg-white shadow-inner outline-none"
              value={commentForm.content}
              onChange={e => setCommentForm({...commentForm, content: e.target.value})}
              required
            />
            <button 
              disabled={isSubmitting}
              className="bg-grantify-green text-white font-black py-4 px-8 rounded-xl shadow-lg hover:shadow-2xl hover:bg-green-700 transition-all flex items-center gap-2 ml-auto"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              Post Comment
            </button>
          </form>
        </div>

        {/* Comments List */}
        <div className="space-y-6">
          {post.comments.length === 0 ? (
            <p className="text-center text-gray-400 italic py-8">Be the first to share your thoughts!</p>
          ) : (
            post.comments.map(comment => (
              <div key={comment.id} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-grantify-green text-white flex items-center justify-center text-xs">
                      {comment.name[0]}
                    </div>
                    {comment.name}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    {new Date(comment.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(comment.createdAt!).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{comment.content}</p>
                <div className="flex items-center gap-4 pt-2">
                  <button 
                    onClick={() => handleLikeComment(comment.id)}
                    className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <ThumbsUp size={14} />
                    <span className="text-xs font-bold">{comment.likes}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
