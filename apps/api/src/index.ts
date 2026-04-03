import cors from 'cors';
import express from 'express';
import type { Response } from 'express';
import crypto from 'crypto';
import { compareSync, hashSync } from 'bcryptjs';
import { Pool } from 'pg';

const app = express();
const port = Number(process.env.PORT || 4000);

type UserRole = 'student' | 'landlord' | 'admin';

type School = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  source?: 'seed' | 'osm';
  address?: string;
};

type ListingStatus = 'pending' | 'approved' | 'rejected';

type Listing = {
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
  status: ListingStatus;
  adminComment: string;
  createdAt: string;
  updatedAt: string;
  views: number;
};

type Interest = {
  id: string;
  listingId: string;
  studentUserId?: string;
  studentName: string;
  studentPhone: string;
  studentNote: string;
  createdAt: string;
};

type Review = {
  id: string;
  listingId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type StudentProfile = {
  name: string;
  budget?: number;
  roomType?: 'private' | 'shared' | 'any';
};

type MapContext = {
  schoolId?: string;
  radiusKm?: number;
};

type AccountRole = 'student' | 'landlord' | 'admin';

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: AccountRole;
  landlordId?: string;
  createdAt: string;
};

type AuthRateBucket = {
  count: number;
  resetAt: number;
};

type AuthContext = {
  account: Account;
  role: AccountRole;
};

type AccountRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: AccountRole;
  landlord_id: string | null;
  created_at: string;
};

type ListingRow = {
  id: string;
  landlord_id: string;
  landlord_name: string;
  title: string;
  description: string;
  school_id: string;
  location_label: string;
  latitude: number;
  longitude: number;
  price: number;
  currency: string;
  room_type: 'private' | 'shared';
  amenities: string[];
  photos: string[];
  is_verified: boolean;
  available_beds: number;
  status: ListingStatus;
  admin_comment: string;
  created_at: string;
  updated_at: string;
  views: number;
};

type ListingDistanceRow = ListingRow & {
  distance_km: number;
};

type InterestRow = {
  id: string;
  listing_id: string;
  student_user_id: string | null;
  student_name: string;
  student_phone: string;
  student_note: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  listing_id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
};

const seedSchools: School[] = [
  {
    id: 'uj-auckland-park',
    name: 'University of Johannesburg - Auckland Park',
    city: 'Johannesburg',
    latitude: -26.1829,
    longitude: 27.9994,
    source: 'seed'
  },
  {
    id: 'wits-braamfontein',
    name: 'University of the Witwatersrand - Braamfontein',
    city: 'Johannesburg',
    latitude: -26.1929,
    longitude: 28.0305,
    source: 'seed'
  }
];

let schools: School[] = [...seedSchools];

const seedListings: Listing[] = [
  {
    id: 'lst-1',
    landlordId: 'landlord-1',
    landlordName: 'Bright Rooms SA',
    title: 'Melville Student Loft',
    description: 'Private room with study desk, fast wifi, and secure access.',
    schoolId: 'uj-auckland-park',
    locationLabel: 'Melville, Johannesburg',
    latitude: -26.1807,
    longitude: 28.0008,
    price: 4200,
    currency: 'ZAR',
    roomType: 'private',
    amenities: ['wifi', 'laundry', 'security'],
    photos: ['https://picsum.photos/seed/unistay1/640/420'],
    isVerified: true,
    availableBeds: 2,
    status: 'approved',
    adminComment: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 24
  },
  {
    id: 'lst-2',
    landlordId: 'landlord-2',
    landlordName: 'Campus Living Hub',
    title: 'Auckland Shared House',
    description: 'Shared accommodation with spacious kitchen and backup power.',
    schoolId: 'uj-auckland-park',
    locationLabel: 'Auckland Park, Johannesburg',
    latitude: -26.186,
    longitude: 27.995,
    price: 3100,
    currency: 'ZAR',
    roomType: 'shared',
    amenities: ['wifi', 'backup-power', 'parking'],
    photos: ['https://picsum.photos/seed/unistay2/640/420'],
    isVerified: false,
    availableBeds: 4,
    status: 'pending',
    adminComment: 'Please upload at least 3 interior photos.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 8
  },
  {
    id: 'lst-3',
    landlordId: 'landlord-3',
    landlordName: 'Braam Student Homes',
    title: 'Braamfontein Studio Pods',
    description: 'Compact private pods with quiet floors and controlled access.',
    schoolId: 'wits-braamfontein',
    locationLabel: 'Braamfontein, Johannesburg',
    latitude: -26.1937,
    longitude: 28.0279,
    price: 5300,
    currency: 'ZAR',
    roomType: 'private',
    amenities: ['wifi', 'security', 'laundry', 'backup-power'],
    photos: ['https://picsum.photos/seed/unistay3/640/420'],
    isVerified: true,
    availableBeds: 3,
    status: 'approved',
    adminComment: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 37
  },
  {
    id: 'lst-4',
    landlordId: 'landlord-1',
    landlordName: 'Bright Rooms SA',
    title: 'Auckland Women-Only Shared Flat',
    description: 'Secure shared flat with biometric access and walkable campus route.',
    schoolId: 'uj-auckland-park',
    locationLabel: 'Auckland Park, Johannesburg',
    latitude: -26.1844,
    longitude: 28.0036,
    price: 3600,
    currency: 'ZAR',
    roomType: 'shared',
    amenities: ['wifi', 'security', 'parking'],
    photos: ['https://picsum.photos/seed/unistay4/640/420'],
    isVerified: true,
    availableBeds: 5,
    status: 'approved',
    adminComment: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 19
  },
  {
    id: 'lst-5',
    landlordId: 'landlord-4',
    landlordName: 'Metro Student Rentals',
    title: 'Wits Shared Loft Block',
    description: 'Shared lofts with study lounge and 24/7 concierge.',
    schoolId: 'wits-braamfontein',
    locationLabel: 'Braamfontein, Johannesburg',
    latitude: -26.1912,
    longitude: 28.0338,
    price: 4100,
    currency: 'ZAR',
    roomType: 'shared',
    amenities: ['wifi', 'laundry', 'security'],
    photos: ['https://picsum.photos/seed/unistay5/640/420'],
    isVerified: false,
    availableBeds: 6,
    status: 'approved',
    adminComment: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 11
  },
  {
    id: 'lst-6',
    landlordId: 'landlord-2',
    landlordName: 'Campus Living Hub',
    title: 'Melville Premium Private Room',
    description: 'Premium private room with ensuite, fast wifi, and cleaning service.',
    schoolId: 'uj-auckland-park',
    locationLabel: 'Melville, Johannesburg',
    latitude: -26.1789,
    longitude: 28.0047,
    price: 6200,
    currency: 'ZAR',
    roomType: 'private',
    amenities: ['wifi', 'laundry', 'security', 'backup-power', 'parking'],
    photos: ['https://picsum.photos/seed/unistay6/640/420'],
    isVerified: true,
    availableBeds: 1,
    status: 'approved',
    adminComment: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 42
  }
];

