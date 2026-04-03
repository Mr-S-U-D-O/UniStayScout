import { Hono } from 'hono';
import type { Context } from 'hono';
import { Pool } from '@neondatabase/serverless';
import { compare, hash } from 'bcryptjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ──────────────────────────────────────────────────────────────────

type UserRole = 'student' | 'landlord' | 'admin';
type ListingStatus = 'pending' | 'approved' | 'rejected';
type AccountRole = 'student' | 'landlord' | 'admin';

type Bindings = {
  DATABASE_URL: string;
  AUTH_TOKEN_SECRET: string;
  CORS_ALLOWED_ORIGINS?: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  GOOGLE_GENAI_API_KEY: string;
};

// ─── Initialization ──────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const allowlist = (c.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowlist.length === 0) {
    c.header('Access-Control-Allow-Origin', '*');
  } else if (origin && allowlist.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  }

  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

type TokenPayload = {
  userId: string;
  role: AccountRole;
  exp: number;
};

type SchoolRecord = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  source: 'seed' | 'osm';
  address?: string;
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
  views: number;
  created_at: string;
  updated_at: string;
};

type InterestRow = {
  id: string;
  listing_id: string;
  student_user_id: string | null;
  student_name: string;
  student_phone: string;
  student_note: string;
  handoff_status: 'new' | 'landlord-notified';
  handed_off_at: string | null;
  handoff_channel: 'call' | 'sms' | 'whatsapp' | 'email' | null;
  handoff_note: string;
  handed_off_by_admin_id: string | null;
  created_at: string;
};

const STATIC_SCHOOLS: SchoolRecord[] = [
  { id: 'uj-auckland-park', name: 'University of Johannesburg - Auckland Park Kingsway Campus', city: 'Johannesburg', latitude: -26.1834, longitude: 28.0069, source: 'seed', address: 'Cnr Kingsway and University Rd, Auckland Park' },
  { id: 'uj-doornfontein', name: 'University of Johannesburg - Doornfontein Campus', city: 'Johannesburg', latitude: -26.1938, longitude: 28.0554, source: 'seed', address: 'Cnr Beit and Robert Sobukwe Rd, Doornfontein' },
  { id: 'uj-soweto', name: 'University of Johannesburg - Soweto Campus', city: 'Johannesburg', latitude: -26.2804, longitude: 27.9114, source: 'seed', address: 'Soweto' },
  { id: 'wits-west-campus', name: 'University of the Witwatersrand - West Campus', city: 'Johannesburg', latitude: -26.1919, longitude: 28.0266, source: 'seed', address: 'Yale Rd, Parktown' },
  { id: 'wits-east-campus', name: 'University of the Witwatersrand - East Campus', city: 'Johannesburg', latitude: -26.1910, longitude: 28.0333, source: 'seed', address: 'Braamfontein' },
  { id: 'central-johannesburg', name: 'Central Johannesburg TVET College', city: 'Johannesburg', latitude: -26.1855, longitude: 28.0340, source: 'seed', address: 'Ellis Park area' },
  { id: 'rosebank-college', name: 'Rosebank College Johannesburg', city: 'Johannesburg', latitude: -26.1075, longitude: 28.0506, source: 'seed', address: 'Bramley / Johannesburg' }
];

const SCHOOL_LOOKUP = new Map(STATIC_SCHOOLS.map((school) => [school.id, school] as const));

const DEMO_ACCOUNTS = [
  { role: 'student', email: 'student@unistayscout.local', password: 'demo-student' },
  { role: 'landlord', email: 'landlord@unistayscout.local', password: 'demo-landlord' },
  { role: 'admin', email: 'admin@unistayscout.local', password: 'demo-admin' }
];

function safeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return safeJsonArray(parsed);
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeListing(row: any): ListingRow {
  return {
    id: String(row.id),
    landlord_id: String(row.landlord_id || ''),
    landlord_name: String(row.landlord_name || ''),
    title: String(row.title || ''),
    description: String(row.description || ''),
    school_id: String(row.school_id || ''),
    location_label: String(row.location_label || ''),
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    price: Number(row.price || 0),
    currency: String(row.currency || 'ZAR'),
    room_type: (row.room_type === 'shared' ? 'shared' : 'private'),
    amenities: safeJsonArray(row.amenities),
    photos: safeJsonArray(row.photos),
    is_verified: Boolean(row.is_verified),
    available_beds: Number(row.available_beds || 0),
    status: (row.status === 'approved' || row.status === 'rejected' ? row.status : 'pending') as ListingStatus,
    admin_comment: String(row.admin_comment || ''),
    views: Number(row.views || 0),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || '')
  };
}

function haversineKm(start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(end.latitude - start.latitude);
  const deltaLng = toRad(end.longitude - start.longitude);
  const lat1 = toRad(start.latitude);
  const lat2 = toRad(end.latitude);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.sin(deltaLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function getSchoolDirectory(query = ''): SchoolRecord[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return STATIC_SCHOOLS;
  }

  return STATIC_SCHOOLS.filter((school) => {
    const haystack = `${school.name} ${school.city} ${school.address || ''}`.toLowerCase();
    return haystack.includes(trimmed);
  });
}

function toUserProfileRow(role: AccountRole, payload: any) {
  return { ...payload, role };
}

async function queryCount(c: Context<{ Bindings: Bindings }>, sql: string, params: unknown[] = []): Promise<number> {
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query<{ count: string }>(sql, params);
    return Number(result.rows[0]?.count || 0);
  } finally {
    await db.end();
  }
}

async function withDb<T>(c: Context<{ Bindings: Bindings }>, fn: (db: Pool) => Promise<T>): Promise<T> {
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(normalized + padding);
}

async function createHmac(content: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(content));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function verifyHmac(content: string, signature: string, secret: string): Promise<boolean> {
  const expected = await createHmac(content, secret);
  if (expected.length !== signature.length) return false;

  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }

  return diff === 0;
}

function resolveAuthSecret(c: Context<{ Bindings: Bindings }>): string | null {
  const secret = String(c.env.AUTH_TOKEN_SECRET || '').trim();
  if (secret.length < 32) {
    return null;
  }
  return secret;
}

async function getAccountFromToken(c: Context<{ Bindings: Bindings }>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const secret = resolveAuthSecret(c);
    if (!secret) return null;

    const [headerPart, payloadPart, signaturePart] = parts;
    const message = `${headerPart}.${payloadPart}`;
    const isValid = await verifyHmac(message, signaturePart, secret);
    if (!isValid) return null;

    const payload = JSON.parse(fromBase64Url(payloadPart)) as TokenPayload;

    if (payload.exp < Date.now() / 1000) return null;

    const db = new Pool({ connectionString: c.env.DATABASE_URL });
    const result = await db.query('SELECT * FROM accounts WHERE id = $1', [payload.userId]);
    await db.end();

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      phone: row.phone as string,
      role: row.role as AccountRole,
      landlordId: row.landlord_id as string | null,
      isSuperUser: row.is_super_user as boolean
    };
  } catch {
    return null;
  }
}

