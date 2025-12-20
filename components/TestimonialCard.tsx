import React, { useState, useEffect } from 'react';
import { Testimonial } from '../types';
import { ApiService } from '../services/storage';
import { ThumbsUp, Heart, Hand } from 'lucide-react';

interface Props {
  data: Testimonial;
}

type ReactionType = 'likes' | 'loves' | 'claps';

// Default fallback avatar for broken/missing images
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22%23006400%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2255%22%20font-size%3D%2240%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E';

export const TestimonialCard: React.FC<Props> = ({ data }) => {
  const [counts, setCounts] = useState({
    likes: data.likes,
    loves: data.loves,
    claps: data.claps
  });

  const [currentVote, setCurrentVote] = useState<ReactionType | null>(null);
  const [imageError, setImageError] = useState(false);

  // Check local storage for previous votes by this user
  useEffect(() => {
    const savedVote = localStorage.getItem(`vote_${data.id}_type`);
    if (savedVote && ['likes', 'loves', 'claps'].includes(savedVote)) {
      setCurrentVote(savedVote as ReactionType);
    }
  }, [data.id]);

  const handleVote = async (type: ReactionType) => {
    const newCounts = { ...counts };
    
    if (currentVote === type) {
      // User is clicking the same reaction -> Toggle OFF
      newCounts[type] = Math.max(0, newCounts[type] - 1);
      setCurrentVote(null);
      localStorage.removeItem(`vote_${data.id}_type`);
    } else {
      // User is switching reaction or adding new one
      
      // 1. Remove old vote if it exists
      if (currentVote) {
        newCounts[currentVote] = Math.max(0, newCounts[currentVote] - 1);
      }
      
      // 2. Add new vote
      newCounts[type] = newCounts[type] + 1;
      setCurrentVote(type);
      localStorage.setItem(`vote_${data.id}_type`, type);
    }

    // Update Local State immediately
    setCounts(newCounts);

    // Update Backend
    const updatedTestimonial = { ...data, ...newCounts };
    await ApiService.updateTestimonial(updatedTestimonial);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4 flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <img 
          src={imageError ? DEFAULT_AVATAR : data.image} 
          alt={data.name} 
          className="w-10 h-10 rounded-full object-cover border border-gray-100"
          onError={handleImageError}
        />
        <div>
          <h4 className="font-bold text-gray-900 text-sm">{data.name}</h4>
          <p className="text-xs text-gray-500">{data.date} • <span className="text-green-700 font-medium">Received {formatCurrency(data.amount)}</span></p>
        </div>
      </div>
      
      <p className="text-gray-700 text-sm mb-4 leading-relaxed flex-grow">
        {data.content}
      </p>

      <div className="flex gap-4 border-t pt-2 mt-auto">
        <button 
          onClick={() => handleVote('likes')}
          className={`flex items-center gap-1 text-xs transition-colors ${currentVote === 'likes' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}
        >
          <ThumbsUp size={14} className={currentVote === 'likes' ? 'fill-blue-100' : ''} />
          <span>{counts.likes}</span>
        </button>
        <button 
          onClick={() => handleVote('loves')}
          className={`flex items-center gap-1 text-xs transition-colors ${currentVote === 'loves' ? 'text-red-600 font-bold' : 'text-gray-500 hover:text-red-600'}`}
        >
          <Heart size={14} className={currentVote === 'loves' ? 'fill-red-100' : ''} />
          <span>{counts.loves}</span>
        </button>
        <button 
          onClick={() => handleVote('claps')}
          className={`flex items-center gap-1 text-xs transition-colors ${currentVote === 'claps' ? 'text-orange-500 font-bold' : 'text-gray-500 hover:text-orange-500'}`}
        >
          <Hand size={14} className={currentVote === 'claps' ? 'fill-orange-100' : ''} />
          <span>{counts.claps}</span>
        </button>
      </div>
    </div>
  );
};