let listings: Listing[] = [...seedListings];
let interests: Interest[] = [];
let reviews: Review[] = [];

const seedAccounts: Account[] = [
  {
    id: 'usr-admin-1',
    name: 'System Admin',
    email: 'admin@unistayscout.local',
    phone: '+27 11 000 0001',
    passwordHash: hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-landlord-1',
    name: 'Bright Rooms SA',
    email: 'landlord@unistayscout.local',
    phone: '+27 11 000 0002',
    passwordHash: hashSync('landlord123', 10),
    role: 'landlord',
    landlordId: 'landlord-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-student-1',
    name: 'Lerato Student',
    email: 'student@unistayscout.local',
    phone: '+27 71 000 1234',
    passwordHash: hashSync('student123', 10),
    role: 'student',
    createdAt: new Date().toISOString()
  }
];

let accounts: Account[] = [...seedAccounts];

const sseClients = new Set<Response>();
const authRateBuckets = new Map<string, AuthRateBucket>();
let schoolDirectoryRefreshPromise: Promise<void> | null = null;
const tokenSecret = process.env.AUTH_TOKEN_SECRET || 'unistayscout-dev-secret';
const tokenTtlSeconds = 60 * 60 * 12;
const databaseUrl = process.env.DATABASE_URL;
const dbPool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

function fromAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    landlordId: row.landlord_id || undefined,
    createdAt: row.created_at
  };
}

function fromListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    landlordName: row.landlord_name,
    title: row.title,
    description: row.description,
    schoolId: row.school_id,
    locationLabel: row.location_label,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    price: Number(row.price),
    currency: row.currency,
    roomType: row.room_type,
    amenities: row.amenities || [],
    photos: row.photos || [],
    isVerified: Boolean(row.is_verified),
    availableBeds: Number(row.available_beds),
    status: row.status,
    adminComment: row.admin_comment || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    views: Number(row.views)
  };
}

function fromListingDistanceRow(row: ListingDistanceRow): Listing & { distanceKm: number } {
  return {
    ...fromListingRow(row),
    distanceKm: Number(row.distance_km)
  };
}

function fromInterestRow(row: InterestRow): Interest {
  return {
    id: row.id,
    listingId: row.listing_id,
    studentUserId: row.student_user_id || undefined,
    studentName: row.student_name,
    studentPhone: row.student_phone,
    studentNote: row.student_note,
    createdAt: row.created_at
  };
}

function fromReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    listingId: row.listing_id,
    author: row.author,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at
  };
}

async function initializeAccountStore(): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'landlord', 'admin')),
      landlord_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const countResult = await dbPool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM accounts;');
  const rowCount = Number(countResult.rows[0]?.count || '0');

  if (rowCount === 0) {
    for (const account of seedAccounts) {
      await dbPool.query(
        `
        INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `,
        [
          account.id,
          account.name,
          account.email,
          account.phone,
          account.passwordHash,
          account.role,
          account.landlordId || null,
          account.createdAt
        ]
      );
    }
  }

  const rowsResult = await dbPool.query<AccountRow>(`
    SELECT id, name, email, phone, password_hash, role, landlord_id, created_at
    FROM accounts
    ORDER BY created_at ASC;
  `);

  accounts = rowsResult.rows.map(fromAccountRow);
}

