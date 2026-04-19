import { 
  LoanApplication, 
  Testimonial, 
  QualifiedPerson, 
  AdConfig, 
  AdminUser, 
  UserRole,
  RepaymentContent,
  ReferralData,
  LoanProvider,
  LoanProviderSubmission,
  BlogPost,
  BlogComment,
  ProviderReview,
  ReactionType,
  ContentFlag,
  ContactMessage
} from '../types';



// --- CONFIGURATION ---
// For Vercel deployment: API routes are automatically available at /api/* (same origin)
// For local development: set VITE_API_URL to your local server (e.g., http://localhost:3000)
// When deployed to Vercel, leave VITE_API_URL empty to use same-origin API routes
const API_URL = import.meta.env.VITE_API_URL || ''; 

const getAdminSessionHeader = (): string | null => {
  try {
    const raw = localStorage.getItem('admin_session');
    if (!raw) return null;
    // Send as base64(JSON) so the server can parse consistently.
    return btoa(unescape(encodeURIComponent(raw)));
  } catch {
    return null;
  }
};

const decodeUploadError = async (res: Response): Promise<string> => {
  try {
    const data = await res.json();
    const err = String(data?.error || res.statusText || 'Upload failed');
    const connectUrl = String(data?.connectUrl || '');
    return connectUrl ? `${err} (connect: ${connectUrl})` : err;
  } catch {
    return String(res.statusText || 'Upload failed');
  }
};

const uploadToOneDriveSession = async (uploadUrl: string, file: File): Promise<any> => {
  // OneDrive upload sessions require chunked upload for larger files.
  // We'll chunk everything to keep logic consistent.
  const chunkSize = 3.2 * 1024 * 1024; // 3.2MB
  let start = 0;

  while (start < file.size) {
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
      },
      body: chunk,
    });

    if (res.status === 202) {
      // Continue
      start = end;
      continue;
    }

    if (res.ok) {
      // Final response contains item metadata
      const data = await res.json().catch(() => ({}));
      return data;
    }

    throw new Error('Failed to upload image');
  }

  throw new Error('Failed to upload image');
};

const uploadToGDriveSession = async (uploadUrl: string, file: File): Promise<any> => {
  // Google Drive resumable upload: a single PUT with the file completes the upload.
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!res.ok) throw new Error('Failed to upload image');
  const data = await res.json().catch(() => ({}));
  return data;
};

