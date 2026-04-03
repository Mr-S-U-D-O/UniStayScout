import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Pool } from '@neondatabase/serverless';
import { compare, hash } from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';

// ─── Types ──────────────────────────────────────────────────────────────────

type UserRole = 'student' | 'landlord' | 'admin';
type ListingStatus = 'pending' | 'approved' | 'rejected';
type InterestHandoffStatus = 'new' | 'landlord-notified';
type InterestHandoffChannel = 'call' | 'sms' | 'whatsapp' | 'email';
type AccountRole = 'student' | 'landlord' | 'admin';

type School = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  source?: 'seed' | 'osm';
  address?: string;
};

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
  handoffStatus: InterestHandoffStatus;
  handedOffAt?: string;
  handoffChannel?: InterestHandoffChannel;
  handoffNote: string;
  handedOffByAdminId?: string;
  createdAt: string;
};

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: AccountRole;
  landlordId?: string;
  isSuperUser?: boolean;
  createdAt: string;
};

type Bindings = {
  DATABASE_URL: string;
  AUTH_TOKEN_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  GOOGLE_GENAI_API_KEY?: string;
  NODE_ENV?: string;
};

// ─── Initialization ──────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// SSE State (Workers are stateless, so this only works per-isolate/request)
// For true global SSE on Cloudflare, one would use Durable Objects.
// For now, we'll provide a stub or basic stream.
const sseStreams = new Set<ReadableStreamDefaultController>();

// ─── Helpers ────────────────────────────────────────────────────────────────

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

async function getAccountFromToken(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  
  try {
    // JWT Parsing (Base64 only for this prototype, use real verification in prod)
    const [header, payloadB64, sig] = token.split('.');
    const payload = JSON.parse(atob(payloadB64)) as { userId: string; exp: number };
    
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
      passwordHash: row.password_hash,
      role: row.role as AccountRole,
      landlordId: row.landlord_id,
      isSuperUser: row.is_super_user,
      createdAt: row.created_at
    };
  } catch {
    return null;
  }
}

