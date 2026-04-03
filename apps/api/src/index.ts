import cors from 'cors';
import express from 'express';
import type { Response } from 'express';
import crypto from 'crypto';

const app = express();
const port = Number(process.env.PORT || 4000);

type UserRole = 'student' | 'landlord' | 'admin';

type School = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
};

type ListingStatus = 'pending' | 'approved' | 'rejected';

type Listing = {
  id: string;
  landlordId: string;
  landlordName: string;
  title: string;
  description: string;
  schoolId: string;
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
  password: string;
  role: AccountRole;
  landlordId?: string;
  createdAt: string;
};

type AuthContext = {
  account: Account;
  role: AccountRole;
};

const schools: School[] = [
  {
    id: 'uj-auckland-park',
    name: 'University of Johannesburg - Auckland Park',
    city: 'Johannesburg',
    latitude: -26.1829,
    longitude: 27.9994
  },
  {
    id: 'wits-braamfontein',
    name: 'University of the Witwatersrand - Braamfontein',
    city: 'Johannesburg',
    latitude: -26.1929,
    longitude: 28.0305
  }
];

const listings: Listing[] = [
  {
    id: 'lst-1',
    landlordId: 'landlord-1',
    landlordName: 'Bright Rooms SA',
    title: 'Melville Student Loft',
    description: 'Private room with study desk, fast wifi, and secure access.',
    schoolId: 'uj-auckland-park',
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

const interests: Interest[] = [];
const reviews: Review[] = [];

const accounts: Account[] = [
  {
    id: 'usr-admin-1',
    name: 'System Admin',
    email: 'admin@unistayscout.local',
    phone: '+27 11 000 0001',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-landlord-1',
    name: 'Bright Rooms SA',
    email: 'landlord@unistayscout.local',
    phone: '+27 11 000 0002',
    password: 'landlord123',
    role: 'landlord',
    landlordId: 'landlord-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-student-1',
    name: 'Lerato Student',
    email: 'student@unistayscout.local',
    phone: '+27 71 000 1234',
    password: 'student123',
    role: 'student',
    createdAt: new Date().toISOString()
  }
];

const sseClients = new Set<Response>();
const tokenSecret = process.env.AUTH_TOKEN_SECRET || 'unistayscout-dev-secret';
const tokenTtlSeconds = 60 * 60 * 12;

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

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
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

app.get('/api/schools', (_req, res) => {
  res.json({ data: schools });
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

app.post('/api/auth/register', (req, res) => {
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
    password,
    role,
    landlordId: role === 'landlord' ? nextId('landlord') : undefined,
    createdAt: now
  };

  accounts.push(account);
  notify('account-created', { accountId: account.id, role: account.role });

  res.status(201).json({
    data: toPublicAccount(account),
    token: createAccessToken(account)
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required.' });
    return;
  }

  const account = accounts.find((item) => item.email === email.trim().toLowerCase() && item.password === password);
  if (!account) {
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

app.get('/api/listings', (req, res) => {
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

app.post('/api/listings', (req, res) => {
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

  const now = new Date().toISOString();
  const listing: Listing = {
    id: nextId('lst'),
    landlordId: auth.account.landlordId,
    landlordName: auth.account.name || payload.landlordName || 'Landlord',
    title: payload.title,
    description: payload.description || 'Description pending update.',
    schoolId: payload.schoolId,
    latitude: Number(payload.latitude || schools[0].latitude),
    longitude: Number(payload.longitude || schools[0].longitude),
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

app.post('/api/admin/listings/:id/review', (req, res) => {
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

app.post('/api/interests', (req, res) => {
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

app.post('/api/listings/:id/reviews', (req, res) => {
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

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