async function persistAccount(account: Account): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(
    `
      INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `,
    [
      account.id,
      account.name,
      account.email,
      account.phone,
      account.passwordHash,
      account.role,
      account.landlordId || null,
      account.createdAt
    ]
  );
}

async function initializeMarketplaceStore(): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      landlord_id TEXT NOT NULL,
      landlord_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      school_id TEXT NOT NULL,
      location_label TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      location_geom geometry(Point, 4326),
      price NUMERIC(12, 2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ZAR',
      room_type TEXT NOT NULL CHECK (room_type IN ('private', 'shared')),
      amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      available_beds INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      views INTEGER NOT NULL DEFAULT 0
    );
  `);

  await dbPool.query(`
    ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);
  `);

  await dbPool.query(`
    UPDATE listings
    SET location_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE location_geom IS NULL;
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_listings_location_geom
    ON listings USING GIST (location_geom);
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_listings_school_status
    ON listings (school_id, status);
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS interests (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      student_user_id TEXT,
      student_name TEXT NOT NULL,
      student_phone TEXT NOT NULL,
      student_note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  const listingCountResult = await dbPool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM listings;');
  const listingCount = Number(listingCountResult.rows[0]?.count || '0');

  if (listingCount === 0) {
    for (const listing of seedListings) {
      await dbPool.query(
        `
          INSERT INTO listings (
            id, landlord_id, landlord_name, title, description, school_id, location_label,
            latitude, longitude, location_geom, price, currency, room_type, amenities, photos,
            is_verified, available_beds, status, admin_comment, created_at, updated_at, views
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, ST_SetSRID(ST_MakePoint($9, $8), 4326), $10, $11, $12, $13::jsonb, $14::jsonb,
            $15, $16, $17, $18, $19, $20, $21
          );
        `,
        [
          listing.id,
          listing.landlordId,
          listing.landlordName,
          listing.title,
          listing.description,
          listing.schoolId,
          listing.locationLabel,
          listing.latitude,
          listing.longitude,
          listing.price,
          listing.currency,
          listing.roomType,
          JSON.stringify(listing.amenities),
          JSON.stringify(listing.photos),
          listing.isVerified,
          listing.availableBeds,
          listing.status,
          listing.adminComment,
          listing.createdAt,
          listing.updatedAt,
          listing.views
        ]
      );
    }
  }

  const listingRows = await dbPool.query<ListingRow>(`
    SELECT
      id, landlord_id, landlord_name, title, description, school_id, location_label,
      latitude, longitude, price, currency, room_type,
      amenities::jsonb AS amenities,
      photos::jsonb AS photos,
      is_verified, available_beds, status, admin_comment, created_at, updated_at, views
    FROM listings
    ORDER BY created_at ASC;
  `);

  listings = listingRows.rows.map(fromListingRow);

  const interestRows = await dbPool.query<InterestRow>(`
    SELECT id, listing_id, student_user_id, student_name, student_phone, student_note, created_at
    FROM interests
    ORDER BY created_at DESC;
  `);
  interests = interestRows.rows.map(fromInterestRow);

  const reviewRows = await dbPool.query<ReviewRow>(`
    SELECT id, listing_id, author, rating, comment, created_at
    FROM reviews
    ORDER BY created_at DESC;
  `);
  reviews = reviewRows.rows.map(fromReviewRow);
}

async function persistListing(listing: Listing): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(
    `
      INSERT INTO listings (
        id, landlord_id, landlord_name, title, description, school_id, location_label,
        latitude, longitude, location_geom, price, currency, room_type, amenities, photos,
        is_verified, available_beds, status, admin_comment, created_at, updated_at, views
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, ST_SetSRID(ST_MakePoint($9, $8), 4326), $10, $11, $12, $13::jsonb, $14::jsonb,
        $15, $16, $17, $18, $19, $20, $21
      );
    `,
    [
      listing.id,
      listing.landlordId,
      listing.landlordName,
      listing.title,
      listing.description,
      listing.schoolId,
      listing.locationLabel,
      listing.latitude,
      listing.longitude,
      listing.price,
      listing.currency,
      listing.roomType,
      JSON.stringify(listing.amenities),
      JSON.stringify(listing.photos),
      listing.isVerified,
      listing.availableBeds,
      listing.status,
      listing.adminComment,
      listing.createdAt,
      listing.updatedAt,
      listing.views
    ]
  );
}

async function persistListingModeration(listing: Listing): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(
    `
      UPDATE listings
      SET status = $2, admin_comment = $3, updated_at = $4
      WHERE id = $1;
    `,
    [listing.id, listing.status, listing.adminComment, listing.updatedAt]
  );
}

async function persistInterest(interest: Interest): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(
    `
      INSERT INTO interests (id, listing_id, student_user_id, student_name, student_phone, student_note, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `,
    [
      interest.id,
      interest.listingId,
      interest.studentUserId || null,
      interest.studentName,
      interest.studentPhone,
      interest.studentNote,
      interest.createdAt
    ]
  );
}

async function persistReview(review: Review): Promise<void> {
  if (!dbPool) {
    return;
  }

  await dbPool.query(
    `
      INSERT INTO reviews (id, listing_id, author, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6);
    `,
    [review.id, review.listingId, review.author, review.rating, review.comment, review.createdAt]
  );
}