async function createToken(account: any, c: Context<{ Bindings: Bindings }>) {
  const secret = resolveAuthSecret(c);
  if (!secret) {
    throw new Error('AUTH_TOKEN_SECRET must be configured with at least 32 characters.');
  }

  const payload: TokenPayload = {
    userId: account.id,
    role: account.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h
  };

  const headerPart = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signaturePart = await createHmac(`${headerPart}.${payloadPart}`, secret);
  return `${headerPart}.${payloadPart}.${signaturePart}`;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

app.get('/', (c) => c.text('UniStayScout Edge API (Hono)'));

// --- Authentication ---

app.post('/api/auth/register', async (c) => {
  const { name, email, phone, password, role } = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const passwordHash = await hash(password, 10);
    const id = nextId('usr');
    const landlordId = role === 'landlord' ? nextId('landlord') : null;
    const result = await db.query(
      `INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [id, name, email.toLowerCase().trim(), phone, passwordHash, role, landlordId]
    );
    const account = result.rows[0];
    return c.json({ data: account, token: await createToken(account, c) }, 201);
  } finally {
    await db.end();
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase().trim()]);
    if (!result.rows[0]) return c.json({ message: 'Invalid credentials' }, 401);
    const account = result.rows[0];
    const match = await compare(password, account.password_hash);
    if (!match) return c.json({ message: 'Invalid credentials' }, 401);
    return c.json({ data: account, token: await createToken(account, c) });
  } finally {
    await db.end();
  }
});

app.get('/api/auth/demo-accounts', (c) => c.json({ data: DEMO_ACCOUNTS }));

app.delete('/api/auth/account', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const { password } = await c.req.json();
  const secretDb = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await secretDb.query('SELECT password_hash FROM accounts WHERE id = $1', [user.id]);
    const account = result.rows[0];
    if (!account) return c.json({ message: 'Unauthorized' }, 401);

    const match = await compare(password, account.password_hash);
    if (!match) return c.json({ message: 'Invalid credentials' }, 401);

    await secretDb.query('DELETE FROM accounts WHERE id = $1', [user.id]);
    return c.json({ ok: true });
  } finally {
    await secretDb.end();
  }
});

// --- Schools ---
app.get('/api/schools', async (c) => {
  const query = c.req.query('q') || '';
  const schools = getSchoolDirectory(query);
  return c.json({ data: schools });
});

app.get('/api/geo/search', async (c) => {
  const query = String(c.req.query('query') || '').trim();
  if (!query) return c.json({ message: 'Query is required' }, 400);

  const match = getSchoolDirectory(query)[0];
  if (match) {
    return c.json({ data: { label: match.name, latitude: match.latitude, longitude: match.longitude } });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'UniStayScout/1.0' } });
    const results = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
    if (results.length === 0) {
      return c.json({ message: 'Location not found' }, 404);
    }

    const result = results[0];
    return c.json({ data: { label: result.display_name, latitude: Number(result.lat), longitude: Number(result.lon) } });
  } catch {
    return c.json({ message: 'Unable to geocode location' }, 503);
  }
});

// --- Listings ---
app.get('/api/listings', async (c) => {
  const schoolId = c.req.query('schoolId') || '';
  const requestedStatus = c.req.query('status') || 'approved';
  const allowedStatuses: ListingStatus[] = ['pending', 'approved', 'rejected'];
  const status = allowedStatuses.includes(requestedStatus as ListingStatus)
    ? (requestedStatus as ListingStatus)
    : 'approved';
  const radiusKm = Number(c.req.query('radiusKm') || '0');
  const minPrice = Number(c.req.query('minPrice') || '0');
  const maxPrice = Number(c.req.query('maxPrice') || '0');
  const roomType = String(c.req.query('roomType') || '');
  const verifiedOnly = String(c.req.query('verifiedOnly') || 'false') === 'true';
  const amenitiesFilter = String(c.req.query('amenities') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (status !== 'approved') {
    const user = await getAccountFromToken(c);
    if (!user || user.role !== 'admin') {
      return c.json({ message: 'Forbidden' }, 403);
    }
  }

  const school = SCHOOL_LOOKUP.get(schoolId);
  const listings = await withDb(c, async (db) => {
    const result = await db.query('SELECT * FROM listings WHERE status = $1', [status]);
    return result.rows.map((row) => normalizeListing(row));
  });

  const filteredListings = listings
    .map((listing) => ({
      ...listing,
      distanceKm: school ? Number(haversineKm(school, listing).toFixed(1)) : 0
    }))
    .filter((listing) => {
      if (schoolId && listing.school_id !== schoolId) return false;
      if (minPrice > 0 && listing.price < minPrice) return false;
      if (maxPrice > 0 && listing.price > maxPrice) return false;
      if (roomType && roomType !== 'any' && listing.room_type !== roomType) return false;
      if (verifiedOnly && !listing.is_verified) return false;
      if (radiusKm > 0 && school && listing.distanceKm > radiusKm) return false;
      if (amenitiesFilter.length > 0 && !amenitiesFilter.every((amenity) => listing.amenities.includes(amenity))) return false;
      return true;
    })
    .sort((left, right) => {
      const sortBy = String(c.req.query('sortBy') || 'distance');
      if (sortBy === 'price-asc') return left.price - right.price;
      if (sortBy === 'price-desc') return right.price - left.price;
      return left.distanceKm - right.distanceKm;
    });

  return c.json({ data: filteredListings });
});

app.post('/api/listings', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'landlord') return c.json({ message: 'Unauthorized' }, 401);
  const data = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const id = nextId('lst');
    await db.query(`INSERT INTO listings (id, landlord_id, landlord_name, title, description, school_id, location_label, latitude, longitude, price, room_type, amenities, photos, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW(), NOW())`,
      [id, user.landlordId, user.name, data.title, data.description, data.schoolId, data.locationLabel, data.latitude, data.longitude, data.price, data.roomType, JSON.stringify(data.amenities), JSON.stringify(data.photos)]
    );
    return c.json({ data: { id } }, 201);
  } finally {
    await db.end();
  }
});

// --- Profile ---
app.get('/api/profile', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);
  return withDb(c, async (db) => {
    const result = await db.query('SELECT role, payload FROM user_profiles WHERE account_id = $1', [user.id]);
    const row = result.rows[0] as { role: AccountRole; payload: any } | undefined;
    if (!row) return c.json({ message: 'Profile not found' }, 404);
    return c.json({ data: toUserProfileRow(row.role, row.payload) });
  });
});

app.put('/api/profile', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);
  const data = await c.req.json();
  return withDb(c, async (db) => {
    await db.query(
      `INSERT INTO user_profiles (account_id, role, payload, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (account_id)
       DO UPDATE SET role = EXCLUDED.role, payload = EXCLUDED.payload, updated_at = NOW()`,
      [user.id, data.role || user.role, JSON.stringify(data)]
    );
    return c.json({ data: { ...data, role: data.role || user.role } });
  });
});

// --- AI Chat ---
app.post('/api/chat', async (c) => {
  const { message, context } = await c.req.json();
  const genAI = new GoogleGenerativeAI(c.env.GOOGLE_GENAI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `You are UniStayScout Assistant. Help the student find accommodation based on:
Message: "${message}"
Context: ${JSON.stringify(context)}
Be helpful, concise, and professional.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return c.json({ data: { reply: response.text() } });
  } catch (err) {
    console.error(err);
    return c.json({ message: 'AI service unavailable' }, 503);
  }
});

app.post('/api/ai/recommendations', async (c) => {
  const { profile, mapContext, conversation } = await c.req.json();
  const schoolId = String(mapContext?.schoolId || '');
  const budgetMax = Number(profile?.budgetMax || profile?.budget || mapContext?.maxPrice || 0);
  const roomType = String(profile?.roomType || mapContext?.roomType || 'any');

  const listings = await withDb(c, async (db) => {
    const result = await db.query("SELECT * FROM listings WHERE status = 'approved'");
    return result.rows.map((row) => normalizeListing(row));
  });

  const ranked = listings
    .filter((listing) => (!schoolId || listing.school_id === schoolId) && (budgetMax <= 0 || listing.price <= budgetMax) && (roomType === 'any' || listing.room_type === roomType))
    .slice(0, 3)
    .map((listing) => listing.id);

  return c.json({
    questions: ['What matters most to you: price, distance, or security?', 'Do you want private or shared accommodation?'],
    recommendedListingIds: ranked,
    rationale: `I matched ${ranked.length} listings against your budget, room type, and school context.`
  });
});

// --- Media ---
app.post('/api/media/upload', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);
  const formData = await c.req.parseBody();
  const file = formData['file'] as File;
  if (!file) return c.json({ message: 'No file provided' }, 400);

  const timestamp = Math.round(Date.now() / 1000);
  const signatureStr = `timestamp=${timestamp}${c.env.CLOUDINARY_API_SECRET}`;
  const data = new TextEncoder().encode(signatureStr);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const body = new FormData();
  body.append('file', file);
  body.append('timestamp', timestamp.toString());
  body.append('api_key', c.env.CLOUDINARY_API_KEY);
  body.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body });
  const result = await res.json() as any;
  return c.json({ data: { url: result.secure_url } });
});

