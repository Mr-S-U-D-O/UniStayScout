import cors from 'cors';
import express from 'express';
import type { Response } from 'express';

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
    status: 'pending',
    adminComment: 'Please upload at least 3 interior photos.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 8
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
    token: nextId('token')
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
    token: nextId('token')
  });
});

app.get('/api/dashboard-summary', (req, res) => {
  const userId = String(req.query.userId || '');
  const account = accounts.find((item) => item.id === userId);

  if (!account) {
    res.status(404).json({ message: 'Account not found.' });
    return;
  }

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
  const schoolId = String(req.query.schoolId || '');
  const radiusKm = Number(req.query.radiusKm || 5);
  const role = String(req.query.role || 'student') as UserRole;
  const landlordId = String(req.query.landlordId || '');

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
    .map((item) => {
      const computedDistance = distanceKm(school.latitude, school.longitude, item.latitude, item.longitude);
      return {
        ...item,
        distanceKm: Number(computedDistance.toFixed(2))
      };
    })
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ data: mapped, total: mapped.length, school });
});

app.post('/api/listings', (req, res) => {
  const payload = req.body as Partial<Listing>;
  if (!payload.title || !payload.schoolId || !payload.landlordId || payload.price == null) {
    res.status(400).json({ message: 'title, schoolId, landlordId, and price are required.' });
    return;
  }

  const now = new Date().toISOString();
  const listing: Listing = {
    id: nextId('lst'),
    landlordId: payload.landlordId,
    landlordName: payload.landlordName || 'Landlord',
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
  const data = listings.filter((item) => item.status === 'pending');
  res.json({ data });
});

app.post('/api/admin/listings/:id/review', (req, res) => {
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
  const landlordId = req.params.landlordId;
  const data = listings.filter((item) => item.landlordId === landlordId);
  res.json({ data });
});

app.post('/api/interests', (req, res) => {
  const { listingId, studentUserId, studentName, studentPhone, studentNote } = req.body as Partial<Interest>;
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
    studentUserId,
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
