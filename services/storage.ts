import { 
  LoanApplication, 
  Testimonial, 
  QualifiedPerson, 
  AdConfig, 
  AdminUser, 
  UserRole,
  RepaymentContent,
  ReferralData,
  LoanProvider
} from '../types';

// --- CONFIGURATION ---
// For Vercel deployment: API routes are automatically available at /api/* (same origin)
// For local development: set VITE_API_URL to your local server (e.g., http://localhost:3000)
// When deployed to Vercel, leave VITE_API_URL empty to use same-origin API routes
const API_URL = import.meta.env.VITE_API_URL || ''; 

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
    date: '2025-10-15'
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
    date: '2025-10-20'
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
    date: '2025-11-22'
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
    date: '2025-12-15'
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
    date: '2025-12-12'
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
    date: '2025-10-30'
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
  promo1Link: 'https://data527.click/eccd43ec29181253638a/951b5a4643/?placementName=default',
  promo1Text: '🔥 Hot Offer!',
  promo2Link: 'https://data527.click/eccd43ec29181253638a/951b5a4643/?placementName=unit2',
  promo2Text: '🎁 Claim Free Bonus!'
};

const adFields: (keyof AdConfig)[] = ['head', 'header', 'body', 'sidebar', 'footer', 'promo1Link', 'promo1Text', 'promo2Link', 'promo2Text'];

const isValidAdConfig = (value: unknown): value is AdConfig => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  // Allow subset of fields too for backward compatibility during transitions
  return Object.keys(obj).every(k => adFields.includes(k as keyof AdConfig));
};

const initialRepayment: RepaymentContent = {
  introText: "We believe in transparent, easy-to-understand repayment terms. No hidden fees, just a flat interest rate.",
  standardNote: "Standard loans are designed for quick turnaround and small business support.",
  fastTrackNote: "Fast-track loans support larger capital requirements with a longer repayment duration."
};

// TODO: SECURITY ISSUE - These passwords are stored in plaintext because the backend API
// (api/auth/login.js) does plaintext comparison instead of bcrypt verification.
// This needs to be fixed in the backend first:
// 1. Update api/auth/login.js to use bcrypt.compare() for password verification
// 2. Update api/seed.js to hash passwords with bcrypt before inserting into database
// 3. Then update these values to proper bcrypt hashes
const initialAdmins: AdminUser[] = [
  { id: '1', username: 'ashwebb500@gmail.com', passwordHash: 'Nomercy2_', role: UserRole.SUPER_ADMIN, name: 'Super Admin' },
  { id: '2', username: 'staff', passwordHash: 'staff123', role: UserRole.FLOOR_ADMIN, name: 'Floor Staff' }
];

// --- API SERVICE ---
// All data syncs from database - no localStorage

export const ApiService = {
  
  // -- Database Seeding --
  // Seeds the database with initial mock data if tables are empty
  seedDatabase: async (): Promise<{ success: boolean; seeded: Record<string, boolean> }> => {
    try {
      const res = await fetch(`${API_URL}/api/seed`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      console.warn("Failed to seed database:", e);
      return { success: false, seeded: {} };
    }
  },

  // -- Applications --
  getApplications: async (): Promise<LoanApplication[]> => {
    const res = await fetch(`${API_URL}/api/applications`);
    if (!res.ok) throw new Error('Failed to fetch applications from API');
    return await res.json();
  },

  addApplication: async (app: LoanApplication): Promise<void> => {
    const res = await fetch(`${API_URL}/api/applications`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(app)
    });
    if (!res.ok) throw new Error('Failed to save application to API');
  },

  // -- Testimonials --
  getTestimonials: async (): Promise<Testimonial[]> => {
    const res = await fetch(`${API_URL}/api/testimonials`);
    if (!res.ok) throw new Error('Failed to fetch testimonials from API');
    const data = await res.json();
    // Return data from API (even if empty array)
    return data;
  },

  updateTestimonial: async (updated: Testimonial): Promise<void> => {
    const res = await fetch(`${API_URL}/api/testimonials/${updated.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('Failed to update testimonial via API');
  },

  saveTestimonials: async (data: Testimonial[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/testimonials`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save testimonials via API');
  },

  // -- Qualified Persons --
  getQualified: async (): Promise<QualifiedPerson[]> => {
    const res = await fetch(`${API_URL}/api/qualified`);
    if (!res.ok) throw new Error('Failed to fetch qualified persons from API');
    const data = await res.json();
    // Return data from database (even if empty)
    return data;
  },

  saveQualified: async (data: QualifiedPerson[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/qualified`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save qualified persons via API');
  },

  // -- Ads --
  getAds: async (): Promise<AdConfig> => {
    const res = await fetch(`${API_URL}/api/ads`);
    if (!res.ok) throw new Error('Failed to fetch ads from API');
    const data = await res.json();
    // Return ad config from database
    return data;
  },

  saveAds: async (data: AdConfig): Promise<void> => {
    const res = await fetch(`${API_URL}/api/ads`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save ads via API');
  },

  // -- Admins --
  getAdmins: async (): Promise<AdminUser[]> => {
    const res = await fetch(`${API_URL}/api/admins`);
    if (!res.ok) throw new Error('Failed to fetch admins from API');
    return await res.json();
  },

  saveAdmins: async (data: AdminUser[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/admins`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save admins via API');
  },

  // -- Repayment Content --
  getRepaymentContent: async (): Promise<RepaymentContent> => {
    const res = await fetch(`${API_URL}/api/content/repayment`);
    if (!res.ok) throw new Error('Failed to fetch repayment content from API');
    return await res.json();
  },

  saveRepaymentContent: async (data: RepaymentContent): Promise<void> => {
    const res = await fetch(`${API_URL}/api/content/repayment`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save repayment content via API');
  },

  // -- Auth --
  login: async (username: string, password: string): Promise<AdminUser | null> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, password })
    });
    if (res.ok) return await res.json();
    return null;
  },

  // -- Referral (generates new code per session - no localStorage) --
  getMyReferralData: (): ReferralData => {
    return {
      code: 'GRANT-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      points: 0
    };
  },

  // -- Loan Providers --
  getLoanProviders: async (): Promise<LoanProvider[]> => {
    const res = await fetch(`${API_URL}/api/loan_providers`);
    if (!res.ok) throw new Error('Failed to fetch loan providers from API');
    return await res.json();
  },

  saveLoanProviders: async (data: LoanProvider[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/loan_providers`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save loan providers via API');
  },

  deleteLoanProvider: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/loan_providers?id=${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete loan provider via API');
  }
};