async function queryListingsFromDatabase(options: {
  school: School;
  radiusKm: number;
  minPrice: number;
  maxPrice: number;
  roomTypeFilter: string;
  verifiedOnly: boolean;
  requiredAmenities: string[];
  role: UserRole;
  landlordId: string;
  sortBy: string;
}): Promise<Array<Listing & { distanceKm: number }>> {
  if (!dbPool) {
    return [];
  }

  const {
    school,
    radiusKm,
    minPrice,
    maxPrice,
    roomTypeFilter,
    verifiedOnly,
    requiredAmenities,
    role,
    landlordId,
    sortBy
  } = options;

  const params: unknown[] = [school.longitude, school.latitude, school.id, minPrice, maxPrice];
  const conditions: string[] = [
    'listings.school_id = $3',
    'listings.price >= $4',
    'listings.price <= $5'
  ];

  if (role === 'student') {
    params.push('approved');
    conditions.push(`listings.status = $${params.length}`);
  } else if (role === 'landlord') {
    params.push(landlordId);
    conditions.push(`listings.landlord_id = $${params.length}`);
  }

  if (roomTypeFilter === 'private' || roomTypeFilter === 'shared') {
    params.push(roomTypeFilter);
    conditions.push(`listings.room_type = $${params.length}`);
  }

  if (verifiedOnly) {
    conditions.push('listings.is_verified = TRUE');
  }

  if (requiredAmenities.length > 0) {
    params.push(JSON.stringify(requiredAmenities));
    conditions.push(`listings.amenities @> $${params.length}::jsonb`);
  }

  params.push(radiusKm * 1000);
  const radiusParamIndex = params.length;
  const listingGeomExpr = 'COALESCE(listings.location_geom, ST_SetSRID(ST_MakePoint(listings.longitude, listings.latitude), 4326))';
  conditions.push(
    `ST_DWithin(${listingGeomExpr}::geography, school_point.geom::geography, $${radiusParamIndex})`
  );

  const orderByClause =
    sortBy === 'price-asc'
      ? 'listings.price ASC'
      : sortBy === 'price-desc'
        ? 'listings.price DESC'
        : 'distance_km ASC';

  const query = `
    WITH school_point AS (
      SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
    )
    SELECT
      listings.id,
      listings.landlord_id,
      listings.landlord_name,
      listings.title,
      listings.description,
      listings.school_id,
      listings.location_label,
      listings.latitude,
      listings.longitude,
      listings.price,
      listings.currency,
      listings.room_type,
      listings.amenities::jsonb AS amenities,
      listings.photos::jsonb AS photos,
      listings.is_verified,
      listings.available_beds,
      listings.status,
      listings.admin_comment,
      listings.created_at,
      listings.updated_at,
      listings.views,
      ROUND((ST_DistanceSphere(${listingGeomExpr}, school_point.geom) / 1000.0)::numeric, 2)::float8 AS distance_km
    FROM listings
    CROSS JOIN school_point
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderByClause};
  `;

  const result = await dbPool.query<ListingDistanceRow>(query, params);
  return result.rows.map(fromListingDistanceRow);
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

type OSMElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type GeocodeResult = {
  label: string;
  latitude: number;
  longitude: number;
  city: string;
};

const osmUserAgent = 'UniStayScout/1.0 (local development)';
const johannesburgCenter = { lat: -26.2041, lon: 28.0473 };

function dedupeSchools(entries: School[]): School[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.id}:${entry.latitude}:${entry.longitude}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function toSchoolFromOsmElement(element: OSMElement): School | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const name = element.tags?.name || element.tags?.['name:en'];

  if (!name || latitude == null || longitude == null) {
    return null;
  }

  const addressParts = [element.tags?.['addr:housenumber'], element.tags?.['addr:street']].filter(Boolean);
  const address = addressParts.join(' ').trim();

  return {
    id: `osm-school-${element.id}`,
    name,
    city: element.tags?.['addr:city'] || 'Johannesburg',
    latitude,
    longitude,
    source: 'osm',
    address: address || undefined
  };
}

async function fetchOsmSchools(): Promise<School[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"school|university|college"](around:25000,${johannesburgCenter.lat},${johannesburgCenter.lon});
      way["amenity"~"school|university|college"](around:25000,${johannesburgCenter.lat},${johannesburgCenter.lon});
      relation["amenity"~"school|university|college"](around:25000,${johannesburgCenter.lat},${johannesburgCenter.lon});
    );
    out center tags;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json',
      'User-Agent': osmUserAgent
    },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { elements?: OSMElement[] };
  return (payload.elements || [])
    .map(toSchoolFromOsmElement)
    .filter((school): school is School => Boolean(school));
}

async function refreshSchoolDirectory(): Promise<void> {
  try {
    const liveSchools = await fetchOsmSchools();
    if (liveSchools.length > 0) {
      schools = dedupeSchools([...seedSchools, ...liveSchools]).sort((left, right) => left.name.localeCompare(right.name));
    }
  } catch {
    schools = [...seedSchools];
  }
}

function ensureSchoolDirectoryRefresh(): Promise<void> {
  if (!schoolDirectoryRefreshPromise) {
    schoolDirectoryRefreshPromise = refreshSchoolDirectory();
  }
  return schoolDirectoryRefreshPromise;
}

