import { GrantNetwork } from '../types';

export const GRANT_NETWORKS: GrantNetwork[] = [
  {
    id: 'boi',
    name: 'Bank of Industry (BOI)',
    description: 'Provides long-term financial assistance to industries, focused on manufacturing and production.',
    logo: 'https://www.boi.ng/wp-content/uploads/2019/12/BOI-LOGO.png',
    keywords: ['manufacturing', 'production', 'industry', 'factory', 'processing', 'raw materials', 'machinery'],
    link: 'https://www.boi.ng/apply/'
  },
  {
    id: 'tef',
    name: 'Tony Elumelu Foundation (TEF)',
    description: 'Empowers African entrepreneurs with seed capital, training, and mentorship.',
    logo: 'https://www.tonyelumelufoundation.org/wp-content/uploads/2020/09/TEF-Logo.png',
    keywords: ['startup', 'entrepreneur', 'africa', 'innovation', 'technology', 'scaleup', 'small business', 'new idea'],
    link: 'https://www.tefconnect.net/'
  },
  {
    id: 'gep',
    name: 'Government Enterprise & Empowerment Programme (GEEP)',
    description: 'Interest-free loans for petty traders, artisans, and small business owners (MarketMoni, TraderMoni).',
    logo: 'https://geep.ng/wp-content/uploads/2021/04/GEEP-Logo.png',
    keywords: ['trader', 'artisan', 'market', 'retail', 'petty trade', 'small scale', 'community'],
    link: 'https://geep.ng/'
  },
  {
    id: 'ncedf',
    name: 'Nigerian Creative Enterprise Support Scheme',
    description: 'Specialized funding for the creative arts, fashion, film, and media industries.',
    logo: 'https://www.creativenigeria.org/logo.png',
    keywords: ['creative', 'arts', 'fashion', 'film', 'media', 'music', 'entertainment', 'design'],
    link: 'https://www.creativenigeria.org/'
  },
  {
    id: 'agmeis',
    name: 'AGSMEIS (CBN)',
    description: 'Agricultural Small and Medium Enterprise Investment Scheme for agribusiness and MSMEs.',
    logo: 'https://www.cbn.gov.ng/logo.png',
    keywords: ['agriculture', 'farming', 'agribusiness', 'poultry', 'crops', 'livestock', 'agro', 'fishery'],
    link: 'https://nmfb.com.ng/agsmeis/'
  }
];

export const matchGrantNetwork = (description: string): GrantNetwork => {
  const lowered = description.toLowerCase();
  
  // Scoring system
  let bestMatch = GRANT_NETWORKS[0]; // Default to BOI
  let highestScore = -1;

  for (const network of GRANT_NETWORKS) {
    let score = 0;
    for (const keyword of network.keywords) {
      if (lowered.includes(keyword)) {
        score++;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = network;
    }
  }

  return bestMatch;
};