app.get('/api/listings/:id/reviews', async (c) => {
  const listingId = c.req.param('id');
  const data = await withDb(c, async (db) => {
    const result = await db.query('SELECT id, author, rating, comment, created_at FROM reviews WHERE listing_id = $1 ORDER BY created_at DESC', [listingId]);
    return result.rows.map((row) => ({
      id: String(row.id),
      author: String(row.author),
      rating: Number(row.rating),
      comment: String(row.comment),
      createdAt: String(row.created_at)
    }));
  });

  return c.json({ data });
});

app.post('/api/listings/:id/reviews', async (c) => {
  const listingId = c.req.param('id');
  const { author, rating, comment } = await c.req.json();
  await withDb(c, async (db) => {
    await db.query(
      `INSERT INTO reviews (id, listing_id, author, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [nextId('rev'), listingId, String(author || 'Anonymous'), Number(rating || 5), String(comment || '')]
    );
  });
  return c.json({ message: 'Review added' }, 201);
});

app.post('/api/interests', async (c) => {
  const user = await getAccountFromToken(c);
  const { listingId, studentName, studentPhone, studentNote } = await c.req.json();
  await withDb(c, async (db) => {
    await db.query(
      `INSERT INTO interests (id, listing_id, student_user_id, student_name, student_phone, student_note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [nextId('int'), listingId, user?.id || null, studentName, studentPhone, studentNote || '']
    );
  });
  return c.json({ message: 'Interest noted' }, 201);
});

app.get('/api/admin/interests', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);

  const interests = await withDb(c, async (db) => {
    const result = await db.query<InterestRow & { title: string; landlord_name: string; landlord_phone: string | null; landlord_email: string | null }>(
      `SELECT
         i.*,
         l.title,
         l.landlord_name,
         a.phone AS landlord_phone,
         a.email AS landlord_email
       FROM interests i
       JOIN listings l ON l.id = i.listing_id
       LEFT JOIN accounts a ON a.landlord_id = l.landlord_id
       ORDER BY i.created_at DESC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      listingTitle: row.title,
      studentName: row.student_name,
      studentPhone: row.student_phone,
      createdAt: row.created_at,
      studentNote: row.student_note,
      landlordName: row.landlord_name,
      landlordPhone: row.landlord_phone || undefined,
      landlordEmail: row.landlord_email || undefined,
      handoffStatus: row.handoff_status,
      handedOffAt: row.handed_off_at || undefined,
      handoffChannel: row.handoff_channel || undefined,
      handoffNote: row.handoff_note,
      handedOffByAdminId: row.handed_off_by_admin_id || undefined
    }));
  });

  return c.json({ data: interests });
});

app.post('/api/admin/leads/:id/handoff', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const { handoffChannel, handoffNote } = await c.req.json();
  await withDb(c, async (db) => {
    await db.query(
      `UPDATE interests
       SET handoff_status = 'landlord-notified',
           handed_off_at = NOW(),
           handoff_channel = $2,
           handoff_note = $3,
           handed_off_by_admin_id = $4
       WHERE id = $1`,
      [id, handoffChannel, handoffNote || '', user.id]
    );
  });

  return c.json({ message: 'Lead handoff recorded' });
});

app.post('/api/admin/invite', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || !user.isSuperUser) return c.json({ message: 'Unauthorized' }, 401);

  const { name, email, phone, password } = await c.req.json();
  const passwordHash = await hash(String(password || ''), 10);
  const accountId = nextId('usr');

  await withDb(c, async (db) => {
    await db.query(
      `INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, created_at)
       VALUES ($1, $2, $3, $4, $5, 'admin', NULL, NOW())
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, password_hash = EXCLUDED.password_hash, role = 'admin', landlord_id = NULL`,
      [accountId, name, String(email).toLowerCase().trim(), phone, passwordHash]
    );
  });

  return c.json({ message: 'Admin invitation saved' }, 201);
});

app.get('/api/landlords/:landlordId/listings', async (c) => {
  const landlordId = c.req.param('landlordId');
  const data = await withDb(c, async (db) => {
    const result = await db.query("SELECT * FROM listings WHERE landlord_id = $1 ORDER BY created_at DESC", [landlordId]);
    return result.rows.map((row) => ({ ...normalizeListing(row), distanceKm: 0 }));
  });

  return c.json({ data });
});

app.get('/api/landlord/insights', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'landlord') return c.json({ message: 'Unauthorized' }, 401);

  const insights = await withDb(c, async (db) => {
    const result = await db.query<{ count: string; avg: string | null }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('pending', 'approved', 'rejected'))::text AS count,
         AVG(price)::text AS avg
       FROM listings
       WHERE landlord_id = $1`,
      [user.landlordId]
    );

    const totals = await db.query<{ active: string; pending: string; approved: string; rejected: string; unverified: string; views: string; leads: string }>(
      `SELECT
         COUNT(*)::text AS active,
         COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
         COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected,
         COUNT(*) FILTER (WHERE NOT is_verified)::text AS unverified,
         COALESCE(SUM(views), 0)::text AS views,
         (SELECT COUNT(*)::text FROM interests i JOIN listings l ON l.id = i.listing_id WHERE l.landlord_id = $1)::text AS leads
       FROM listings
       WHERE landlord_id = $1`,
      [user.landlordId]
    );

    const row = totals.rows[0];
    const totalViews = Number(row?.views || 0);
    const leadVolume = Number(row?.leads || 0);

    return {
      activeListings: Number(row?.active || 0),
      pendingReview: Number(row?.pending || 0),
      approvedListings: Number(row?.approved || 0),
      rejectedListings: Number(row?.rejected || 0),
      unverifiedListings: Number(row?.unverified || 0),
      avgMonthlyPrice: Number(result.rows[0]?.avg || 0),
      totalViews,
      leadVolume,
      conversionRatePct: totalViews > 0 ? Math.round((leadVolume / totalViews) * 100) : 0
    };
  });

  return c.json({ data: insights });
});

