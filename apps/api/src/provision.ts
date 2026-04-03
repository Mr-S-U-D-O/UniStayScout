import { hash } from 'bcryptjs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

type AccountRole = 'student' | 'landlord' | 'admin';
type ListingStatus = 'pending' | 'approved' | 'rejected';

type ProvisionAccount = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: AccountRole;
  landlordId?: string;
  password?: string;
  passwordHash?: string;
  createdAt?: string;
};

type ProvisionListing = {
  id?: string;
  landlordId: string;
  landlordName: string;
  title: string;
  description: string;
  schoolId: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  price: number;
  currency?: string;
  roomType: 'private' | 'shared';
  amenities?: string[];
  photos?: string[];
  isVerified?: boolean;
  availableBeds?: number;
  status?: ListingStatus;
  adminComment?: string;
  createdAt?: string;
  updatedAt?: string;
  views?: number;
};

type ProvisionInterest = {
  id?: string;
  listingId: string;
  studentUserId?: string;
  studentName: string;
  studentPhone: string;
  studentNote?: string;
  createdAt?: string;
};

type ProvisionReview = {
  id?: string;
  listingId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt?: string;
};

type ProvisionProfile = {
  accountId: string;
  role: AccountRole;
  payload: Record<string, unknown>;
};

type ProvisionFile = {
  accounts?: ProvisionAccount[];
  listings?: ProvisionListing[];
  interests?: ProvisionInterest[];
  reviews?: ProvisionReview[];
  profiles?: ProvisionProfile[];
};

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultProvisionPath = resolve(packageRoot, 'data/provision.json');

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

async function loadProvisionFile(inputPath: string): Promise<ProvisionFile> {
  const resolved = resolve(process.cwd(), inputPath);
  const raw = await readFile(resolved, 'utf8');
  return JSON.parse(raw) as ProvisionFile;
}

function parseArgs(argv: string[]): { filePath: string; reset: boolean } {
  let filePath = process.env.PROVISION_FILE || defaultProvisionPath;
  let reset = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--file' || value === '-f') {
      filePath = argv[index + 1] || filePath;
      index += 1;
      continue;
    }
    if (value.startsWith('--file=')) {
      filePath = value.slice('--file='.length);
      continue;
    }
    if (value === '--reset') {
      reset = true;
    }
  }

  return { filePath, reset };
}

async function ensureSchema(pool: Pool): Promise<void> {
  const schemaPath = resolve(packageRoot, 'db/init.sql');
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
}

async function importAccounts(pool: Pool, accounts: ProvisionAccount[] = []): Promise<void> {
  for (const account of accounts) {
    const id = account.id || nextId('usr');
    const createdAt = account.createdAt || new Date().toISOString();
    const passwordHash = account.passwordHash || (account.password ? await hash(account.password, 10) : null);

    if (!passwordHash) {
      throw new Error(`Account ${account.email} is missing password or passwordHash.`);
    }

    await pool.query(
      `
        INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          landlord_id = EXCLUDED.landlord_id;
      `,
      [
        id,
        account.name,
        account.email.trim().toLowerCase(),
        account.phone,
        passwordHash,
        account.role,
        account.landlordId || null,
        createdAt
      ]
    );
  }
}

