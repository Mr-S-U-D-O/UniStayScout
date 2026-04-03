import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Role = 'student' | 'landlord' | 'admin';

type School = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
};

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
  status: 'pending' | 'approved' | 'rejected';
  adminComment: string;
  distanceKm: number;
  views: number;
};

type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type Interest = {
  id: string;
  listingTitle: string;
  studentName: string;
  studentPhone: string;
  createdAt: string;
  studentNote: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  message: string;
};

type AuthRole = 'student' | 'landlord' | 'admin';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AuthRole;
  landlordId?: string;
};

type AuthSession = {
  user: AuthUser;
  token: string;
};

type DashboardCard = {
  label: string;
  value: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const AUTH_STORAGE_KEY = 'unistayscout-auth-user';
const AUTH_SESSION_KEY = 'unistayscout-auth-session';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const highlightedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const amenityOptions = ['wifi', 'security', 'laundry', 'parking', 'backup-power'];

function MapViewportController({
  selectedSchool,
  selectedListing,
  listings
}: {
  selectedSchool?: School;
  selectedListing: Listing | null;
  listings: Listing[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedListing) {
      map.setView([selectedListing.latitude, selectedListing.longitude], Math.max(map.getZoom(), 14), {
        animate: true
      });
      return;
    }

    if (listings.length > 0) {
      const bounds = L.latLngBounds(listings.map((item) => [item.latitude, item.longitude] as [number, number]));
      if (selectedSchool) {
        bounds.extend([selectedSchool.latitude, selectedSchool.longitude]);
      }
      map.fitBounds(bounds, { padding: [35, 35], animate: true });
      return;
    }

    if (selectedSchool) {
      map.setView([selectedSchool.latitude, selectedSchool.longitude], 13, { animate: true });
    }
  }, [map, selectedListing, listings, selectedSchool]);

  return null;
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<Array<{ role: string; email: string; password: string }>>([]);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'student' as Exclude<AuthRole, 'admin'>
  });

  const role: Role = (authUser?.role || 'student') as Role;
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('uj-auckland-park');
  const [radiusKm, setRadiusKm] = useState(5);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(7000);
  const [listingRoomTypeFilter, setListingRoomTypeFilter] = useState<'any' | 'private' | 'shared'>('any');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'price-asc' | 'price-desc'>('distance');
  const [mapTheme, setMapTheme] = useState<'street' | 'terrain'>('street');
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [landlordListings, setLandlordListings] = useState<Listing[]>([]);

  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentBudget, setStudentBudget] = useState(4500);
  const [studentRoomType, setStudentRoomType] = useState<'private' | 'shared' | 'any'>('any');

  const landlordId = authUser?.landlordId || '';
  const [landlordName, setLandlordName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState(3500);
  const [newRoomType, setNewRoomType] = useState<'private' | 'shared'>('private');
  const [newAmenities, setNewAmenities] = useState('wifi,security');

  const [chatInput, setChatInput] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      message:
        'I can help you shortlist places. Start by selecting your school and I will suggest options on the map.'
    }
  ]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('Live updates connected.');
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);

  const selectedSchool = useMemo(
    () => schools.find((item) => item.id === selectedSchoolId) || schools[0],
    [schools, selectedSchoolId]
  );

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedListingId) || null,
    [listings, selectedListingId]
  );

  useEffect(() => {
    const savedSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession) as AuthSession;
        setAuthUser(parsedSession.user);
        setAuthToken(parsedSession.token || '');
        setStudentName(parsedSession.user.name || '');
        setStudentPhone(parsedSession.user.phone || '');
        setLandlordName(parsedSession.user.name || '');
        return;
      } catch {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    }

    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as AuthUser;
      setAuthUser(parsed);
      setStudentName(parsed.name || '');
      setStudentPhone(parsed.phone || '');
      setLandlordName(parsed.name || '');
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    apiGet<{ data: Array<{ role: string; email: string; password: string }> }>('/api/auth/demo-accounts')
      .then((response) => setDemoAccounts(response.data))
      .catch(() => setDemoAccounts([]));
  }, []);

  async function loadDashboardSummary(): Promise<void> {
    if (!authUser?.id || !authToken) {
      setDashboardCards([]);
      return;
    }

    const response = await apiGet<{ data: { cards: DashboardCard[] } }>('/api/dashboard-summary', authToken);
    setDashboardCards(response.data.cards || []);
  }

  async function submitLogin(): Promise<void> {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await apiPost<{ data: AuthUser; token: string }>('/api/auth/login', {
        email: authForm.email,
        password: authForm.password
      });

      setAuthUser(response.data);
      setAuthToken(response.token || '');
      setStudentName(response.data.name || '');
      setStudentPhone(response.data.phone || '');
      setLandlordName(response.data.name || '');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.data));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: response.data, token: response.token }));
      setStatusMessage(`Welcome back, ${response.data.name}.`);
      setAuthForm((current) => ({ ...current, password: '' }));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function submitRegister(): Promise<void> {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await apiPost<{ data: AuthUser; token: string }>('/api/auth/register', {
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone,
        password: authForm.password,
        role: authForm.role
      });

      setAuthUser(response.data);
      setAuthToken(response.token || '');
      setStudentName(response.data.name || '');
      setStudentPhone(response.data.phone || '');
      setLandlordName(response.data.name || '');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.data));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: response.data, token: response.token }));
      setStatusMessage(`Account created for ${response.data.role}.`);
      setAuthForm((current) => ({ ...current, password: '' }));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  function logout(): void {
    setAuthUser(null);
    setAuthToken('');
    setDashboardCards([]);
    setListings([]);
    setSelectedListingId('');
    setAuthForm((current) => ({ ...current, password: '' }));
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  async function loadListings(): Promise<void> {
    if (!authUser || !authToken) {
      setListings([]);
      return;
    }

    const params = new URLSearchParams({
      schoolId: selectedSchoolId,
      radiusKm: String(radiusKm),
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
      roomType: listingRoomTypeFilter,
      verifiedOnly: String(verifiedOnly),
      sortBy,
      amenities: selectedAmenities.join(',')
    });

    const response = await apiGet<{ data: Listing[] }>(`/api/listings?${params.toString()}`, authToken);
    setListings(response.data);
    if (!selectedListingId && response.data.length > 0) {
      setSelectedListingId(response.data[0].id);
    }
  }

  function toggleAmenity(amenity: string): void {
    setSelectedAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]
    );
  }

  async function loadAdminData(): Promise<void> {
    const [pending, leadData] = await Promise.all([
      apiGet<{ data: Listing[] }>('/api/admin/pending-listings', authToken),
      apiGet<{ data: Interest[] }>('/api/admin/interests', authToken)
    ]);
    setPendingListings(pending.data);
    setInterests(leadData.data);
  }

  async function loadLandlordData(): Promise<void> {
    if (!landlordId) {
      setLandlordListings([]);
      return;
    }
    const response = await apiGet<{ data: Listing[] }>(`/api/landlords/${landlordId}/listings`, authToken);
    setLandlordListings(response.data);
  }

  async function loadReviews(listingId: string): Promise<void> {
    const response = await apiGet<{ data: Review[] }>(`/api/listings/${listingId}/reviews`, authToken);
    setReviews(response.data);
  }

  async function refreshForRole(): Promise<void> {
    if (!authUser || !authToken) {
      return;
    }

    await loadListings();
    await loadDashboardSummary();
    if (role === 'admin') {
      await loadAdminData();
    }
    if (role === 'landlord') {
      await loadLandlordData();
    }
  }

  useEffect(() => {
    if (!authUser) {
      return;
    }

    apiGet<{ data: School[] }>('/api/schools')
      .then((response) => {
        setSchools(response.data);
        if (response.data.length > 0) {
          setSelectedSchoolId(response.data[0].id);
        }
      })
      .catch(() => setStatusMessage('Unable to load schools. Check API server.'));
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    if (!selectedSchoolId) {
      return;
    }
    refreshForRole().catch(() => setStatusMessage('Data refresh failed.'));
  }, [authUser, authToken, selectedSchoolId, radiusKm, minPrice, maxPrice, listingRoomTypeFilter, verifiedOnly, sortBy, selectedAmenities, role]);

  useEffect(() => {
    if (!selectedListingId) {
      setReviews([]);
      return;
    }
    loadReviews(selectedListingId).catch(() => setReviews([]));
  }, [selectedListingId]);

  useEffect(() => {
    if (!authUser || !authToken) {
      return;
    }

    const source = new EventSource(`${API_BASE}/api/events`);

    source.addEventListener('connected', () => {
      setStatusMessage('Live updates connected.');
    });

    source.addEventListener('listing-created', () => {
      refreshForRole().catch(() => setStatusMessage('Live refresh failed.'));
    });

    source.addEventListener('listing-reviewed', () => {
      refreshForRole().catch(() => setStatusMessage('Live refresh failed.'));
    });

    source.addEventListener('interest-created', () => {
      if (role === 'admin') {
        loadAdminData().catch(() => setStatusMessage('Admin leads refresh failed.'));
      }
    });

    source.addEventListener('review-created', () => {
      if (selectedListingId) {
        loadReviews(selectedListingId).catch(() => setReviews([]));
      }
    });

    source.onerror = () => {
      setStatusMessage('Live updates disconnected. Retrying...');
    };

    return () => source.close();
  }, [authUser, authToken, role, selectedListingId, selectedSchoolId, radiusKm]);

  async function askAssistant(message: string): Promise<void> {
    const nextChat = [...chat, { role: 'user' as const, message }];
    setChat(nextChat);

    const response = await apiPost<{
      questions: string[];
      recommendedListingIds: string[];
      rationale: string;
    }>('/api/ai/recommendations', {
      profile: { name: studentName, budget: studentBudget, roomType: studentRoomType },
      mapContext: { schoolId: selectedSchoolId, radiusKm },
      conversation: nextChat
    }, authToken);

    setRecommendedIds(response.recommendedListingIds);
    setAiQuestions(response.questions);
    setChat((current) => [...current, { role: 'assistant', message: response.rationale }]);

    if (response.recommendedListingIds.length > 0) {
      setSelectedListingId(response.recommendedListingIds[0]);
    }
  }

  async function submitInterest(): Promise<void> {
    if (!selectedListing || !authUser || !authToken) {
      return;
    }

    await apiPost('/api/interests', {
      listingId: selectedListing.id,
      studentName,
      studentPhone,
      studentNote: `Interested in ${selectedListing.title}`
    }, authToken);
    setStatusMessage('Interest submitted. Admin can now follow up with the landlord.');
  }

  async function submitReview(formData: FormData): Promise<void> {
    if (!selectedListing) {
      return;
    }

    const author = String(formData.get('author') || 'Anonymous');
    const rating = Number(formData.get('rating') || 5);
    const comment = String(formData.get('comment') || '');

    await apiPost(`/api/listings/${selectedListing.id}/reviews`, {
      author,
      rating,
      comment
    }, authToken);
    setStatusMessage('Review added.');
  }

  async function createListing(): Promise<void> {
    if (!authUser || !landlordId || !authToken) {
      setStatusMessage('Please login as a landlord to submit listings.');
      return;
    }

    await apiPost('/api/listings', {
      landlordName,
      schoolId: selectedSchoolId,
      title: newTitle,
      description: newDescription,
      price: newPrice,
      roomType: newRoomType,
      amenities: newAmenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      latitude: selectedSchool?.latitude ? selectedSchool.latitude + 0.01 : -26.18,
      longitude: selectedSchool?.longitude ? selectedSchool.longitude + 0.01 : 27.99
    }, authToken);

    setNewTitle('');
    setNewDescription('');
    setStatusMessage('Listing submitted for admin review.');
    await loadLandlordData();
    await refreshForRole();
  }

  async function reviewListing(id: string, decision: 'approved' | 'rejected', comment: string): Promise<void> {
    await apiPost(`/api/admin/listings/${id}/review`, { decision, comment }, authToken);
    setStatusMessage(`Listing ${decision}.`);
    await loadAdminData();
    await refreshForRole();
  }

  if (!authUser) {
    return (
      <main className="auth-screen">
        <section className="auth-hero panel">
          <p className="eyebrow">Map-first Housing Intelligence</p>
          <h1>UniStayScout</h1>
          <p className="hero-copy">Sign in to access your role-specific dashboard and map workspace.</p>
          <ul>
            <li>Students: discover listings on a live school-centered map.</li>
            <li>Landlords: publish properties and track moderation status.</li>
            <li>Admins: approve listings and manage incoming leads.</li>
          </ul>

          {demoAccounts.length > 0 && (
            <div className="demo-box">
              <h3>Demo Accounts</h3>
              {demoAccounts.map((account) => (
                <p key={account.email}>
                  <strong>{account.role}:</strong> {account.email} / {account.password}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="auth-card panel">
          <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <div className="auth-tabs">
            <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Create Account
            </button>
          </div>

          {authMode === 'register' && (
            <label>
              Role
              <select
                value={authForm.role}
                onChange={(event) =>
                  setAuthForm((current) => ({
                    ...current,
                    role: event.target.value as Exclude<AuthRole, 'admin'>
                  }))
                }
              >
                <option value="student">Student</option>
                <option value="landlord">Landlord</option>
              </select>
            </label>
          )}

          {authMode === 'register' && (
            <label>
              Full Name
              <input
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          {authMode === 'register' && (
            <label>
              Phone
              <input
                value={authForm.phone}
                onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>

          {authError && <p className="auth-error">{authError}</p>}

          {authMode === 'login' ? (
            <button type="button" disabled={authLoading} onClick={() => submitLogin()}>
              {authLoading ? 'Logging in...' : 'Login'}
            </button>
          ) : (
            <button type="button" disabled={authLoading} onClick={() => submitRegister()}>
              {authLoading ? 'Creating account...' : 'Create Account'}
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar panel">
        <div className="topbar-info">
          <span className="eyebrow">Live Workspace</span>
          <h1>UniStayScout</h1>
          <div className="user-badge">
            <span className="role-tag">{authUser.role}</span>
            {authUser.name}
          </div>
        </div>
        <div className="topbar-controls">
          <label>
            School
            <select className="tool-btn" value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Radius: {radiusKm}km
            <input
              type="range"
              min={1}
              max={15}
              value={radiusKm}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
            />
          </label>
          <label>
            Sort
            <select className="tool-btn" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'distance' | 'price-asc' | 'price-desc')}>
              <option value="distance">Nearest first</option>
              <option value="price-asc">Cheapest first</option>
              <option value="price-desc">Most expensive first</option>
            </select>
          </label>
          <label>
            Map Theme
            <select className="tool-btn" value={mapTheme} onChange={(event) => setMapTheme(event.target.value as 'street' | 'terrain')}>
              <option value="street">Street</option>
              <option value="terrain">Terrain</option>
            </select>
          </label>
          <button type="button" className="danger outline" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="status-line">{statusMessage}</section>

      {dashboardCards.length > 0 && (
        <section className="summary-grid">
          {dashboardCards.map((card) => (
            <article key={card.label} className="summary-card panel">
              <p className="summary-label">{card.label}</p>
              <h3>{card.value}</h3>
            </article>
          ))}
        </section>
      )}

      <section className="workspace-grid">
        <aside className="left-sidebar">
          {role === 'student' && (
            <>
              <div className="section-card">
                <div className="section-head">
                  <h2>AI Assistant</h2>
                  <p className="muted">Context-aware recommendations from your map filters.</p>
                </div>

                <div className="profile-fields">
                  <div className="form-row">
                    <label>
                      Name
                      <input value={studentName} onChange={(event) => setStudentName(event.target.value)} />
                    </label>
                    <label>
                      Phone
                      <input value={studentPhone} onChange={(event) => setStudentPhone(event.target.value)} />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Budget (ZAR)
                      <input
                        type="number"
                        value={studentBudget}
                        onChange={(event) => setStudentBudget(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Room type
                      <select
                        value={studentRoomType}
                        onChange={(event) => setStudentRoomType(event.target.value as 'private' | 'shared' | 'any')}
                      >
                        <option value="any">Any</option>
                        <option value="private">Private</option>
                        <option value="shared">Shared</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <section className="section-card">
                <h3>Map Filters</h3>
                <div className="filter-grid">
                  <label>
                    Min price (ZAR)
                    <input type="number" value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value) || 0)} />
                  </label>
                  <label>
                    Max price (ZAR)
                    <input type="number" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value) || 0)} />
                  </label>
                  <label>
                    Room filter
                    <select
                      value={listingRoomTypeFilter}
                      onChange={(event) => setListingRoomTypeFilter(event.target.value as 'any' | 'private' | 'shared')}
                    >
                      <option value="any">Any</option>
                      <option value="private">Private only</option>
                      <option value="shared">Shared only</option>
                    </select>
                  </label>
                  <label className="check-line">
                    <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
                    Verified listings only
                  </label>
                </div>

                <div className="amenity-chips">
                  {amenityOptions.map((amenity) => (
                    <div
                      key={amenity}
                      className={selectedAmenities.includes(amenity) ? 'chip active' : 'chip'}
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {amenity}
                    </div>
                  ))}
                </div>
              </section>

              <div className="section-card">
                <h3>Chat with AI</h3>
                <div className="chat-container">
                  <div className="chat-box">
                    {chat.map((item, index) => (
                      <div key={`${item.role}-${index}`} className={`chat-row ${item.role}`}>
                        {item.message}
                      </div>
                    ))}
                  </div>

                  <form
                    className="chat-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!chatInput.trim()) {
                        return;
                      }
                      askAssistant(chatInput).catch(() => setStatusMessage('Assistant request failed.'));
                      setChatInput('');
                    }}
                  >
                    <input
                      placeholder="Ask for closer, cheaper, or safer options..."
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                    />
                    <button type="submit">Ask</button>
                  </form>
                </div>

                {aiQuestions.length > 0 && (
                  <div className="ai-questions">
                    <h3>Clarifying Questions</h3>
                    {aiQuestions.map((question) => (
                      <p key={question}>{question}</p>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {role === 'landlord' && (
            <>
              <div className="section-card">
                <div className="section-head">
                  <h2>Landlord Dashboard</h2>
                  <p className="muted">Create listings and track moderation status.</p>
                </div>
                <div className="profile-fields">
                  <label>
                    Display Name
                    <input value={landlordName} onChange={(event) => setLandlordName(event.target.value)} />
                  </label>
                  <label>
                    Listing Title
                    <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
                  </label>
                  <label>
                    Description
                    <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
                  </label>
                  <div className="form-row">
                    <label>
                      Price (ZAR)
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(event) => setNewPrice(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Room type
                      <select value={newRoomType} onChange={(event) => setNewRoomType(event.target.value as 'private' | 'shared')}>
                        <option value="private">Private</option>
                        <option value="shared">Shared</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Amenities (comma separated)
                    <input value={newAmenities} onChange={(event) => setNewAmenities(event.target.value)} />
                  </label>
                  <button type="button" onClick={() => createListing().catch(() => setStatusMessage('Listing creation failed.'))}>
                    Submit for Review
                  </button>
                </div>
              </div>

              <div className="section-card">
                <h3>Your Listings</h3>
                <div className="stack-list">
                  {landlordListings.map((item) => (
                    <article key={item.id} className={`stack-card status-${item.status}`}>
                      <p>
                        <strong>{item.title}</strong> - <span className="price-tag">{item.price} {item.currency}</span>
                      </p>
                      <p>Status: <span className={`status-badge ${item.status}`}>{item.status}</span></p>
                      <p className="muted">Admin: {item.adminComment || 'No comments'}</p>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="section-card">
                <div className="section-head">
                  <h2>Admin Moderation</h2>
                  <p className="muted">Approve listings and monitor incoming student leads.</p>
                </div>
                <h3>Pending Listings</h3>
                <div className="stack-list">
                  {pendingListings.length === 0 && <p className="muted">No pending listings.</p>}
                  {pendingListings.map((item) => (
                    <article key={item.id} className="stack-card">
                      <p>
                        <strong>{item.title}</strong> - {item.landlordName}
                      </p>
                      <p>{item.description}</p>
                      <div className="actions-row">
                        <button
                          type="button"
                          onClick={() => reviewListing(item.id, 'approved', 'Approved. Listing quality meets requirements.')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="danger outline"
                          onClick={() => reviewListing(item.id, 'rejected', 'Please add clearer photos and nearby amenities.')}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="section-card">
                <h3>Student Interest Leads</h3>
                <div className="stack-list">
                  {interests.length === 0 && <p className="muted">No leads yet.</p>}
                  {interests.map((lead) => (
                    <article key={lead.id} className="stack-card">
                      <p>
                        <strong>{lead.studentName}</strong> {'->'} {lead.listingTitle}
                      </p>
                      <p>Phone: {lead.studentPhone}</p>
                      <p className="muted">{new Date(lead.createdAt).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>

        <section className="map-pane panel">
          <div className="map-head">
            <div>
              <h2>Explore on Map</h2>
              <p className="muted">
                {selectedSchool?.name || 'School'} • {listings.length} listing{listings.length === 1 ? '' : 's'} in view
              </p>
            </div>
            <span className="meta-pill">AI highlighted: {recommendedIds.length}</span>
          </div>
          {selectedSchool && (
            <MapContainer
              className="map-canvas"
              center={[selectedSchool.latitude, selectedSchool.longitude]}
              zoom={13}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={
                  mapTheme === 'street'
                    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    : 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                }
              />

              <MapViewportController selectedSchool={selectedSchool} selectedListing={selectedListing} listings={listings} />

              <Circle
                center={[selectedSchool.latitude, selectedSchool.longitude]}
                radius={radiusKm * 1000}
                pathOptions={{ color: '#1276d1', fillOpacity: 0.08 }}
              />

              {listings.map((item) => (
                <Marker
                  key={item.id}
                  icon={recommendedIds.includes(item.id) ? highlightedIcon : defaultIcon}
                  position={[item.latitude, item.longitude]}
                  eventHandlers={{
                    click: () => setSelectedListingId(item.id)
                  }}
                >
                  <Popup>
                    <strong>{item.title}</strong>
                    <br />
                    {item.price} {item.currency} - {item.distanceKm?.toFixed(1)}km
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </section>

        <aside className="detail-pane">
          {!selectedListing && (
            <div className="section-card">
              <p>Select a listing pin to view details.</p>
            </div>
          )}
          {selectedListing && (
            <>
              <div className="section-card">
                <img src={selectedListing.photos[0]} alt={selectedListing.title} className="listing-photo" />
                <h2>{selectedListing.title}</h2>
                <div className="listing-meta-row">
                  <span className="meta-pill">{selectedListing.roomType}</span>
                  <span className="meta-pill">{selectedListing.distanceKm?.toFixed(1)} km</span>
                  <span className="meta-pill">{selectedListing.views} views</span>
                  <span className="meta-pill">{selectedListing.availableBeds} beds</span>
                  {selectedListing.isVerified && <span className="meta-pill verified">Verified</span>}
                </div>
                <div className="price-tag">
                  {selectedListing.price} {selectedListing.currency}
                </div>
                <p>
                  {selectedListing.distanceKm?.toFixed(1)}km from school
                </p>
                <p className="muted">{selectedListing.description}</p>

                <div className="profile-fields detail-facts">
                  <p>
                    <strong>Room:</strong> {selectedListing.roomType}
                  </p>
                  <p>
                    <strong>Amenities:</strong> {selectedListing.amenities.join(', ')}
                  </p>
                  <p>
                    <strong>Landlord:</strong> {selectedListing.landlordName}
                  </p>
                </div>

                {role === 'student' && (
                  <button
                    type="button"
                    className="full-width-btn"
                    onClick={() => submitInterest().catch(() => setStatusMessage('Interest submit failed.'))}
                  >
                    I am Interested
                  </button>
                )}
              </div>

              <div className="section-card">
                <h3>Ratings & Comments</h3>
                <div className="stack-list">
                  {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
                  {reviews.map((item) => (
                    <article key={item.id} className="stack-card">
                      <p>
                        <strong>{item.author}</strong> - <span className="status-badge approved">{item.rating}/5</span>
                      </p>
                      <p>{item.comment}</p>
                    </article>
                  ))}
                </div>

                {role === 'student' && (
                <form
                  className="review-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    submitReview(formData)
                      .then(() => {
                        (event.currentTarget as HTMLFormElement).reset();
                      })
                      .catch(() => setStatusMessage('Review submit failed.'));
                  }}
                >
                  <input name="author" defaultValue={studentName} placeholder="Your name" required />
                  <input
                    name="rating"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={5}
                    placeholder="Rating 1-5"
                    title="Rating from 1 to 5"
                    required
                  />
                  <textarea name="comment" placeholder="Share your feedback" required />
                  <button type="submit">Post Review</button>
                </form>
                )}
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
