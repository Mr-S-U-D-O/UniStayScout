export type UserRole = 'student' | 'landlord' | 'admin';

export interface School {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface ListingPin {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  monthlyPrice: number;
  currency: string;
  distanceKm: number;
}
