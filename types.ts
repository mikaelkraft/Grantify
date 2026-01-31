export enum LoanType {
  GRANT = 'Grant Recommendation',
  BUSINESS_LOAN = 'Business Loan',
  FAST_TRACK = 'Fast-Track Verification'
}

export enum ApplicationStatus {
  PENDING = 'Processing',
  MATCHED = 'Grant Matched',
  VERIFIED = 'Verified',
  DISBURSED = 'Disbursed',
  REJECTED = 'Rejected'
}

export interface LoanApplication {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  country: string;
  amount: number;
  purpose: string;
  businessType?: string;
  matchedNetwork?: string;
  type: LoanType;
  repaymentAmount?: number;
  durationMonths?: number;
  status: ApplicationStatus;
  dateApplied: string;
  referralCode?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  image: string;
  amount: number;
  content: string;
  likes: number;
  loves: number;
  claps: number;
  date: string;
  status?: 'approved' | 'pending'; // For user-submitted testimonials
}

export interface QualifiedPerson {
  id: string;
  name: string;
  amount: number;
  status: 'Contacted' | 'Pending' | 'Disbursed';
  notes: string;
}

export interface AdConfig {
  head: string;
  header: string;
  body: string;
  sidebar: string;
  footer: string;
  promo1Link?: string;
  promo1Text?: string;
  promo2Link?: string;
  promo2Text?: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FLOOR_ADMIN = 'FLOOR_ADMIN'
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string; // In a real app, never store plain text, even in prototypes
  role: UserRole;
  name: string;
}

export interface RepaymentContent {
  introText: string;
  standardNote: string;
  fastTrackNote: string;
}

export interface ReferralData {
  code: string;
  points: number;
}

export interface LoanProvider {
  id?: number;
  name: string;
  description: string;
  loanRange: string;
  interestRange: string;
  tenure: string;
  website: string;
  playStoreUrl?: string;
  tag?: string;
  rating?: number;
  requirements?: string;
  isRecommended?: boolean;
}

export interface ProviderReview {
  id: string;
  providerId: number;
  name: string;
  rating: number;
  content: string;
  parentId?: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  image?: string;
  category: string;
  likes: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  name: string;
  content: string;
  likes: number;
  parentId?: string;
  createdAt: string;
}

export interface GrantNetwork {
  id: string;
  name: string;
  description: string;
  logo: string;
  keywords: string[];
  link: string;
}

// Ad network type definitions for window object
declare global {
  interface Window {
    // Custom window properties if needed
  }
}