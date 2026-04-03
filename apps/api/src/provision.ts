import 'dotenv/config';
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
  isSuperUser?: boolean;
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
  handoffStatus?: 'new' | 'landlord-notified';
  handedOffAt?: string;
  handoffChannel?: 'call' | 'sms' | 'whatsapp' | 'email';
  handoffNote?: string;
  handedOffByAdminId?: string;
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

type AdminSetupArgs = {
  enabled: boolean;
  email: string;
  name: string;
  phone: string;
  password: string;
  superUser: boolean;
};

function validateAdminPassword(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return null;
}

function parseArgs(argv: string[]): { filePath: string; reset: boolean; adminSetup: AdminSetupArgs } {
  let filePath = process.env.PROVISION_FILE || defaultProvisionPath;
  let reset = false;
  let setupAdmin = false;
  let email = '';
  let name = '';
  let phone = '';
  let password = '';
  let superUser = false;

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
    if (value === '--setup-admin') {
      setupAdmin = true;
      continue;
    }
    if (value === '--superuser') {
      superUser = true;
      continue;
    }
    if (value === '--email') {
      email = String(argv[index + 1] || '').trim().toLowerCase();
      index += 1;
      continue;
    }
    if (value.startsWith('--email=')) {
      email = value.slice('--email='.length).trim().toLowerCase();
      continue;
    }
    if (value === '--name') {
      name = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (value.startsWith('--name=')) {
      name = value.slice('--name='.length).trim();
      continue;
    }
    if (value === '--phone') {
      phone = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (value.startsWith('--phone=')) {
      phone = value.slice('--phone='.length).trim();
      continue;
    }
    if (value === '--password') {
      password = String(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (value.startsWith('--password=')) {
      password = value.slice('--password='.length);
      continue;
    }
  }

  return {
    filePath,
    reset,
    adminSetup: {
      enabled: setupAdmin,
      email,
      name,
      phone,
      password,
      superUser
    }
  };
}

async function setupAdminAccount(pool: Pool, setup: AdminSetupArgs): Promise<void> {
  if (!setup.email) {
    throw new Error('Admin setup requires --email.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(setup.email)) {
    throw new Error('Admin setup requires a valid email.');
  }

  const existing = await pool.query<{
    id: string;
    name: string;
    phone: string;
    password_hash: string;
    is_super_user: boolean;
  }>(
    `SELECT id, name, phone, password_hash, is_super_user FROM accounts WHERE email = $1 LIMIT 1;`,
    [setup.email]
  );

  if (existing.rows.length > 0) {
    const current = existing.rows[0];
    const nextName = setup.name || current.name;
    const nextPhone = setup.phone || current.phone;
    let nextHash = current.password_hash;

    if (setup.password) {
      const validationError = validateAdminPassword(setup.password);
      if (validationError) {
        throw new Error(validationError);
      }
      nextHash = await hash(setup.password, 10);
    }

    await pool.query(
      `
        UPDATE accounts
        SET name = $2,
            phone = $3,
            password_hash = $4,
            role = 'admin',
            landlord_id = NULL,
            is_super_user = $5
        WHERE email = $1;
      `,
      [setup.email, nextName, nextPhone, nextHash, setup.superUser || current.is_super_user]
    );

    console.log(`Admin account updated for ${setup.email}`);
    return;
  }

  if (!setup.name || !setup.phone || !setup.password) {
    throw new Error('Creating a new admin requires --name, --phone, and --password.');
  }

  const validationError = validateAdminPassword(setup.password);
  if (validationError) {
    throw new Error(validationError);
  }

  await pool.query(
    `
      INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, is_super_user, created_at)
      VALUES ($1, $2, $3, $4, $5, 'admin', NULL, $6, NOW());
    `,
    [
      nextId('usr'),
      setup.name,
      setup.email,
      setup.phone,
      await hash(setup.password, 10),
      setup.superUser
    ]
  );

  console.log(`Admin account created for ${setup.email}`);
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
        INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, is_super_user, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          landlord_id = EXCLUDED.landlord_id,
          is_super_user = EXCLUDED.is_super_user;
      `,
      [
        id,
        account.name,
        account.email.trim().toLowerCase(),
        account.phone,
        passwordHash,
        account.role,
        account.landlordId || null,
        account.isSuperUser || false,
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
        INSERT INTO interests (
          id,
          listing_id,
          student_user_id,
          student_name,
          student_phone,
          student_note,
          handoff_status,
          handed_off_at,
          handoff_channel,
          handoff_note,
          handed_off_by_admin_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id)
        DO UPDATE SET
          listing_id = EXCLUDED.listing_id,
          student_user_id = EXCLUDED.student_user_id,
          student_name = EXCLUDED.student_name,
          student_phone = EXCLUDED.student_phone,
          student_note = EXCLUDED.student_note,
          handoff_status = EXCLUDED.handoff_status,
          handed_off_at = EXCLUDED.handed_off_at,
          handoff_channel = EXCLUDED.handoff_channel,
          handoff_note = EXCLUDED.handoff_note,
          handed_off_by_admin_id = EXCLUDED.handed_off_by_admin_id;
      `,
      [
        id,
        interest.listingId,
        interest.studentUserId || null,
        interest.studentName,
        interest.studentPhone,
        interest.studentNote || '',
        interest.handoffStatus || 'new',
        interest.handedOffAt || null,
        interest.handoffChannel || null,
        interest.handoffNote || '',
        interest.handedOffByAdminId || null,
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
  const { filePath, reset, adminSetup } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to provision data.');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await ensureSchema(pool);

    if (adminSetup.enabled) {
      await setupAdminAccount(pool, adminSetup);
      return;
    }

    const provisionFile = await loadProvisionFile(filePath);

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