async function searchSchools(query: string): Promise<School[]> {
  const normalized = query.trim();
  if (!normalized) {
    await ensureSchoolDirectoryRefresh();
    return schools;
  }

  const localMatches = schools.filter((school) => school.name.toLowerCase().includes(normalized.toLowerCase()));
  if (localMatches.length >= 5) {
    return dedupeSchools(localMatches).slice(0, 10);
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: normalized,
      limit: '10',
      countrycodes: 'za',
      addressdetails: '1'
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': osmUserAgent
      }
    });

    if (!response.ok) {
      return dedupeSchools(localMatches).slice(0, 10);
    }

    const payload = (await response.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      class?: string;
      type?: string;
      address?: Record<string, string>;
    }>;

    const liveSchools = payload
      .filter((entry) => entry.class === 'amenity' || entry.type === 'school' || entry.type === 'university' || entry.type === 'college')
      .map((entry) => ({
        id: `osm-search-${entry.place_id}`,
        name: entry.display_name.split(',')[0] || entry.display_name,
        city: entry.address?.city || entry.address?.town || entry.address?.suburb || 'Johannesburg',
        latitude: Number(entry.lat),
        longitude: Number(entry.lon),
        source: 'osm' as const,
        address: entry.display_name
      }));

    return dedupeSchools([...localMatches, ...liveSchools]).slice(0, 10);
  } catch {
    return dedupeSchools(localMatches).slice(0, 10);
  }
}

async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const normalized = query.trim();
  if (!normalized) {
    return null;
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: normalized,
    limit: '1',
    addressdetails: '1',
    countrycodes: 'za'
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': osmUserAgent
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>;

  const match = payload[0];
  if (!match) {
    return null;
  }

  return {
    label: match.display_name,
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    city: match.address?.city || match.address?.town || match.address?.suburb || 'Johannesburg'
  };
}

function notify(event: string, payload: unknown): void {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
}

function toPublicAccount(account: Account) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    landlordId: account.landlordId
  };
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', tokenSecret).update(value).digest('base64url');
}

function createAccessToken(account: Account): string {
  const payload = JSON.stringify({
    userId: account.id,
    role: account.role,
    exp: Math.floor(Date.now() / 1000) + tokenTtlSeconds
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function readAuthContext(req: express.Request): AuthContext | null {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      userId: string;
      role: AccountRole;
      exp: number;
    };

    if (!payload.userId || !payload.role || !payload.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const account = accounts.find((item) => item.id === payload.userId && item.role === payload.role);
    if (!account) {
      return null;
    }

    return {
      account,
      role: account.role
    };
  } catch {
    return null;
  }
}

function requireAuth(req: express.Request, res: express.Response): AuthContext | null {
  const auth = readAuthContext(req);
  if (!auth) {
    res.status(401).json({ message: 'Authentication required.' });
    return null;
  }
  return auth;
}

function requireRole(
  auth: AuthContext,
  allowedRoles: AccountRole[],
  res: express.Response
): auth is AuthContext {
  if (allowedRoles.includes(auth.role)) {
    return true;
  }
  res.status(403).json({ message: 'You are not allowed to perform this action.' });
  return false;
}

function enforceAuthRateLimit(
  req: express.Request,
  res: express.Response,
  keySuffix: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const key = `${ip}:${keySuffix}`;
  const existing = authRateBuckets.get(key);

  if (!existing || now > existing.resetAt) {
    authRateBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return true;
  }

  if (existing.count >= maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
    res.status(429).json({ message: 'Too many auth requests. Please try again shortly.' });
    return false;
  }

  existing.count += 1;
  authRateBuckets.set(key, existing);
  return true;
}

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  if (!dbPool) {
    res.json({ status: 'not-configured', database: 'postgres', connected: false });
    return;
  }

  try {
    await dbPool.query('SELECT 1;');
    res.json({ status: 'ok', database: 'postgres', connected: true });
  } catch {
    res.status(500).json({ status: 'error', database: 'postgres', connected: false });
  }
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.get('/api/schools', async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (query) {
    const data = await searchSchools(query);
    res.json({ data });
    return;
  }

  await ensureSchoolDirectoryRefresh().catch(() => undefined);
  res.json({ data: schools });
});

app.get('/api/geo/search', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) {
    res.status(400).json({ message: 'query is required.' });
    return;
  }

  const result = await geocodeLocation(query);
  if (!result) {
    res.status(404).json({ message: 'No geocoding match found.' });
    return;
  }

  res.json({ data: result });
});

app.get('/api/auth/demo-accounts', (_req, res) => {
  res.json({
    data: [
      { role: 'admin', email: 'admin@unistayscout.local', password: 'admin123' },
      { role: 'landlord', email: 'landlord@unistayscout.local', password: 'landlord123' },
      { role: 'student', email: 'student@unistayscout.local', password: 'student123' }
    ]
  });
});