async function importListings(pool: Pool, listings: ProvisionListing[] = []): Promise<void> {
  for (const listing of listings) {
    const id = listing.id || nextId('lst');
    const createdAt = listing.createdAt || new Date().toISOString();
    const updatedAt = listing.updatedAt || createdAt;

    await pool.query(
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
        )
        ON CONFLICT (id)
        DO UPDATE SET
          landlord_id = EXCLUDED.landlord_id,
          landlord_name = EXCLUDED.landlord_name,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          school_id = EXCLUDED.school_id,
          location_label = EXCLUDED.location_label,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          location_geom = EXCLUDED.location_geom,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          room_type = EXCLUDED.room_type,
          amenities = EXCLUDED.amenities,
          photos = EXCLUDED.photos,
          is_verified = EXCLUDED.is_verified,
          available_beds = EXCLUDED.available_beds,
          status = EXCLUDED.status,
          admin_comment = EXCLUDED.admin_comment,
          updated_at = EXCLUDED.updated_at,
          views = EXCLUDED.views;
      `,
      [
        id,
        listing.landlordId,
        listing.landlordName,
        listing.title,
        listing.description,
        listing.schoolId,
        listing.locationLabel,
        listing.latitude,
        listing.longitude,
        listing.price,
        listing.currency || 'ZAR',
        listing.roomType,
        toJson(listing.amenities || []),
        toJson(listing.photos || []),
        listing.isVerified ?? false,
        listing.availableBeds ?? 1,
        listing.status || 'pending',
        listing.adminComment || '',
        createdAt,
        updatedAt,
        listing.views ?? 0
      ]
    );
  }
}

async function importProfiles(pool: Pool, profiles: ProvisionProfile[] = []): Promise<void> {
  for (const profile of profiles) {
    await pool.query(
      `
        INSERT INTO user_profiles (account_id, role, payload, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (account_id)
        DO UPDATE SET role = EXCLUDED.role, payload = EXCLUDED.payload, updated_at = NOW();
      `,
      [profile.accountId, profile.role, toJson({ ...profile.payload, role: profile.role })]
    );
  }
}

async function importInterests(pool: Pool, interests: ProvisionInterest[] = []): Promise<void> {
  for (const interest of interests) {
    const id = interest.id || nextId('int');
    const createdAt = interest.createdAt || new Date().toISOString();

    await pool.query(
      `
        INSERT INTO interests (id, listing_id, student_user_id, student_name, student_phone, student_note, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id)
        DO UPDATE SET
          listing_id = EXCLUDED.listing_id,
          student_user_id = EXCLUDED.student_user_id,
          student_name = EXCLUDED.student_name,
          student_phone = EXCLUDED.student_phone,
          student_note = EXCLUDED.student_note;
      `,
      [
        id,
        interest.listingId,
        interest.studentUserId || null,
        interest.studentName,
        interest.studentPhone,
        interest.studentNote || '',
        createdAt
      ]
    );
  }
}

async function importReviews(pool: Pool, reviews: ProvisionReview[] = []): Promise<void> {
  for (const review of reviews) {
    const id = review.id || nextId('rev');
    const createdAt = review.createdAt || new Date().toISOString();

    await pool.query(
      `
        INSERT INTO reviews (id, listing_id, author, rating, comment, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id)
        DO UPDATE SET
          listing_id = EXCLUDED.listing_id,
          author = EXCLUDED.author,
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment;
      `,
      [id, review.listingId, review.author, review.rating, review.comment, createdAt]
    );
  }
}

async function main(): Promise<void> {
  const { filePath, reset } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to provision data.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const provisionFile = await loadProvisionFile(filePath);

  try {
    await ensureSchema(pool);

    if (reset) {
      await pool.query('TRUNCATE TABLE reviews, interests, user_profiles, listings, accounts RESTART IDENTITY CASCADE;');
    }

    await importAccounts(pool, provisionFile.accounts);
    await importListings(pool, provisionFile.listings);
    await importProfiles(pool, provisionFile.profiles);
    await importInterests(pool, provisionFile.interests);
    await importReviews(pool, provisionFile.reviews);

    const summary = await pool.query<{
      accounts: string;
      listings: string;
      profiles: string;
      interests: string;
      reviews: string;
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM accounts) AS accounts,
        (SELECT COUNT(*)::text FROM listings) AS listings,
        (SELECT COUNT(*)::text FROM user_profiles) AS profiles,
        (SELECT COUNT(*)::text FROM interests) AS interests,
        (SELECT COUNT(*)::text FROM reviews) AS reviews;
    `);

    const counts = summary.rows[0];
    console.log(`Provisioned data from ${filePath}`);
    console.log(`Accounts: ${counts.accounts}, listings: ${counts.listings}, profiles: ${counts.profiles}, interests: ${counts.interests}, reviews: ${counts.reviews}`);
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});