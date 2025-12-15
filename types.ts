export enum LoanType {
  STANDARD = 'Standard',
  FAST_TRACK = 'Fast-Track'
}

export enum ApplicationStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
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
  type: LoanType;
  repaymentAmount: number;
  durationMonths: number;
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