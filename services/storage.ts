import { 
  LoanApplication, 
  Testimonial, 
  QualifiedPerson, 
  AdConfig, 
  AdminUser, 
  UserRole,
  RepaymentContent,
  ReferralData
} from '../types';

const KEYS = {
  APPLICATIONS: 'grantify_applications',
  TESTIMONIALS: 'grantify_testimonials',
  QUALIFIED: 'grantify_qualified',
  ADS: 'grantify_ads',
  ADMINS: 'grantify_admins',
  REPAYMENT: 'grantify_repayment',
  REFERRAL_LOCAL: 'grantify_my_referral' // Local user's referral info
};

// --- CONFIGURATION ---
// We default to localhost for development.
// When you deploy your backend (e.g. to Render/Heroku/Vercel), set VITE_API_URL in your environment variables.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; 

// Initial Seed Data (Used for Mock Mode if API fails or is empty)
const initialTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Chinedu Okeke',
    // Black man, professional/business casual
    image: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?fit=crop&w=150&h=150&q=80',
    amount: 200000,
    content: 'Grantify really came through for my grocery business. The 5% interest rate is unbeatable!',
    likes: 124,
    loves: 45,
    claps: 12,
    date: '2023-10-15'
  },
  {
    id: '2',
    name: 'Amina Yusuf',
    // Black woman, headscarf/modest (representative of northern Nigeria demographic)
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?fit=crop&w=150&h=150&q=80',
    amount: 500000,
    content: 'I was skeptical at first, but the process was transparent. I received my funds within 48 hours of verification.',
    likes: 89,
    loves: 120,
    claps: 30,
    date: '2023-10-20'
  },
  {
    id: '3',
    name: 'Tunde Bakare',
    // Black man, smiling
    image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?fit=crop&w=150&h=150&q=80',
    amount: 150000,
    content: 'Perfect for small business owners. The repayment plan is very flexible.',
    likes: 45,
    loves: 10,
    claps: 5,
    date: '2023-10-22'
  },
  {
    id: '4',
    name: 'Grace Eze',
    // Black woman, professional
    image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?fit=crop&w=150&h=150&q=80',
    amount: 1000000,
    content: 'The Fast-Track option is real! Paid the processing fee and got my loan sorted for my boutique expansion.',
    likes: 210,
    loves: 55,
    claps: 40,
    date: '2023-10-25'
  },
  {
    id: '5',
    name: 'Yusuf Ibrahim',
    // Black man, young professional
    image: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?fit=crop&w=150&h=150&q=80',
    amount: 350000,
    content: 'The customer service is excellent. They guided me through the NIN verification process smoothly.',
    likes: 78,
    loves: 15,
    claps: 8,
    date: '2023-10-28'
  },
  {
    id: '6',
    name: 'Ngozi Obi',
    // Black woman, vibrant
    image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?fit=crop&w=150&h=150&q=80',
    amount: 800000,
    content: 'Applied on Monday, got credited on Wednesday. Highly recommended for traders.',
    likes: 156,
    loves: 89,
    claps: 22,
    date: '2023-10-30'
  }
];

const initialQualified: QualifiedPerson[] = [
  { id: '1', name: 'Emeka Uche', amount: 300000, status: 'Contacted', notes: 'Verification complete' },
  { id: '2', name: 'Sarah Johnson', amount: 150000, status: 'Pending', notes: 'Waiting for NIN' },
  { id: '3', name: 'Kabir Musa', amount: 500000, status: 'Disbursed', notes: 'Funds sent' },
  { id: '4', name: 'Chioma Obi', amount: 200000, status: 'Contacted', notes: 'Documents received' },
  { id: '5', name: 'Emmanuel Bassey', amount: 100000, status: 'Pending', notes: 'Reviewing application' },
  { id: '6', name: 'Funke Adebayo', amount: 450000, status: 'Disbursed', notes: 'Success' },
  { id: '7', name: 'Ibrahim Sani', amount: 250000, status: 'Pending', notes: 'Processing' },
  { id: '8', name: 'Ada Williams', amount: 180000, status: 'Contacted', notes: 'Call scheduled' }
];

const initialAds: AdConfig = {
  head: '<!-- Google Tag Manager -->',
  header: '<div style="background:#eee; padding:10px; text-align:center; color:#666; font-size:12px;">Header Ad Space (728x90)</div>',
  body: '<div style="background:#f0fdf4; border:1px dashed #006400; padding:20px; text-align:center; color:#006400;">Sponsored Content Space</div>',
  sidebar: '<div style="background:#eee; height:250px; display:flex; align-items:center; justify-content:center; color:#666;">Sidebar Ad (300x250)</div>',
  footer: '<div style="background:#333; color:#fff; padding:10px; text-align:center;">Footer Ad Space</div>',
};