app.post('/api/auth/register', async (req, res) => {
  if (!enforceAuthRateLimit(req, res, 'register', 8, 15 * 60 * 1000)) {
    return;
  }

  const { name, email, phone, password, role } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: AccountRole;
  };

  if (!name || !email || !phone || !password || !role) {
    res.status(400).json({ message: 'name, email, phone, password, and role are required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters.' });
    return;
  }

  if (role === 'admin') {
    res.status(403).json({ message: 'Admin accounts cannot be self-registered.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = accounts.some((account) => account.email === normalizedEmail);
  if (exists) {
    res.status(409).json({ message: 'An account with this email already exists.' });
    return;
  }

  const id = nextId('usr');
  const now = new Date().toISOString();
  const account: Account = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    passwordHash: hashSync(password, 10),
    role,
    landlordId: role === 'landlord' ? nextId('landlord') : undefined,
    createdAt: now
  };

  try {
    await persistAccount(account);
  } catch {
    res.status(500).json({ message: 'Unable to save account.' });
    return;
  }

  accounts.push(account);
  notify('account-created', { accountId: account.id, role: account.role });

  res.status(201).json({
    data: toPublicAccount(account),
    token: createAccessToken(account)
  });
});

app.post('/api/auth/login', (req, res) => {
  if (!enforceAuthRateLimit(req, res, 'login', 12, 15 * 60 * 1000)) {
    return;
  }

  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required.' });
    return;
  }

  const account = accounts.find((item) => item.email === email.trim().toLowerCase());
  if (!account) {
    res.status(401).json({ message: 'Invalid credentials.' });
    return;
  }

  const passwordMatches = compareSync(password, account.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({ message: 'Invalid credentials.' });
    return;
  }

  res.json({
    data: toPublicAccount(account),
    token: createAccessToken(account)
  });
});

app.get('/api/dashboard-summary', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  const { account } = auth;

  if (account.role === 'student') {
    const myInterests = interests.filter((item) => item.studentUserId === account.id);
    res.json({
      data: {
        role: 'student',
        cards: [
          { label: 'Interests Sent', value: String(myInterests.length) },
          { label: 'Approved Listings', value: String(listings.filter((item) => item.status === 'approved').length) },
          { label: 'Schools Available', value: String(schools.length) }
        ]
      }
    });
    return;
  }

  if (account.role === 'landlord') {
    const mine = listings.filter((item) => item.landlordId === account.landlordId);
    res.json({
      data: {
        role: 'landlord',
        cards: [
          { label: 'My Listings', value: String(mine.length) },
          { label: 'Pending Review', value: String(mine.filter((item) => item.status === 'pending').length) },
          { label: 'Total Views', value: String(mine.reduce((sum, item) => sum + item.views, 0)) }
        ]
      }
    });
    return;
  }

  res.json({
    data: {
      role: 'admin',
      cards: [
        { label: 'Pending Listings', value: String(listings.filter((item) => item.status === 'pending').length) },
        { label: 'Total Listings', value: String(listings.length) },
        { label: 'Student Leads', value: String(interests.length) }
      ]
    }
  });
});

app.get('/api/landlord/insights', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['landlord'], res)) {
    return;
  }

  const landlordId = auth.account.landlordId;
  if (!landlordId) {
    res.status(400).json({ message: 'Landlord profile is incomplete.' });
    return;
  }

  const mine = listings.filter((item) => item.landlordId === landlordId);
  const mineIds = new Set(mine.map((item) => item.id));
  const myLeads = interests.filter((item) => mineIds.has(item.listingId));
  const totalViews = mine.reduce((sum, item) => sum + item.views, 0);
  const avgMonthlyPrice = mine.length === 0 ? 0 : Math.round(mine.reduce((sum, item) => sum + item.price, 0) / mine.length);
  const conversionRate = totalViews > 0 ? Number(((myLeads.length / totalViews) * 100).toFixed(1)) : 0;

  res.json({
    data: {
      activeListings: mine.length,
      pendingReview: mine.filter((item) => item.status === 'pending').length,
      approvedListings: mine.filter((item) => item.status === 'approved').length,
      rejectedListings: mine.filter((item) => item.status === 'rejected').length,
      unverifiedListings: mine.filter((item) => !item.isVerified).length,
      avgMonthlyPrice,
      totalViews,
      leadVolume: myLeads.length,
      conversionRatePct: conversionRate
    }
  });
});

app.get('/api/admin/insights', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['admin'], res)) {
    return;
  }

  const pending = listings.filter((item) => item.status === 'pending');
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const stalePendingCount = pending.filter((item) => now - new Date(item.updatedAt).getTime() > oneDayMs).length;
  const recentLeads = interests.filter((item) => now - new Date(item.createdAt).getTime() <= oneDayMs).length;
  const unverifiedPending = pending.filter((item) => !item.isVerified).length;

  res.json({
    data: {
      pendingModeration: pending.length,
      totalListings: listings.length,
      studentLeads: interests.length,
      stalePendingCount,
      recentLeads,
      highPriorityQueue: unverifiedPending
    }
  });
});

