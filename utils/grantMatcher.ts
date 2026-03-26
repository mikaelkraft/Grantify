import { GrantNetwork } from '../types';

export const GRANT_NETWORKS: GrantNetwork[] = [
  {
    id: 'boi',
    name: 'Bank of Industry (BOI)',
    description: 'Provides long-term financial assistance to industries, focused on manufacturing and production.',
    logo: 'https://placehold.co/400x200/png?text=BOI', // Replaced with reliable placeholder
    keywords: ['manufacturing', 'production', 'industry', 'factory', 'processing', 'raw materials', 'machinery'],
    link: 'https://www.boi.ng/',
    region: 'nigeria',
    categories: ['sme', 'manufacturing']
  },
  {
    id: 'tef',
    name: 'Tony Elumelu Foundation (TEF)',
    description: 'Empowers African entrepreneurs with seed capital, training, and mentorship.',
    logo: 'https://placehold.co/400x200/png?text=TEF',
    keywords: ['startup', 'entrepreneur', 'africa', 'innovation', 'technology', 'scaleup', 'small business', 'new idea'],
    link: 'https://www.tonyelumelufoundation.org/',
    region: 'nigeria',
    categories: ['sme', 'youth', 'technology']
  },
  {
    id: 'smedan',
    name: 'SMEDAN (Small & Medium Enterprises Development Agency of Nigeria)',
    description: 'Federal agency supporting MSMEs with programs, training, and funding initiatives.',
    logo: 'https://placehold.co/400x200/png?text=SMEDAN',
    keywords: ['smedan', 'msme', 'sme', 'small business', 'training', 'capacity building', 'entrepreneurship', 'nigeria'],
    link: 'https://smedan.gov.ng/',
    region: 'nigeria',
    categories: ['sme', 'education']
  },
  {
    id: 'youwin',
    name: 'YouWin Connect Nigeria',
    description: 'Entrepreneurship support and opportunities for Nigerian businesses and startups.',
    logo: 'https://placehold.co/400x200/png?text=YouWin',
    keywords: ['youwin', 'startup', 'business plan', 'entrepreneur', 'grant', 'nigeria', 'youth'],
    link: 'https://youwinconnect.org.ng/',
    region: 'nigeria',
    categories: ['sme', 'youth']
  },
  {
    id: 'nitda',
    name: 'NITDA Technology Innovation Grants',
    description: 'Technology and innovation support programs under Nigeria’s ICT development agency.',
    logo: 'https://placehold.co/400x200/png?text=NITDA',
    keywords: ['nitda', 'technology', 'innovation', 'ict', 'software', 'startup', 'digital', 'nigeria'],
    link: 'https://nitda.gov.ng/',
    region: 'nigeria',
    categories: ['technology', 'education']
  },
  {
    id: 'gep',
    name: 'Government Enterprise & Empowerment Programme (GEEP)',
    description: 'Interest-free loans for petty traders, artisans, and small business owners (MarketMoni, TraderMoni).',
    logo: 'https://placehold.co/400x200/png?text=GEEP',
    keywords: ['trader', 'artisan', 'market', 'retail', 'petty trade', 'small scale', 'community'],
    link: 'https://geep.ng/',
    region: 'nigeria',
    categories: ['sme', 'trade']
  },
  {
    id: 'ncedf',
    name: 'Nigerian Creative Enterprise Support Scheme',
    description: 'Specialized funding for the creative arts, fashion, film, and media industries.',
    logo: 'https://placehold.co/400x200/png?text=Creative+NG',
    keywords: ['creative', 'arts', 'fashion', 'film', 'media', 'music', 'entertainment', 'design'],
    link: 'https://www.creativenigeria.org/',
    region: 'nigeria',
    categories: ['creative', 'sme']
  },
  {
    id: 'agmeis',
    name: 'AGSMEIS (CBN)',
    description: 'Agricultural Small and Medium Enterprise Investment Scheme for agribusiness and MSMEs.',
    logo: 'https://placehold.co/400x200/png?text=CBN',
    keywords: ['agriculture', 'farming', 'agribusiness', 'poultry', 'crops', 'livestock', 'agro', 'fishery'],
    link: 'https://www.cbn.gov.ng/',
    region: 'nigeria',
    categories: ['agriculture', 'sme']
  },
  {
    id: 'nsip',
    name: 'National Social Investment Programmes (NSIP)',
    description: 'Government social investment initiatives supporting empowerment and livelihoods.',
    logo: 'https://placehold.co/400x200/png?text=NSIP',
    keywords: ['nsip', 'empowerment', 'social investment', 'nigeria', 'support', 'programme', 'youth', 'women'],
    link: 'https://nsip.gov.ng/',
    region: 'nigeria',
    categories: ['youth', 'women', 'sme']
  },
  {
    id: 'lsetf',
    name: 'Lagos State Employment Trust Fund (LSETF)',
    description: 'Grants and low-interest loans for Lagos-based residents and business owners.',
    logo: 'https://placehold.co/400x200/png?text=LSETF',
    keywords: ['lagos', 'resident', 'employment', 'state', 'loan', 'training', 'sme'],
    link: 'https://lsetf.ng/',
    region: 'nigeria',
    categories: ['sme', 'youth']
  },
  {
    id: 'dbn',
    name: 'Development Bank of Nigeria (DBN)',
    description: 'Wholesale finance institution alleviating financing constraints for MSMEs.',
    logo: 'https://placehold.co/400x200/png?text=DBN',
    keywords: ['development', 'bank', 'msme', 'financing', 'growth', 'capital', 'wholesale'],
    link: 'https://devbankng.com/',
    region: 'nigeria',
    categories: ['sme']
  },
  {
    id: 'w-initiative',
    name: 'Access Bank W Initiative',
    description: 'Specialized funding and capacity building for women-owned businesses.',
    logo: 'https://placehold.co/400x200/png?text=W+Initiative',
    keywords: ['women', 'female', 'gender', 'access bank', 'empowerment', 'lady', 'girl'],
    link: 'https://www.accessbankplc.com/w-initiative',
    region: 'nigeria',
    categories: ['women', 'sme']
  },
  {
    id: 'usadf',
    name: 'U.S. African Development Foundation (USADF)',
    description: 'Supports African enterprises and community organizations through grant funding and partnerships.',
    logo: 'https://placehold.co/400x200/png?text=USADF',
    keywords: ['usadf', 'africa', 'grant', 'enterprise', 'community', 'development', 'youth', 'women'],
    link: 'https://www.usadf.gov/',
    region: 'africa',
    categories: ['ngo', 'sme']
  },
  {
    id: 'afdb',
    name: 'African Development Bank (AfDB) Grants',
    description: 'Development finance opportunities and funding programs across Africa.',
    logo: 'https://placehold.co/400x200/png?text=AfDB',
    keywords: ['afdb', 'african development bank', 'grant', 'africa', 'development', 'funding', 'projects'],
    link: 'https://www.afdb.org/',
    region: 'africa',
    categories: ['ngo', 'climate']
  },
  {
    id: 'afreximbank',
    name: 'Afreximbank — African Youth Trade Fund',
    description: 'Trade finance and export/import support programs including youth-focused initiatives.',
    logo: 'https://placehold.co/400x200/png?text=Afreximbank',
    keywords: ['afreximbank', 'trade', 'export', 'import', 'africa', 'youth', 'commerce', 'sme'],
    link: 'https://www.afreximbank.com/',
    region: 'africa',
    categories: ['trade', 'youth', 'sme']
  },
  {
    id: 'mastercard-foundation',
    name: 'Mastercard Foundation',
    description: 'Programs supporting youth employment, entrepreneurship, and inclusive growth in Africa.',
    logo: 'https://placehold.co/400x200/png?text=Mastercard+Foundation',
    keywords: ['mastercard foundation', 'youth', 'employment', 'entrepreneurship', 'africa', 'skills', 'training'],
    link: 'https://mastercardfoundation.org/',
    region: 'africa',
    categories: ['youth', 'education', 'sme']
  },
  {
    id: 'ford-foundation',
    name: 'Ford Foundation (Africa)',
    description: 'Grantmaking focused on social justice and inclusive development.',
    logo: 'https://placehold.co/400x200/png?text=Ford+Foundation',
    keywords: ['ford foundation', 'grant', 'africa', 'social justice', 'civil society', 'community', 'ngo'],
    link: 'https://www.fordfoundation.org/',
    region: 'africa',
    categories: ['ngo']
  },
  {
    id: 'global-innovation-fund',
    name: 'Global Innovation Fund',
    description: 'Invests in social innovations with measurable development impact, including Africa-focused opportunities.',
    logo: 'https://placehold.co/400x200/png?text=Global+Innovation+Fund',
    keywords: ['global innovation fund', 'innovation', 'impact', 'grant', 'startup', 'africa', 'development'],
    link: 'https://www.globalinnovation.fund/',
    region: 'africa',
    categories: ['technology', 'ngo', 'sme']
  },
  {
    id: 'grants-database-africa',
    name: 'Grants Database Africa',
    description: 'Directory of funding and grant opportunities relevant to Africa-based applicants.',
    logo: 'https://placehold.co/400x200/png?text=Grants+Database+Africa',
    keywords: ['grants database', 'africa', 'directory', 'listing', 'funding opportunities', 'grant search'],
    link: 'https://grantsdatabase.org/',
    region: 'africa',
    categories: ['ngo', 'sme']
  },
  {
    id: 'gates',
    name: 'Bill & Melinda Gates Foundation',
    description: 'Supports global health, development, and innovation initiatives through grants and partnerships.',
    logo: 'https://placehold.co/400x200/png?text=Gates+Foundation',
    keywords: ['gates foundation', 'global health', 'health', 'innovation', 'development', 'grant'],
    link: 'https://www.gatesfoundation.org/',
    region: 'international',
    categories: ['health', 'ngo']
  },
  {
    id: 'rockefeller',
    name: 'Rockefeller Foundation',
    description: 'Supports initiatives advancing wellbeing, resilience, and inclusive growth.',
    logo: 'https://placehold.co/400x200/png?text=Rockefeller',
    keywords: ['rockefeller', 'foundation', 'resilience', 'climate', 'development', 'grant'],
    link: 'https://www.rockefellerfoundation.org/',
    region: 'international',
    categories: ['climate', 'ngo']
  },
  {
    id: 'open-society',
    name: 'Open Society Foundations',
    description: 'Grantmaking supporting human rights, justice, and inclusive societies.',
    logo: 'https://placehold.co/400x200/png?text=Open+Society',
    keywords: ['open society', 'foundation', 'grant', 'civil society', 'human rights', 'ngo'],
    link: 'https://www.opensocietyfoundations.org/',
    region: 'international',
    categories: ['ngo']
  },
  {
    id: 'undp',
    name: 'UNDP Grants & Funding',
    description: 'Development programs and funding opportunities under the United Nations Development Programme.',
    logo: 'https://placehold.co/400x200/png?text=UNDP',
    keywords: ['undp', 'united nations', 'development', 'funding', 'grant', 'projects'],
    link: 'https://www.undp.org/',
    region: 'international',
    categories: ['ngo', 'climate']
  },
  {
    id: 'world-bank',
    name: 'World Bank Grants & Trust Funds',
    description: 'Global development funding programs including trust funds and grant mechanisms.',
    logo: 'https://placehold.co/400x200/png?text=World+Bank',
    keywords: ['world bank', 'trust fund', 'grant', 'development', 'projects', 'funding'],
    link: 'https://www.worldbank.org/',
    region: 'international',
    categories: ['ngo', 'education']
  },
  {
    id: 'usaid',
    name: 'USAID Development Grants',
    description: 'Funding opportunities and grants under the U.S. Agency for International Development.',
    logo: 'https://placehold.co/400x200/png?text=USAID',
    keywords: ['usaid', 'development', 'grant', 'funding opportunity', 'tender', 'projects'],
    link: 'https://www.usaid.gov/',
    region: 'international',
    categories: ['ngo', 'health']
  },
  {
    id: 'eu-funding',
    name: 'EU Funding & Tenders Portal',
    description: 'European Union funding and tender opportunities portal.',
    logo: 'https://placehold.co/400x200/png?text=EU+Funding',
    keywords: ['eu', 'european union', 'funding', 'tenders', 'calls', 'grants', 'portal'],
    link: 'https://ec.europa.eu/info/funding-tenders',
    region: 'international',
    categories: ['ngo', 'technology']
  },
  {
    id: 'opengrants',
    name: 'OpenGrants (Global Grant Listings)',
    description: 'Global grant listings and discovery platform for funding opportunities.',
    logo: 'https://placehold.co/400x200/png?text=OpenGrants',
    keywords: ['opengrants', 'grant listings', 'directory', 'funding', 'global', 'search'],
    link: 'https://opengrants.io/',
    region: 'international',
    categories: ['ngo', 'sme']
  }
];