const initialRepayment: RepaymentContent = {
  introText: "We believe in transparent, easy-to-understand repayment terms. No hidden fees, just a flat interest rate.",
  standardNote: "Standard loans are designed for quick turnaround and small business support.",
  fastTrackNote: "Fast-track loans support larger capital requirements with a longer repayment duration."
};

const initialAdmins: AdminUser[] = [
  { id: '1', username: 'ashwebb500@gmail.com', passwordHash: 'Nomercy2_', role: UserRole.SUPER_ADMIN, name: 'Super Admin' },
  { id: '2', username: 'staff', passwordHash: 'staff123', role: UserRole.FLOOR_ADMIN, name: 'Floor Staff' }
];

// --- HELPERS ---

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getLocal<T>(key: string, defaultData: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
}

function setLocal<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- API SERVICE ---

export const ApiService = {
  
  // -- Applications --
  getApplications: async (): Promise<LoanApplication[]> => {
    try {
      const res = await fetch(`${API_URL}/applications`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      console.warn("Using local storage fallback for applications");
      return getLocal(KEYS.APPLICATIONS, []);
    }
  },

  addApplication: async (app: LoanApplication): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(app)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("Using local storage fallback for addApplication");
      const apps = getLocal<LoanApplication[]>(KEYS.APPLICATIONS, []);
      setLocal(KEYS.APPLICATIONS, [app, ...apps]);
    }
  },

  // -- Testimonials --
  getTestimonials: async (): Promise<Testimonial[]> => {
    try {
      const res = await fetch(`${API_URL}/testimonials`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      // Return data from database (even if empty) - don't fall back to mock data
      return data;
    } catch (e) {
      console.warn("API unavailable for testimonials, using local storage fallback");
      return getLocal(KEYS.TESTIMONIALS, initialTestimonials);
    }
  },

  updateTestimonial: async (updated: Testimonial): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/testimonials/${updated.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("API unavailable for updateTestimonial, using local storage fallback");
      const all = getLocal(KEYS.TESTIMONIALS, initialTestimonials);
      const newStats = all.map(t => t.id === updated.id ? updated : t);
      setLocal(KEYS.TESTIMONIALS, newStats);
    }
  },

  saveTestimonials: async (data: Testimonial[]): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/testimonials`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("API unavailable for saveTestimonials, using local storage fallback");
      setLocal(KEYS.TESTIMONIALS, data);
    }
  },

  // -- Qualified Persons --
  getQualified: async (): Promise<QualifiedPerson[]> => {
    try {
      const res = await fetch(`${API_URL}/qualified`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      // Return data from database (even if empty) - don't fall back to mock data
      return data;
    } catch (e) {
      console.warn("API unavailable for qualified persons, using local storage fallback");
      return getLocal(KEYS.QUALIFIED, initialQualified);
    }
  },

  saveQualified: async (data: QualifiedPerson[]): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/qualified`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("API unavailable for saveQualified, using local storage fallback");
      setLocal(KEYS.QUALIFIED, data);
    }
  },

  // -- Ads --
  getAds: async (): Promise<AdConfig> => {
    try {
      const res = await fetch(`${API_URL}/ads`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      console.warn("API unavailable for ads, using local storage fallback");
      return getLocal(KEYS.ADS, initialAds);
    }
  },

  saveAds: async (data: AdConfig): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/ads`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("API unavailable for saveAds, using local storage fallback");
      setLocal(KEYS.ADS, data);
    }
  },

  // -- Admins --
  getAdmins: async (): Promise<AdminUser[]> => {
    try {
      const res = await fetch(`${API_URL}/admins`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      console.warn("API unavailable for admins, using local storage fallback");
      return getLocal(KEYS.ADMINS, initialAdmins);
    }
  },

  saveAdmins: async (data: AdminUser[]): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/admins`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("API unavailable for saveAdmins, using local storage fallback");
      setLocal(KEYS.ADMINS, data);
    }
  },

  // -- Repayment Content --
  getRepaymentContent: async (): Promise<RepaymentContent> => {
    try {
      const res = await fetch(`${API_URL}/content/repayment`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      console.warn("API unavailable for repayment content, using local storage fallback");
      return getLocal(KEYS.REPAYMENT, initialRepayment);
    }
  },

  saveRepaymentContent: async (data: RepaymentContent): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/content/repayment`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      console.warn("API unavailable for saveRepaymentContent, using local storage fallback");
      setLocal(KEYS.REPAYMENT, data);
    }
  },

  // -- Auth --
  login: async (username: string, password: string): Promise<AdminUser | null> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.warn("API unavailable for login, using local storage fallback");
      const admins = getLocal(KEYS.ADMINS, initialAdmins);
      return admins.find(a => a.username === username && a.passwordHash === password) || null;
    }
  },

  // -- Referral (Client-side mostly) --
  getMyReferralData: (): ReferralData => {
    return getLocal(KEYS.REFERRAL_LOCAL, {
      code: 'GRANT-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      points: 0
    });
  }
};