const getOrCreateAnonUserId = (): string => {
  try {
    const key = 'grantify_uid';
    let id = localStorage.getItem(key);
    if (!id) {
      const random = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? (globalThis.crypto as Crypto).randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      id = random;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }
};

export const getAnonUserId = (): string => getOrCreateAnonUserId();

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
  body: '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5375979347378755" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>',
  sidebar: '<div style="background:#eee; height:250px; display:flex; align-items:center; justify-content:center; color:#666;">Sidebar Ad (300x250)</div>',
  footer: '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-5375979347378755" data-ad-slot="0987654321" data-ad-format="auto" data-full-width-responsive="true"></ins>',
  promo1Link: '',
  promo1Text: '',
  promo2Link: '',
  promo2Text: ''
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
  { id: '1', username: 'admin', passwordHash: '', role: UserRole.SUPER_ADMIN, name: 'Super Admin' },
  { id: '2', username: 'staff', passwordHash: '', role: UserRole.FLOOR_ADMIN, name: 'Staff' }
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

  // -- Autoblog Config --
  getAutoblogConfig: async (): Promise<{
    enabled: boolean;
    updatedAt?: string | null;
    lastRun?: any;
    lastSuccessRun?: any;
    lastErrorRun?: any;
  }> => {
    const res = await fetch(`${API_URL}/api/config?type=autoblog`);
    if (!res.ok) throw new Error('Failed to fetch autoblog config');
    return await res.json();
  },

  // -- Offsite Uploads (S3/R2 via presigned PUT) --
  uploadImage: async (file: File, opts?: { folder?: string }): Promise<string> => {
    if (!file || !(file instanceof File)) throw new Error('Missing file');
    if (!file.type?.startsWith('image/')) throw new Error('Only image uploads are supported');
    if (file.size > 8 * 1024 * 1024) throw new Error('Image is too large (max 8MB)');

    const adminHeader = getAdminSessionHeader();
    if (!adminHeader) throw new Error('Admin session missing');

    const presignRes = await fetch(`${API_URL}/api/uploads/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Session': adminHeader,
      },
      body: JSON.stringify({
        filename: file.name || 'image.png',
        contentType: file.type,
        folder: opts?.folder || 'blog-images',
      }),
    });

    if (!presignRes.ok) {
      // Preserve connectUrl if present (OneDrive flow)
      let data: any = null;
      try { data = await presignRes.json(); } catch { data = null; }
      const msg = String(data?.error || presignRes.statusText || 'Upload failed');
      const err: any = new Error(msg);
      if (data?.connectUrl) err.connectUrl = String(data.connectUrl);
      throw err;
    }

    const presign = await presignRes.json();
    const uploadUrl = String(presign?.uploadUrl || '');
    const provider = String(presign?.provider || 's3');
    const publicUrl = String(presign?.publicUrl || '');
    if (!uploadUrl) throw new Error('Invalid upload response');

    if (provider === 'gdrive') {
      const item = await uploadToGDriveSession(uploadUrl, file);
      const fileId = String(item?.id || '').trim();
      if (!fileId) throw new Error('Google Drive upload succeeded but file id is missing');

      const finalizeRes = await fetch(`${API_URL}/api/uploads/gdrive/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Session': adminHeader,
        },
        body: JSON.stringify({ fileId }),
      });

      if (!finalizeRes.ok) {
        const msg = await decodeUploadError(finalizeRes);
        throw new Error(msg);
      }

      const fin = await finalizeRes.json();
      const finUrl = String(fin?.publicUrl || '');
      if (!finUrl) throw new Error('Missing Google Drive publicUrl');
      return finUrl;
    }

    if (provider === 'onedrive') {
      const item = await uploadToOneDriveSession(uploadUrl, file);
      const itemId = String(item?.id || '').trim();
      if (!itemId) throw new Error('OneDrive upload succeeded but item id is missing');

      const finalizeRes = await fetch(`${API_URL}/api/uploads/onedrive/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Session': adminHeader,
        },
        body: JSON.stringify({ itemId }),
      });

      if (!finalizeRes.ok) {
        const msg = await decodeUploadError(finalizeRes);
        throw new Error(msg);
      }

      const fin = await finalizeRes.json();
      const finUrl = String(fin?.publicUrl || '');
      if (!finUrl) throw new Error('Missing OneDrive publicUrl');
      return finUrl;
    }

    if (!publicUrl) throw new Error('Invalid upload response');

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error('Failed to upload image');

    return publicUrl;
  },

  getDriveStatus: async (): Promise<{ enabled: boolean; provider: string; connected: boolean }> => {
    const adminHeader = getAdminSessionHeader();
    if (!adminHeader) throw new Error('Admin session missing');

    const res = await fetch(`${API_URL}/api/uploads/gdrive/status`, {
      method: 'GET',
      headers: {
        'X-Admin-Session': adminHeader,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch Drive status');
    const data = await res.json();
    return {
      enabled: Boolean(data?.enabled),
      provider: String(data?.provider || ''),
      connected: Boolean(data?.connected),
    };
  },

  setAutoblogEnabled: async (enabled: boolean): Promise<{ success: boolean; enabled: boolean }> => {
    const res = await fetch(`${API_URL}/api/config?type=autoblog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to update autoblog config');
    return await res.json();
  },

  // -- Applications --
  getRecentApplicantsTicker: async (): Promise<Array<{ id: string; fullName: string }>> => {
    const res = await fetch(`${API_URL}/api/leads?type=applications&public=1`);
    if (!res.ok) throw new Error('Failed to fetch recent applicants from API');
    return await res.json();
  },

  getApplicationStats: async (): Promise<{ applicationsCount: number; totalRequestedAmount: number }> => {
    const res = await fetch(`${API_URL}/api/leads?type=applications&stats=1`);
    if (!res.ok) throw new Error('Failed to fetch application stats from API');
    return await res.json();
  },

  getApplications: async (): Promise<LoanApplication[]> => {
    const res = await fetch(`${API_URL}/api/leads?type=applications`);
    if (!res.ok) throw new Error('Failed to fetch applications from API');
    return await res.json();
  },

  addApplication: async (app: LoanApplication): Promise<void> => {
    const res = await fetch(`${API_URL}/api/leads?type=applications`, {
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

  addTestimonial: async (testimonial: Testimonial): Promise<void> => {
    const res = await fetch(`${API_URL}/api/testimonials`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(testimonial)
    });
    if (!res.ok) throw new Error('Failed to submit testimonial via API');
  },

  // -- Qualified Persons --
  getQualified: async (): Promise<QualifiedPerson[]> => {
    const res = await fetch(`${API_URL}/api/leads?type=qualified`);
    if (!res.ok) throw new Error('Failed to fetch qualified persons from API');
    const data = await res.json();
    return data;
  },

  saveQualified: async (data: QualifiedPerson[]): Promise<void> => {
    const res = await fetch(`${API_URL}/api/leads?type=qualified`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save qualified persons via API');
  },

  // -- Ads --
  getAds: async (): Promise<AdConfig> => {
    const res = await fetch(`${API_URL}/api/config?type=ads`);
    if (!res.ok) throw new Error('Failed to fetch ads from API');
    return await res.json();
  },

  saveAds: async (data: AdConfig): Promise<void> => {
    const res = await fetch(`${API_URL}/api/config?type=ads`, {
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
    const res = await fetch(`${API_URL}/api/config?type=repayment`);
    if (!res.ok) throw new Error('Failed to fetch repayment content from API');
    return await res.json();
  },

  saveRepaymentContent: async (data: RepaymentContent): Promise<void> => {
    const res = await fetch(`${API_URL}/api/config?type=repayment`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save repayment content via API');
  },

  // -- Auth --
  login: async (username: string, password: string): Promise<AdminUser | null> => {
    const res = await fetch(`${API_URL}/api/admins?action=login`, {
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
  },

  // -- Loan Provider Submissions (public suggestions queue) --
  getLoanProviderSubmissions: async (status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<LoanProviderSubmission[]> => {
    const res = await fetch(`${API_URL}/api/loan_provider_submissions?status=${encodeURIComponent(status)}`);
    if (!res.ok) throw new Error('Failed to fetch loan provider submissions');
    return await res.json();
  },

  submitLoanProviderSubmission: async (data: Partial<LoanProvider>): Promise<{ success: boolean; id: string }> => {
    const res = await fetch(`${API_URL}/api/loan_provider_submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit loan provider suggestion');
    return await res.json();
  },

  updateLoanProviderSubmissionStatus: async (id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> => {
    const res = await fetch(`${API_URL}/api/loan_provider_submissions?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update submission status');
  },

  // -- Blog --
  getBlogPosts: async (category?: string): Promise<BlogPost[]> => {
    const url = category ? `${API_URL}/api/blog?category=${category}` : `${API_URL}/api/blog`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch blog posts');
    return await res.json();
  },

  getBlogPost: async (id: string, opts?: { commentsSort?: 'oldest' | 'newest' | 'helpful'; includeHidden?: boolean }): Promise<BlogPost & { comments: BlogComment[] }> => {
    const qs = new URLSearchParams({ id });
    if (opts?.commentsSort) qs.set('commentsSort', opts.commentsSort);
    if (opts?.includeHidden) qs.set('includeHidden', '1');
    const res = await fetch(`${API_URL}/api/blog?${qs.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch blog post');
    return await res.json();
  },

  submitBlogAction: async (data: any): Promise<any> => {
    const payload = { ...(data || {}) };
    if (payload?.action === 'comment' || payload?.action === 'likeComment') {
      if (!payload.userId) payload.userId = getOrCreateAnonUserId();
    }
    const method = data.action === 'update' ? 'PUT' : 'POST';
    const res = await fetch(`${API_URL}/api/blog`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to perform blog action');
    }
    return await res.json();
  },

  reactToBlogPost: async (postId: string, reactionType: ReactionType): Promise<{ likes: number; loves: number; claps: number; myReaction: ReactionType | null }> => {
    const userId = getOrCreateAnonUserId();
    const res = await fetch(`${API_URL}/api/blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'react', postId, userId, reactionType })
    });
    if (!res.ok) throw new Error('Failed to react to blog post');
    return await res.json();
  },

  deleteBlogPost: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/blog?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete blog post');
  },

  // -- Provider Reviews --
  getProviderReviews: async (providerId?: number, opts?: { sort?: 'newest' | 'oldest' | 'helpful'; includeHidden?: boolean }): Promise<ProviderReview[]> => {
    const qs = new URLSearchParams();
    if (providerId !== undefined) qs.set('providerId', String(providerId));
    if (opts?.sort) qs.set('sort', opts.sort);
    if (opts?.includeHidden) qs.set('includeHidden', '1');
    const url = `${API_URL}/api/provider_reviews${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch reviews from API');
    return await res.json();
  },

  addProviderReview: async (review: Partial<ProviderReview>): Promise<void> => {
    const payload = { ...(review || {}), userId: getOrCreateAnonUserId() };
    const res = await fetch(`${API_URL}/api/provider_reviews`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to post review via API');
    }
  },

  toggleProviderReviewLike: async (reviewId: string): Promise<{ likes: number; liked: boolean }> => {
    const res = await fetch(`${API_URL}/api/provider_reviews`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'like', reviewId, userId: getOrCreateAnonUserId() })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to update helpful vote');
    }
    return await res.json();
  },

  toggleProviderReviewDislike: async (reviewId: string): Promise<{ dislikes: number; disliked: boolean }> => {
    const res = await fetch(`${API_URL}/api/provider_reviews`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'dislike', reviewId, userId: getOrCreateAnonUserId() })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to update not-helpful vote');
    }
    return await res.json();
  },

  // -- Moderation Flags --
  flagContent: async (data: { entityType: 'blog_comment' | 'provider_review'; entityId: string; reason?: string; details?: string }): Promise<void> => {
    const res = await fetch(`${API_URL}/api/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: getOrCreateAnonUserId() })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to submit flag');
    }
  },

  getFlags: async (status: 'open' | 'resolved' = 'open'): Promise<{ flags: ContentFlag[]; entities: Record<string, any> }> => {
    const res = await fetch(`${API_URL}/api/flags?status=${encodeURIComponent(status)}`);
    if (!res.ok) throw new Error('Failed to fetch flags');
    return await res.json();
  },

  resolveFlag: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/flags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', id })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to resolve flag');
    }
  },

  setHidden: async (data: { entityType: 'blog_comment' | 'provider_review'; entityId: string; hidden: boolean }): Promise<void> => {
    const res = await fetch(`${API_URL}/api/flags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setHidden', ...data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Failed to update hidden status');
    }
  },

  deleteProviderReview: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/provider_reviews?id=${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete review via API');
  },

  // -- Contact --
  submitContactMessage: async (data: { name: string; email: string; phone?: string; subject: string; message: string }): Promise<void> => {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit contact message');
  },

  getContactMessages: async (limit = 100): Promise<ContactMessage[]> => {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const res = await fetch(`${API_URL}/api/contact?limit=${encodeURIComponent(String(safeLimit))}`);
    if (!res.ok) throw new Error('Failed to fetch contact messages');
    return await res.json();
  }
};
