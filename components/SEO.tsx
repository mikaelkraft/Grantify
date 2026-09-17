import React, { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article';
  schema?: Record<string, any> | Record<string, any>[];
}

const DEFAULT_TITLE = 'Grantify - Empowering Families & Businesses with Legitimate Funding';
const DEFAULT_DESC = 'Grantify helps Nigerian entrepreneurs, families, and businesses discover vetted grant funding, instant loan options, and financial intelligence.';
const DEFAULT_IMAGE = 'https://grantify.help/og-default.svg';
const BASE_URL = 'https://grantify.help';

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  schema,
}) => {
  useEffect(() => {
    // 1. Title
    const fullTitle = title ? (title.includes('Grantify') ? title : `${title} | Grantify`) : DEFAULT_TITLE;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta
    setMeta('name', 'description', description);

    // 3. Canonical URL
    const canonicalUrl = canonical
      ? (canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical.startsWith('/') ? '' : '/'}${canonical}`)
      : (typeof window !== 'undefined' ? window.location.href.split('#')[0] : BASE_URL);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // 4. Open Graph Tags
    setMeta('property', 'og:site_name', 'Grantify');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonicalUrl);

    const fullImageUrl = image.startsWith('http')
      ? image
      : `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
    setMeta('property', 'og:image', fullImageUrl);

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', fullImageUrl);

    // 6. Schema.org JSON-LD injection
    const existingScript = document.getElementById('grantify-schema-ld');
    if (existingScript) existingScript.remove();

    if (schema) {
      const script = document.createElement('script');
      script.id = 'grantify-schema-ld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById('grantify-schema-ld');
      if (s) s.remove();
    };
  }, [title, description, canonical, image, type, schema]);

  return null;
};