app.get('/api/admin/insights', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);

  const insights = await withDb(c, async (db) => {
    const [listingCounts, userCounts, leadCounts, stalePending] = await Promise.all([
      db.query<{ pending: string; total: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
           COUNT(*)::text AS total
         FROM listings`
      ),
      db.query<{ admins: string; landlords: string; students: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE role = 'admin')::text AS admins,
           COUNT(*) FILTER (WHERE role = 'landlord')::text AS landlords,
           COUNT(*) FILTER (WHERE role = 'student')::text AS students
         FROM accounts`
      ),
      db.query<{ leads: string; recent: string }>(
        `SELECT
           COUNT(*)::text AS leads,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS recent
         FROM interests`
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM listings
         WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'`
      )
    ]);

    return {
      pendingModeration: Number(listingCounts.rows[0]?.pending || 0),
      totalListings: Number(listingCounts.rows[0]?.total || 0),
      studentLeads: Number(leadCounts.rows[0]?.leads || 0),
      stalePendingCount: Number(stalePending.rows[0]?.count || 0),
      recentLeads: Number(leadCounts.rows[0]?.recent || 0),
      highPriorityQueue: Number(stalePending.rows[0]?.count || 0),
      totalAdmins: Number(userCounts.rows[0]?.admins || 0),
      totalLandlords: Number(userCounts.rows[0]?.landlords || 0),
      totalStudents: Number(userCounts.rows[0]?.students || 0),
      adminSelectionPolicy: 'Superusers can invite admins; moderators approve listings before publication.',
      adminSelfRegistrationEnabled: false
    };
  });

  return c.json({ data: insights });
});

