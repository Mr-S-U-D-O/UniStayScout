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
};

export type AuthSession = {
  user: AuthUser;
  token: string;
};

export type DashboardCard = {
  label: string;
  value: string;
};

export type WizardStep = 'basics' | 'pricing' | 'amenities' | 'review';
