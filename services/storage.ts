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
  REFERRAL_LOCAL: 'grantify_my_referral' // Local user's referral info
};

// --- CONFIGURATION ---
// For Vercel deployment: API routes are automatically available at /api/* (same origin)
// For local development: set VITE_API_URL to your local server (e.g., http://localhost:3000)
// When deployed to Vercel, leave VITE_API_URL empty to use same-origin API routes
const API_URL = import.meta.env.VITE_API_URL || ''; 

// --- HELPERS ---

// Helper for client-side only data (referral code, etc.)
function getLocal<T>(key: string, defaultData: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn(`Corrupt local storage for ${key}, resetting`, error);
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
}

// --- API SERVICE ---

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
    if (!res.ok) throw new Error('Failed to fetch applications from database');
    return await res.json();
  },

  addApplication: async (app: LoanApplication): Promise<void> => {
    const res = await fetch(`${API_URL}/api/applications`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(app)
    });
    if (!res.ok) throw new Error('Failed to add application to database');
  },

  // -- Testimonials --
  getTestimonials: async (): Promise<Testimonial[]> => {
    // Database is the source of truth
    const res = await fetch(`${API_URL}/api/testimonials`);
    if (!res.ok) throw new Error('Failed to fetch testimonials from database');
    return await res.json();
  },

  updateTestimonial: async (updated: Testimonial): Promise<void> => {
    const res = await fetch(`${API_URL}/api/testimonials/${updated.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('Failed to update testimonial in database');
  },

  saveTestimonials: async (data: Testimonial[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/testimonials`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save testimonials to database');
  },

  // -- Qualified Persons --
  getQualified: async (): Promise<QualifiedPerson[]> => {
    const res = await fetch(`${API_URL}/api/qualified`);
    if (!res.ok) throw new Error('Failed to fetch qualified persons from database');
    return await res.json();
  },

  saveQualified: async (data: QualifiedPerson[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/qualified`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save qualified persons to database');
  },

  // -- Ads --
  getAds: async (): Promise<AdConfig> => {
    const res = await fetch(`${API_URL}/api/ads`);
    if (!res.ok) throw new Error('Failed to fetch ads from database');
    return await res.json();
  },

  saveAds: async (data: AdConfig): Promise<void> => {
    const res = await fetch(`${API_URL}/api/ads`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save ads to database');
  },

  // -- Admins --
  getAdmins: async (): Promise<AdminUser[]> => {
    const res = await fetch(`${API_URL}/api/admins`);
    if (!res.ok) throw new Error('Failed to fetch admins from database');
    return await res.json();
  },

  saveAdmins: async (data: AdminUser[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/admins`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save admins to database');
  },

  // -- Repayment Content --
  getRepaymentContent: async (): Promise<RepaymentContent> => {
    const res = await fetch(`${API_URL}/api/content/repayment`);
    if (!res.ok) throw new Error('Failed to fetch repayment content from database');
    return await res.json();
  },

  saveRepaymentContent: async (data: RepaymentContent): Promise<void> => {
    const res = await fetch(`${API_URL}/api/content/repayment`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save repayment content to database');
  },

  // -- Auth --
  login: async (username: string, password: string): Promise<AdminUser | null> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, password })
    });
    if (res.ok) return await res.json();
    if (res.status === 401) return null; // Invalid credentials
    throw new Error('Failed to authenticate with database');
  },

  // -- Referral (Client-side mostly) --
  getMyReferralData: (): ReferralData => {
    return getLocal(KEYS.REFERRAL_LOCAL, {
      code: 'GRANT-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      points: 0
    });
  }
};
