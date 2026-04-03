// Shared domain types for UniStayScout

export type Role = 'student' | 'landlord' | 'admin';
export type AuthRole = 'student' | 'landlord' | 'admin';

export type School = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  source?: 'seed' | 'osm';
  address?: string;
};

export type Listing = {
  id: string;
  landlordId: string;
  landlordName: string;
  title: string;
  description: string;
  schoolId: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  price: number;
  currency: string;
  roomType: 'private' | 'shared';
  amenities: string[];
  photos: string[];
  isVerified: boolean;
  availableBeds: number;
  status: 'pending' | 'approved' | 'rejected';
  adminComment: string;
  distanceKm: number;
  views: number;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Interest = {
  id: string;
  listingTitle: string;
  studentName: string;
  studentPhone: string;
  createdAt: string;
  studentNote: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  message: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AuthRole;
  landlordId?: string;
  profileComplete?: boolean;
  isSuperUser?: boolean;
};

export type AuthSession = {
  user: AuthUser;
  token: string;
};

export type DashboardCard = {
  label: string;
  value: string;
};

export type LandlordInsights = {
  activeListings: number;
  pendingReview: number;
  approvedListings: number;
  rejectedListings: number;
  unverifiedListings: number;
  avgMonthlyPrice: number;
  totalViews: number;
  leadVolume: number;
  conversionRatePct: number;
};

export type AdminInsights = {
  pendingModeration: number;
  totalListings: number;
  studentLeads: number;
  stalePendingCount: number;
  recentLeads: number;
  highPriorityQueue: number;
  totalAdmins: number;
  totalLandlords: number;
  totalStudents: number;
  adminSelectionPolicy: string;
  adminSelfRegistrationEnabled: boolean;
};

export type WizardStep = 'basics' | 'pricing' | 'amenities' | 'review';

// ─── Rich Profile Types ────────────────────────────────────────────────────

export type LifestyleTag = 'quiet' | 'social' | 'night-owl' | 'early-riser' | 'pet-friendly' | 'study-focused';
export type TransportMode = 'walking' | 'public-transport' | 'own-car';
export type SecurityPriority = 'low' | 'medium' | 'high';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export type StudentProfile = {
  role: 'student';
  avatarUrl: string;
  bio: string;
  university: string;
  yearOfStudy: number;         // 1–6
  moveInDate: string;          // ISO date string YYYY-MM-DD
  budgetMin: number;
  budgetMax: number;
  roomType: 'private' | 'shared' | 'any';
  lifestyle: LifestyleTag[];
  transportMode: TransportMode;
  securityPriority: SecurityPriority;
  preferredAmenities: string[];
  specialNeeds: string;        // free text — accessibility, dietary, etc.
};

export type LandlordProfile = {
  role: 'landlord';
  avatarUrl: string;
  bio: string;
  businessName: string;
  whatsapp: string;
  responseTime: string;        // e.g. "within 1 hour"
  propertiesManaged: number;
  verificationStatus: VerificationStatus;
};

export type AdminProfile = {
  role: 'admin';
  avatarUrl: string;
  bio: string;
  department: string;
};

export type UserProfile = StudentProfile | LandlordProfile | AdminProfile;

export function makeEmptyStudentProfile(): StudentProfile {
  return {
    role: 'student',
    avatarUrl: '',
    bio: '',
    university: '',
    yearOfStudy: 1,
    moveInDate: '',
    budgetMin: 2000,
    budgetMax: 5000,
    roomType: 'any',
    lifestyle: [],
    transportMode: 'walking',
    securityPriority: 'medium',
    preferredAmenities: [],
    specialNeeds: '',
  };
}

export function makeEmptyLandlordProfile(): LandlordProfile {
  return {
    role: 'landlord',
    avatarUrl: '',
    bio: '',
    businessName: '',
    whatsapp: '',
    responseTime: 'within 24 hours',
    propertiesManaged: 1,
    verificationStatus: 'unverified',
  };
}

export function makeEmptyAdminProfile(): AdminProfile {
  return {
    role: 'admin',
    avatarUrl: '',
    bio: '',
    department: '',
  };
}