app.get('/api/dashboard-summary', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const cards = await withDb(c, async (db) => {
    if (user.role === 'student') {
      const result = await db.query<{ total: string; approved: string; schools: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
           COUNT(DISTINCT school_id)::text AS schools
         FROM listings`
      );
      return [
        { label: 'Approved Listings', value: String(result.rows[0]?.approved || '0') },
        { label: 'Campus Options', value: String(result.rows[0]?.schools || '0') },
        { label: 'Live Listings', value: String(result.rows[0]?.total || '0') }
      ];
    }

    if (user.role === 'landlord') {
      const result = await db.query<{ total: string; pending: string; leads: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
           (SELECT COUNT(*)::text FROM interests i JOIN listings l ON l.id = i.listing_id WHERE l.landlord_id = $1)::text AS leads
         FROM listings
         WHERE landlord_id = $1`,
        [user.landlordId]
      );
      return [
        { label: 'Listings', value: String(result.rows[0]?.total || '0') },
        { label: 'Pending Review', value: String(result.rows[0]?.pending || '0') },
        { label: 'Leads', value: String(result.rows[0]?.leads || '0') }
      ];
    }

    const result = await db.query<{ admins: string; landlords: string; pending: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'admin')::text AS admins,
         COUNT(*) FILTER (WHERE role = 'landlord')::text AS landlords,
         (SELECT COUNT(*)::text FROM listings WHERE status = 'pending')::text AS pending
       FROM accounts`
    );
    return [
      { label: 'Admins', value: String(result.rows[0]?.admins || '0') },
      { label: 'Landlords', value: String(result.rows[0]?.landlords || '0') },
      { label: 'Pending Reviews', value: String(result.rows[0]?.pending || '0') }
    ];
  });

  return c.json({ data: { cards } });
});

// --- Admin ---
app.get('/api/admin/pending-listings', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query("SELECT * FROM listings WHERE status = 'pending'");
    return c.json({ data: result.rows });
  } finally {
    await db.end();
  }
});

app.post('/api/admin/listings/:id/review', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { decision, comment } = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    await db.query("UPDATE listings SET status = $1, admin_comment = $2, updated_at = NOW() WHERE id = $3", [decision, comment, id]);
    return c.json({ message: 'Listing reviewed' });
  } finally {
    await db.end();
  }
});

// --- Interests ---
app.post('/api/listings/:id/interest', async (c) => {
  const user = await getAccountFromToken(c);
  const listingId = c.req.param('id');
  const { studentName, studentPhone, studentNote } = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    await db.query(`INSERT INTO interests (id, listing_id, student_user_id, student_name, student_phone, student_note, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [nextId('int'), listingId, user?.id || null, studentName, studentPhone, studentNote]
    );
    return c.json({ message: 'Interest noted' }, 201);
  } finally {
    await db.end();
  }
});

// --- SSE ---
app.get('/api/events', (c) => {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send heartbeat every 10 seconds to keep connection alive
  const interval = setInterval(() => {
    writer.write(encoder.encode(': heartbeat\n\n')).catch(() => clearInterval(interval));
  }, 10000);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

export default app;
