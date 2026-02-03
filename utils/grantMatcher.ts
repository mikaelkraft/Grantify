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
  },
  {
    id: 'lsetf',
    name: 'Lagos State Employment Trust Fund (LSETF)',
    description: 'Grants and low-interest loans for Lagos-based residents and business owners.',
    logo: 'https://lsetf.ng/assets/img/logo.png',
    keywords: ['lagos', 'resident', 'employment', 'state', 'loan', 'training', 'sme'],
    link: 'https://lsetf.ng/'
  },
  {
    id: 'dbn',
    name: 'Development Bank of Nigeria (DBN)',
    description: 'Wholesale finance institution alleviating financing constraints for MSMEs.',
    logo: 'https://devbankng.com/assets/images/logo.png',
    keywords: ['development', 'bank', 'msme', 'financing', 'growth', 'capital', 'wholesale'],
    link: 'https://devbankng.com/'
  },
  {
    id: 'w-initiative',
    name: 'Access Bank W Initiative',
    description: 'Specialized funding and capacity building for women-owned businesses.',
    logo: 'https://www.accessbankplc.com/AccessBank/media/Site-Images-and-Documents/W-Logo.png',
    keywords: ['women', 'female', 'gender', 'access bank', 'empowerment', 'lady', 'girl'],
    link: 'https://www.accessbankplc.com/w-initiative'
  },
  {
    id: 'aytf',
    name: 'African Youth Trade Fund',
    description: 'Dedicated to supporting young African traders and exporters.',
    logo: 'https://cdn-icons-png.flaticon.com/512/4300/4300508.png', // Placeholder
    keywords: ['youth', 'trade', 'export', 'young', 'africa', 'commerce'],
    link: '#matcher'
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
