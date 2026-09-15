import React from 'react';

export interface SocialAppLogoProps {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'telegram' | 'whatsapp' | string;
  className?: string;
  size?: number;
}

export const SocialAppLogo: React.FC<SocialAppLogoProps> = ({ platform, className = '', size = 20 }) => {
  const p = platform.toLowerCase();

  switch (p) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <circle cx="12" cy="12" r="12" fill="#1877F2" />
          <path fill="#ffffff" d="M15 12h-2.1v7h-2.9v-7H8.5v-2.5H10V7.8c0-2 1.2-3.3 3.3-3.3.9 0 1.7.1 2 .1v2.3h-1.2c-1 0-1.2.5-1.2 1.2v1.4h2.4l-.3 2.5z" />
        </svg>
      );

    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <rect width="24" height="24" rx="5" fill="#000000" />
          <path fill="#ffffff" d="M17.2 4.5h2.2l-4.8 5.5 5.7 7.5H15.8l-3.5-4.6-4.1 4.6H6l5.2-5.9L5.7 4.5h4.6l3.1 4.2 3.8-4.2zm-.8 11.7h1.2L9.5 5.7H8.2l8.2 10.5z" />
        </svg>
      );

    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <defs>
            <radialGradient id="ig-app-grad" cx="25%" cy="110%" r="140%">
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="10%" stopColor="#fdf497" />
              <stop offset="50%" stopColor="#fd5949" />
              <stop offset="68%" stopColor="#d6249f" />
              <stop offset="100%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig-app-grad)" />
          <rect x="4.5" y="4.5" width="15" height="15" rx="4.2" fill="none" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="3.6" fill="none" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="16.5" cy="7.5" r="1.1" fill="#ffffff" />
        </svg>
      );

    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <rect width="24" height="24" rx="4.5" fill="#0A66C2" />
          <path fill="#ffffff" d="M19 19h-3.3v-5.2c0-1.2 0-2.8-1.7-2.8-1.7 0-2 1.3-2 2.7V19H8.7V8.4H11.9v1.4h.1c.4-.8 1.5-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.9V19zM5.5 7c-1.1 0-1.9-.9-1.9-1.9 0-1.1.9-2 1.9-2 1 0 1.9.9 1.9 2 0 1-.9 1.9-1.9 1.9zm1.7 12H3.8V8.4h3.4V19z" />
        </svg>
      );

    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8z" />
          <path fill="#ffffff" d="M9.6 15.5V8.5l6.2 3.5-6.2 3.5z" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <rect width="24" height="24" rx="5" fill="#000000" />
          {/* Cyan glow */}
          <path fill="#25F4EE" d="M12.4 4.5v10.3c-.3 0-.6-.1-.9-.1-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4v-7.1c1.5 1.1 3.3 1.7 5.2 1.7V9.8c-1.8 0-3.4-.8-4.3-2.1V4.5h-4z" />
          {/* Magenta glow */}
          <path fill="#FE2C55" d="M13.2 5.2v10.3c-.3 0-.6-.1-.9-.1-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4v-7.1c1.5 1.1 3.3 1.7 5.2 1.7V10.5c-1.8 0-3.4-.8-4.3-2.1V5.2h-4z" />
          {/* White core */}
          <path fill="#FFFFFF" d="M12.8 4.8v10.3c-.3 0-.6-.1-.9-.1-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4v-7.1c1.5 1.1 3.3 1.7 5.2 1.7V10.1c-1.8 0-3.4-.8-4.3-2.1V4.8h-4z" />
        </svg>
      );

    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <circle cx="12" cy="12" r="12" fill="#229ED9" />
          <path fill="#ffffff" d="M5.4 11.9l11.6-4.7c.5-.2 1.1.1 1 .7l-2 9.4c-.1.6-.7.8-1.2.5l-3.3-2.4-1.6 1.5c-.2.2-.4.4-.8.4l.2-3.4 6.2-5.6c.3-.3 0-.4-.3-.2l-7.7 4.9-3.3-1c-.7-.2-.7-.7.1-1z" />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}>
          <circle cx="12" cy="12" r="12" fill="#25D366" />
          <path fill="#ffffff" d="M17.5 14.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.4 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.6-.5z" />
        </svg>
      );

    default:
      return null;
  }
};
