import { Hono } from 'hono';
import { cors } from 'hono/cors';
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

app.use('*', cors({
  origin: (origin, c) => {
    const configured = (c.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (configured.length === 0) {
      // Fallback keeps local dev working when no allowlist is configured.
      return '*';
    }

    return origin && configured.includes(origin) ? origin : null;
  },
  allowHeaders: ['Authorization', 'Content-Type']
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

type TokenPayload = {
  userId: string;
  role: AccountRole;
  exp: number;
};

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

function resolveAuthSecret(c: any): string | null {
  const secret = String(c.env.AUTH_TOKEN_SECRET || '').trim();
  if (secret.length < 32) {
    return null;
  }
  return secret;
}

async function getAccountFromToken(c: any) {
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
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role as AccountRole,
      landlordId: row.landlord_id,
      isSuperUser: row.is_super_user
    };
  } catch {
    return null;
  }
}

async function createToken(account: any, c: any) {
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

// --- Schools ---
app.get('/api/schools', async (c) => {
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query('SELECT * FROM schools');
    return c.json({ data: result.rows });
  } finally {
    await db.end();
  }
});

// --- Listings ---
app.get('/api/listings', async (c) => {
  const requestedStatus = c.req.query('status') || 'approved';
  const allowedStatuses: ListingStatus[] = ['pending', 'approved', 'rejected'];
  const status = allowedStatuses.includes(requestedStatus as ListingStatus)
    ? (requestedStatus as ListingStatus)
    : 'approved';

  if (status !== 'approved') {
    const user = await getAccountFromToken(c);
    if (!user || user.role !== 'admin') {
      return c.json({ message: 'Forbidden' }, 403);
    }
  }

  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query('SELECT * FROM listings WHERE status = $1', [status]);
    return c.json({ data: result.rows.map(r => ({
      ...r,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      price: Number(r.price),
      amenities: r.amenities || [],
      photos: r.photos || []
    }))});
  } finally {
    await db.end();
  }
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
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
    return c.json({ data: result.rows[0] || {} });
  } finally {
    await db.end();
  }
});

app.put('/api/profile', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);
  const data = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    await db.query(`INSERT INTO profiles (user_id, bio, budget, prefs) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET bio = $2, budget = $3, prefs = $4`,
      [user.id, data.bio, data.budget, JSON.stringify(data.prefs)]
    );
    return c.json({ data });
  } finally {
    await db.end();
  }
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
