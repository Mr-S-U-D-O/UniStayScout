CREATE EXTENSION IF NOT EXISTS postgis;

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

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

UPDATE listings
SET location_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location_geom IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_location_geom
ON listings USING GIST (location_geom);

CREATE INDEX IF NOT EXISTS idx_listings_school_status
ON listings (school_id, status);

CREATE TABLE IF NOT EXISTS interests (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  student_user_id TEXT,
  student_name TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  student_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