app.get('/api/listings', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  const schoolId = String(req.query.schoolId || '');
  const radiusKm = Number(req.query.radiusKm || 5);
  const minPrice = Number(req.query.minPrice || 0);
  const maxPrice = Number(req.query.maxPrice || 999999);
  const roomTypeFilter = String(req.query.roomType || 'any');
  const verifiedOnly = String(req.query.verifiedOnly || 'false') === 'true';
  const sortBy = String(req.query.sortBy || 'distance');
  const amenityCsv = String(req.query.amenities || '');
  const requiredAmenities = amenityCsv
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const role = auth.role as UserRole;
  const landlordId = auth.account.landlordId || '';

  const school = schools.find((item) => item.id === schoolId) || schools[0];

  if (!school) {
    res.status(400).json({ message: 'schoolId is invalid.' });
    return;
  }

  if (dbPool) {
    try {
      const data = await queryListingsFromDatabase({
        school,
        radiusKm,
        minPrice,
        maxPrice,
        roomTypeFilter,
        verifiedOnly,
        requiredAmenities,
        role,
        landlordId,
        sortBy
      });
      res.json({ data, total: data.length, school });
      return;
    } catch {
      // Fall back to in-memory filtering if SQL path fails.
    }
  }

  const visibleListings = listings.filter((item) => {
    if (role === 'admin') {
      return true;
    }
    if (role === 'landlord') {
      return item.landlordId === landlordId;
    }
    return item.status === 'approved';
  });

  const mapped = visibleListings
    .filter((item) => item.schoolId === school.id)
    .filter((item) => item.price >= minPrice && item.price <= maxPrice)
    .filter((item) => (roomTypeFilter === 'any' ? true : item.roomType === roomTypeFilter))
    .filter((item) => (verifiedOnly ? item.isVerified : true))
    .filter((item) =>
      requiredAmenities.length === 0 ? true : requiredAmenities.every((amenity) => item.amenities.includes(amenity))
    )
    .map((item) => {
      const computedDistance = distanceKm(school.latitude, school.longitude, item.latitude, item.longitude);
      return {
        ...item,
        distanceKm: Number(computedDistance.toFixed(2))
      };
    })
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      return a.distanceKm - b.distanceKm;
    });

  res.json({ data: mapped, total: mapped.length, school });
});

app.post('/api/listings', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['landlord'], res)) {
    return;
  }

  const payload = req.body as Partial<Listing>;
  if (!payload.title || !payload.schoolId || payload.price == null) {
    res.status(400).json({ message: 'title, schoolId, and price are required.' });
    return;
  }

  if (!auth.account.landlordId) {
    res.status(400).json({ message: 'Landlord profile is incomplete.' });
    return;
  }

  const school = schools.find((item) => item.id === payload.schoolId) || schools[0];
  if (!school) {
    res.status(400).json({ message: 'schoolId is invalid.' });
    return;
  }

  const locationLabel = typeof payload.locationLabel === 'string' ? payload.locationLabel.trim() : '';
  const geocodedLocation = locationLabel ? await geocodeLocation(locationLabel) : null;

  if (locationLabel && !geocodedLocation) {
    res.status(400).json({ message: 'Unable to geocode the provided location. Use a real address or place name.' });
    return;
  }

  const now = new Date().toISOString();
  const listing: Listing = {
    id: nextId('lst'),
    landlordId: auth.account.landlordId,
    landlordName: auth.account.name || payload.landlordName || 'Landlord',
    title: payload.title,
    description: payload.description || 'Description pending update.',
    schoolId: payload.schoolId,
    locationLabel: geocodedLocation?.label || locationLabel || school.name,
    latitude: geocodedLocation?.latitude ?? Number(payload.latitude || school.latitude),
    longitude: geocodedLocation?.longitude ?? Number(payload.longitude || school.longitude),
    price: Number(payload.price),
    currency: payload.currency || 'ZAR',
    roomType: payload.roomType === 'shared' ? 'shared' : 'private',
    amenities: payload.amenities || [],
    photos: payload.photos || ['https://picsum.photos/seed/unistay-new/640/420'],
    isVerified: false,
    availableBeds: 1,
    status: 'pending',
    adminComment: 'Awaiting admin review.',
    createdAt: now,
    updatedAt: now,
    views: 0
  };

  try {
    await persistListing(listing);
  } catch {
    res.status(500).json({ message: 'Unable to save listing.' });
    return;
  }

  listings.push(listing);
  notify('listing-created', { listingId: listing.id });
  res.status(201).json({ data: listing });
});

app.get('/api/admin/pending-listings', (_req, res) => {
  const auth = requireAuth(_req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['admin'], res)) {
    return;
  }

  const data = listings.filter((item) => item.status === 'pending');
  res.json({ data });
});

app.post('/api/admin/listings/:id/review', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['admin'], res)) {
    return;
  }

  const id = req.params.id;
  const { decision, comment } = req.body as { decision: 'approved' | 'rejected'; comment?: string };
  const listing = listings.find((item) => item.id === id);

  if (!listing) {
    res.status(404).json({ message: 'Listing not found.' });
    return;
  }

  if (decision !== 'approved' && decision !== 'rejected') {
    res.status(400).json({ message: 'decision must be approved or rejected.' });
    return;
  }

  listing.status = decision;
  listing.adminComment = comment || '';
  listing.updatedAt = new Date().toISOString();

  try {
    await persistListingModeration(listing);
  } catch {
    res.status(500).json({ message: 'Unable to update listing review state.' });
    return;
  }

  notify('listing-reviewed', { listingId: id, decision });
  res.json({ data: listing });
});