function createToken(account: Account) {
  const payload = {
    userId: account.id,
    role: account.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h
  };
  return `${btoa(JSON.stringify({alg: "HS256", typ: "JWT"}))}.${btoa(JSON.stringify(payload))}.signature_stub`;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

app.get('/', (c) => c.text('UniStayScout Edge API (Hono)'));

// --- Authentication ---

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json();
  const { name, email, phone, password, role } = body;
  
  if (!name || !email || !password || !role) {
    return c.json({ message: 'Missing required fields' }, 400);
  }

  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const passwordHash = await hash(password, 10);
    const id = nextId('usr');
    const landlordId = role === 'landlord' ? nextId('landlord') : null;
    
    const result = await db.query(
      `INSERT INTO accounts (id, name, email, phone, password_hash, role, landlord_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [id, name, email.toLowerCase().trim(), phone, passwordHash, role, landlordId]
    );
    
    const account = result.rows[0];
    return c.json({
      data: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        landlordId: account.landlord_id
      },
      token: createToken(account as any)
    }, 201);
  } catch (err: any) {
    if (err.code === '23505') return c.json({ message: 'Email already registered' }, 409);
    console.error(err);
    return c.json({ message: 'Registration failed' }, 500);
  } finally {
    await db.end();
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  
  try {
    const result = await db.query('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) return c.json({ message: 'Invalid credentials' }, 401);
    
    const account = result.rows[0];
    const match = await compare(password, account.password_hash);
    if (!match) return c.json({ message: 'Invalid credentials' }, 401);
    
    return c.json({
      data: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        landlordId: account.landlord_id,
        isSuperUser: account.is_super_user
      },
      token: createToken(account as any)
    });
  } finally {
    await db.end();
  }
});

// --- Listings ---

app.get('/api/listings', async (c) => {
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const status = c.req.query('status') || 'approved';
    const result = await db.query('SELECT * FROM listings WHERE status = $1 ORDER BY created_at DESC', [status]);
    return c.json({ data: result.rows.map(row => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      price: Number(row.price),
      amenities: row.amenities || [],
      photos: row.photos || []
    }))});
  } finally {
    await db.end();
  }
});

app.post('/api/listings', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'landlord') return c.json({ message: 'Unauthorized' }, 401);

  const data = await c.req.json();
  const id = nextId('lst');
  const db = new Pool({ connectionString: c.env.DATABASE_URL });

  try {
    await db.query(
      `INSERT INTO listings (id, landlord_id, landlord_name, title, description, school_id, location_label, latitude, longitude, price, room_type, amenities, photos, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW(), NOW())`,
      [id, user.landlordId, user.name, data.title, data.description, data.schoolId, data.locationLabel, data.latitude, data.longitude, data.price, data.roomType, JSON.stringify(data.amenities), JSON.stringify(data.photos)]
    );
    return c.json({ data: { id } }, 201);
  } finally {
    await db.end();
  }
});

// --- Media ---

app.post('/api/media/upload', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const formData = await c.req.parseBody();
  const file = formData['file'] as File;
  
  if (!file) return c.json({ message: 'No file provided' }, 400);

  // Cloudinary Signed Upload
  const timestamp = Math.round(Date.now() / 1000);
  const signatureStr = `timestamp=${timestamp}${c.env.CLOUDINARY_API_SECRET}`;
  
  // Use SubtleCrypto to hash the signature for production
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureStr);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const cloudinaryForm = new FormData();
  cloudinaryForm.append('file', file);
  cloudinaryForm.append('timestamp', timestamp.toString());
  cloudinaryForm.append('api_key', c.env.CLOUDINARY_API_KEY);
  cloudinaryForm.append('signature', signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: cloudinaryForm
    });
    
    const result = await res.json() as any;
    if (result.secure_url) {
      return c.json({ data: { url: result.secure_url } });
    }
    return c.json({ message: 'Cloudinary upload failed', error: result }, 500);
  } catch (err) {
    return c.json({ message: 'Upload error', error: String(err) }, 500);
  }
});

// --- Admin ---

app.get('/api/admin/pending-listings', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);

  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query("SELECT * FROM listings WHERE status = 'pending' ORDER BY created_at ASC");
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
    await db.query(
      "UPDATE listings SET status = $1, admin_comment = $2, updated_at = NOW() WHERE id = $3",
      [decision, comment, id]
    );
    return c.json({ message: 'Listing reviewed successfully' });
  } finally {
    await db.end();
  }
});

app.get('/api/admin/interests', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);

  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const result = await db.query(`
      SELECT i.*, l.title as listing_title, l.landlord_name, a.phone as landlord_phone, a.email as landlord_email
      FROM interests i
      JOIN listings l ON i.listing_id = l.id
      JOIN accounts a ON l.landlord_id = a.landlord_id
      ORDER BY i.created_at DESC
    `);
    return c.json({ data: result.rows.map(row => ({
      id: row.id,
      listingId: row.listing_id,
      listingTitle: row.listing_title,
      studentName: row.student_name,
      studentPhone: row.student_phone,
      studentNote: row.student_note,
      landlordName: row.landlord_name,
      landlordPhone: row.landlord_phone,
      landlordEmail: row.landlord_email,
      handoffStatus: row.handoff_status,
      handedOffAt: row.handed_off_at,
      createdAt: row.created_at
    }))});
  } finally {
    await db.end();
  }
});

app.post('/api/admin/leads/:id/handoff', async (c) => {
  const user = await getAccountFromToken(c);
  if (!user || user.role !== 'admin') return c.json({ message: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const { handoffChannel, handoffNote } = await c.req.json();
  
  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    await db.query(
      `UPDATE interests 
       SET handoff_status = 'landlord-notified', 
           handed_off_at = NOW(), 
           handoff_channel = $1, 
           handoff_note = $2, 
           handed_off_by_admin_id = $3 
       WHERE id = $4`,
      [handoffChannel, handoffNote, user.id, id]
    );
    return c.json({ message: 'Lead handed off successfully' });
  } finally {
    await db.end();
  }
});

// --- Students ---

app.post('/api/listings/:id/interest', async (c) => {
  const user = await getAccountFromToken(c);
  const listingId = c.req.param('id');
  const { studentName, studentPhone, studentNote } = await c.req.json();

  const db = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    const id = nextId('int');
    await db.query(
      `INSERT INTO interests (id, listing_id, student_user_id, student_name, student_phone, student_note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, listingId, user?.id || null, studentName, studentPhone, studentNote]
    );
    return c.json({ message: 'Interest registered' }, 201);
  } finally {
    await db.end();
  }
});

// --- SSE ---
app.get('/api/events', (c) => {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Basic keep-alive and initial connection
  writer.write(encoder.encode('event: connected\ndata: {"ok": true}\n\n'));

  // Logic to keep the stream alive or push events would go here.
  // In a real worker, you might use a Durable Object to track many SSE streams.

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

export default app;