const BUSINESS_TYPE_TO_CATEGORIES: Record<string, GrantNetwork['categories']> = {
  Agriculture: ['agriculture'],
  Tech: ['technology'],
  Trade: ['trade'],
  Creative: ['creative'],
  Manufacturing: ['manufacturing'],
  Education: ['education']
};

const inferCategoriesFromText = (text: string): GrantNetwork['categories'] => {
  const lowered = text.toLowerCase();
  const categories = new Set<GrantNetwork['categories'][number]>();

  const addIf = (category: GrantNetwork['categories'][number], patterns: string[]) => {
    for (const p of patterns) {
      if (lowered.includes(p)) {
        categories.add(category);
        return;
      }
    }
  };

  addIf('agriculture', ['agric', 'farm', 'poultry', 'livestock', 'crop', 'fish', 'aquaculture']);
  addIf('technology', ['tech', 'software', 'app', 'saas', 'ai', 'data', 'startup', 'innovation']);
  addIf('trade', ['trade', 'retail', 'market', 'shop', 'commerce', 'import', 'export']);
  addIf('creative', ['creative', 'film', 'music', 'fashion', 'media', 'design', 'art']);
  addIf('manufacturing', ['manufact', 'factory', 'production', 'processing', 'machinery']);
  addIf('education', ['education', 'school', 'training', 'skills', 'bootcamp', 'teacher']);
  addIf('health', ['health', 'clinic', 'hospital', 'medical', 'pharma']);
  addIf('women', ['women', 'female', 'girl', 'mother']);
  addIf('youth', ['youth', 'young', 'student', 'graduates', 'graduate']);
  addIf('climate', ['climate', 'renewable', 'solar', 'clean energy', 'sustainability', 'environment']);
  addIf('ngo', ['ngo', 'nonprofit', 'non-profit', 'charity', 'community based']);
  addIf('sme', ['sme', 'msme', 'small business', 'micro business', 'entrepreneur']);

  return Array.from(categories);
};

export const matchGrantNetwork = (description: string, businessType?: string): GrantNetwork | null => {
  const lowered = (description || '').toLowerCase();
  const inferred = inferCategoriesFromText(description || '');
  const preferred = BUSINESS_TYPE_TO_CATEGORIES[businessType || ''] || [];
  const preferredSet = new Set(preferred);

  let bestMatch: GrantNetwork | null = null;
  let highestScore = 0;

  for (const network of GRANT_NETWORKS) {
    let score = 0;

    // Keyword hits: strong signal
    for (const keyword of network.keywords) {
      if (lowered.includes(keyword)) score += 3;
    }

    // Category alignment: medium signal
    for (const c of inferred) {
      if (network.categories.includes(c)) score += 2;
    }
    for (const c of network.categories) {
      if (preferredSet.has(c)) score += 2;
    }

    // Region hints
    if (lowered.includes('nigeria') && network.region === 'nigeria') score += 1;
    if (lowered.includes('africa') && network.region === 'africa') score += 1;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = network;
    }
  }

  return highestScore > 0 ? bestMatch : null;
};