app.get('/api/landlords/:landlordId/listings', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const landlordId = req.params.landlordId;
  if (auth.role !== 'admin' && auth.account.landlordId !== landlordId) {
    res.status(403).json({ message: 'You can only view your own landlord listings.' });
    return;
  }

  const data = listings.filter((item) => item.landlordId === landlordId);
  res.json({ data });
});

app.post('/api/interests', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['student'], res)) {
    return;
  }

  const { listingId, studentName, studentPhone, studentNote } = req.body as Partial<Interest>;
  if (!listingId || !studentName || !studentPhone) {
    res.status(400).json({ message: 'listingId, studentName and studentPhone are required.' });
    return;
  }

  const listing = listings.find((item) => item.id === listingId);
  if (!listing) {
    res.status(404).json({ message: 'Listing not found.' });
    return;
  }

  const interest: Interest = {
    id: nextId('int'),
    listingId,
    studentUserId: auth.account.id,
    studentName,
    studentPhone,
    studentNote: studentNote || '',
    createdAt: new Date().toISOString()
  };

  try {
    await persistInterest(interest);
  } catch {
    res.status(500).json({ message: 'Unable to save student interest.' });
    return;
  }

  interests.push(interest);
  notify('interest-created', { listingId, interestId: interest.id });
  res.status(201).json({ data: interest });
});

app.get('/api/admin/interests', (_req, res) => {
  const auth = requireAuth(_req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['admin'], res)) {
    return;
  }

  const data = interests
    .map((item) => ({
      ...item,
      listingTitle: listings.find((listing) => listing.id === item.listingId)?.title || 'Unknown listing'
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  res.json({ data });
});

app.get('/api/listings/:id/reviews', (req, res) => {
  const id = req.params.id;
  const data = reviews.filter((item) => item.listingId === id);
  res.json({ data });
});

app.post('/api/listings/:id/reviews', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }
  if (!requireRole(auth, ['student'], res)) {
    return;
  }

  const listingId = req.params.id;
  const { author, rating, comment } = req.body as Partial<Review>;

  if (!author || !rating || !comment) {
    res.status(400).json({ message: 'author, rating, and comment are required.' });
    return;
  }

  const parsedRating = Number(rating);
  if (parsedRating < 1 || parsedRating > 5) {
    res.status(400).json({ message: 'rating must be between 1 and 5.' });
    return;
  }

  const listing = listings.find((item) => item.id === listingId);
  if (!listing) {
    res.status(404).json({ message: 'Listing not found.' });
    return;
  }

  const review: Review = {
    id: nextId('rev'),
    listingId,
    author,
    rating: parsedRating,
    comment,
    createdAt: new Date().toISOString()
  };

  try {
    await persistReview(review);
  } catch {
    res.status(500).json({ message: 'Unable to save review.' });
    return;
  }

  reviews.push(review);
  notify('review-created', { listingId, reviewId: review.id });
  res.status(201).json({ data: review });
});

app.post('/api/ai/recommendations', (req, res) => {
  const { profile, mapContext, conversation } = req.body as {
    profile?: StudentProfile;
    mapContext?: MapContext;
    conversation?: Array<{ role: 'user' | 'assistant'; message: string }>;
  };

  const school = schools.find((item) => item.id === mapContext?.schoolId) || schools[0];
  const radiusKm = Number(mapContext?.radiusKm || 5);
  const budget = Number(profile?.budget || 999999);
  const roomType = profile?.roomType || 'any';

  const candidates = listings
    .filter((item) => item.status === 'approved' && item.schoolId === school.id)
    .map((item) => {
      const computedDistance = distanceKm(school.latitude, school.longitude, item.latitude, item.longitude);
      return {
        ...item,
        distanceKm: computedDistance,
        score:
          (item.price <= budget ? 2 : 0) +
          (roomType === 'any' || item.roomType === roomType ? 2 : 0) +
          (computedDistance <= radiusKm ? 2 : 0)
      };
    })
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, 3);

  const latestUserMessage = conversation?.slice().reverse().find((entry) => entry.role === 'user')?.message || '';
  const questions: string[] = [];

  if (!profile?.budget) {
    questions.push('What monthly budget range are you targeting in ZAR?');
  }
  if (!profile?.roomType || profile.roomType === 'any') {
    questions.push('Would you prefer a private room or shared accommodation?');
  }
  if (radiusKm < 3) {
    questions.push('Would you like to increase your search radius for more options?');
  }

  if (questions.length === 0) {
    questions.push('Do you want to prioritize price, distance, or amenities next?');
  }

  res.json({
    questions,
    recommendedListingIds: candidates.map((item) => item.id),
    rationale: `I checked approved options near ${school.name} and ranked by your budget, preferred room type, and radius.`,
    contextEcho: { profile, mapContext, latestUserMessage }
  });
});

async function startServer(): Promise<void> {
  try {
    await initializeAccountStore();
    await initializeMarketplaceStore();
    void ensureSchoolDirectoryRefresh();
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
      console.log(`Account store mode: ${dbPool ? 'postgres' : 'in-memory'}`);
    });
  } catch (error) {
    console.error('Failed to initialize API dependencies:', error);
    process.exit(1);
  }
}

void startServer();
