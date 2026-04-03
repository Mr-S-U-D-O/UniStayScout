import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from './components/AuthLayout';
import { TopBar } from './components/TopBar';
import { AIAssistant } from './components/AIAssistant';
import { LandlordPanel } from './components/LandlordPanel';
import { AdminPanel } from './components/AdminPanel';
import { MapWorkspace } from './components/MapWorkspace';
import { ListingDetail } from './components/ListingDetail';
import {
  AuthUser, AuthRole, AuthSession,
  School, Listing, Review, Interest,
  DashboardCard, ChatMessage
} from './types';
import { apiGet, apiPost, API_BASE, AUTH_STORAGE_KEY, AUTH_SESSION_KEY } from './api';

type Role = 'student' | 'landlord' | 'admin';

function App() {
  // ─── Auth ───────────────────────────────────────────────────────────────
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

  // ─── Map / Listing state ─────────────────────────────────────────────────
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('uj-auckland-park');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolSearchLoading, setSchoolSearchLoading] = useState(false);
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
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  // ─── Student profile ─────────────────────────────────────────────────────
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentBudget, setStudentBudget] = useState(4500);
  const [studentRoomType, setStudentRoomType] = useState<'private' | 'shared' | 'any'>('any');

  // ─── Landlord fields ─────────────────────────────────────────────────────
  const landlordId = authUser?.landlordId || '';
  const [landlordName, setLandlordName] = useState('');

  // ─── AI Chat ─────────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'assistant', message: 'I can help you shortlist places. Start by selecting your school and I will suggest options on the map.' }
  ]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);

  // ─── Status / Dashboard ──────────────────────────────────────────────────
  const [statusMessage, setStatusMessage] = useState('Live updates connected.');
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) || schools[0],
    [schools, selectedSchoolId]
  );
  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId) || null,
    [listings, selectedListingId]
  );

  // ─── Rehydrate session ───────────────────────────────────────────────────
  useEffect(() => {
    const savedSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as AuthSession;
        setAuthUser(parsed.user);
        setAuthToken(parsed.token || '');
        setStudentName(parsed.user.name || '');
        setStudentPhone(parsed.user.phone || '');
        setLandlordName(parsed.user.name || '');
        return;
      } catch {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    }
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return;
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

  // ─── Load demo accounts ──────────────────────────────────────────────────
  useEffect(() => {
    apiGet<{ data: Array<{ role: string; email: string; password: string }> }>('/api/auth/demo-accounts')
      .then((r) => setDemoAccounts(r.data))
      .catch(() => setDemoAccounts([]));
  }, []);

  // ─── API helpers ─────────────────────────────────────────────────────────
  async function loadDashboardSummary() {
    if (!authUser?.id || !authToken) { setDashboardCards([]); return; }
    const r = await apiGet<{ data: { cards: DashboardCard[] } }>('/api/dashboard-summary', authToken);
    setDashboardCards(r.data.cards || []);
  }

  async function loadSchools(query = '') {
    setSchoolSearchLoading(true);
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const response = await apiGet<{ data: School[] }>(`/api/schools${params}`);
      setSchools(response.data || []);

      if (response.data.length > 0) {
        const stillVisible = response.data.some((school) => school.id === selectedSchoolId);
        setSelectedSchoolId(stillVisible ? selectedSchoolId : response.data[0].id);
      } else {
        setSelectedSchoolId('');
      }

      setStatusMessage(query.trim() ? `Loaded ${response.data.length} school matches.` : 'Live school directory loaded.');
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Unable to load schools.');
    } finally {
      setSchoolSearchLoading(false);
    }
  }

  async function submitLogin() {
    setAuthLoading(true); setAuthError('');
    try {
      const r = await apiPost<{ data: AuthUser; token: string }>('/api/auth/login', {
        email: authForm.email, password: authForm.password
      });
      setAuthUser(r.data); setAuthToken(r.token || '');
      setStudentName(r.data.name || ''); setStudentPhone(r.data.phone || '');
      setLandlordName(r.data.name || '');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(r.data));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: r.data, token: r.token }));
      setStatusMessage(`Welcome back, ${r.data.name}.`);
      setAuthForm((c) => ({ ...c, password: '' }));
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Login failed.');
    } finally { setAuthLoading(false); }
  }

  async function submitRegister() {
    setAuthLoading(true); setAuthError('');
    try {
      const r = await apiPost<{ data: AuthUser; token: string }>('/api/auth/register', {
        name: authForm.name, email: authForm.email, phone: authForm.phone,
        password: authForm.password, role: authForm.role
      });
      setAuthUser(r.data); setAuthToken(r.token || '');
      setStudentName(r.data.name || ''); setStudentPhone(r.data.phone || '');
      setLandlordName(r.data.name || '');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(r.data));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: r.data, token: r.token }));
      setStatusMessage(`Account created for ${r.data.role}.`);
      setAuthForm((c) => ({ ...c, password: '' }));
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Registration failed.');
    } finally { setAuthLoading(false); }
  }

  function logout() {
    setAuthUser(null); setAuthToken('');
    setDashboardCards([]); setListings([]); setSelectedListingId('');
    setAuthForm((c) => ({ ...c, password: '' }));
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  async function loadListings() {
    if (!authUser || !authToken) { setListings([]); return; }
    setIsLoadingListings(true);
    try {
      const params = new URLSearchParams({
        schoolId: selectedSchoolId, radiusKm: String(radiusKm),
        minPrice: String(minPrice), maxPrice: String(maxPrice),
        roomType: listingRoomTypeFilter, verifiedOnly: String(verifiedOnly),
        sortBy, amenities: selectedAmenities.join(',')
      });
      const r = await apiGet<{ data: Listing[] }>(`/api/listings?${params}`, authToken);
      setListings(r.data);
      if (!selectedListingId && r.data.length > 0) setSelectedListingId(r.data[0].id);
    } finally { setIsLoadingListings(false); }
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((c) => c.includes(amenity) ? c.filter((x) => x !== amenity) : [...c, amenity]);
  }

  async function loadAdminData() {
    const [pending, leadData] = await Promise.all([
      apiGet<{ data: Listing[] }>('/api/admin/pending-listings', authToken),
      apiGet<{ data: Interest[] }>('/api/admin/interests', authToken)
    ]);
    setPendingListings(pending.data);
    setInterests(leadData.data);
  }

  async function loadLandlordData() {
    if (!landlordId) { setLandlordListings([]); return; }
    const r = await apiGet<{ data: Listing[] }>(`/api/landlords/${landlordId}/listings`, authToken);
    setLandlordListings(r.data);
  }

  async function loadReviews(listingId: string) {
    const r = await apiGet<{ data: Review[] }>(`/api/listings/${listingId}/reviews`, authToken);
    setReviews(r.data);
  }

  async function refreshForRole() {
    if (!authUser || !authToken) return;
    await loadListings();
    await loadDashboardSummary();
    if (role === 'admin') await loadAdminData();
    if (role === 'landlord') await loadLandlordData();
  }

  // ─── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    loadSchools().catch(() => setStatusMessage('Unable to load schools. Check API server.'));
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !selectedSchoolId) return;
    refreshForRole().catch(() => setStatusMessage('Data refresh failed.'));
  }, [authUser, authToken, selectedSchoolId, radiusKm, minPrice, maxPrice, listingRoomTypeFilter, verifiedOnly, sortBy, selectedAmenities, role]);

  useEffect(() => {
    if (!selectedListingId) { setReviews([]); return; }
    loadReviews(selectedListingId).catch(() => setReviews([]));
  }, [selectedListingId]);

  // SSE live updates
  useEffect(() => {
    if (!authUser || !authToken) return;
    const source = new EventSource(`${API_BASE}/api/events`);
    source.addEventListener('connected', () => setStatusMessage('Live updates connected.'));
    source.addEventListener('listing-created', () => refreshForRole().catch(() => setStatusMessage('Live refresh failed.')));
    source.addEventListener('listing-reviewed', () => refreshForRole().catch(() => setStatusMessage('Live refresh failed.')));
    source.addEventListener('interest-created', () => {
      if (role === 'admin') loadAdminData().catch(() => setStatusMessage('Admin leads refresh failed.'));
    });
    source.addEventListener('review-created', () => {
      if (selectedListingId) loadReviews(selectedListingId).catch(() => setReviews([]));
    });
    source.onerror = () => setStatusMessage('Live updates disconnected. Retrying…');
    return () => source.close();
  }, [authUser, authToken, role, selectedListingId, selectedSchoolId, radiusKm]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  async function askAssistant(message: string) {
    const nextChat = [...chat, { role: 'user' as const, message }];
    setChat(nextChat);
    const r = await apiPost<{ questions: string[]; recommendedListingIds: string[]; rationale: string }>(
      '/api/ai/recommendations',
      { profile: { name: studentName, budget: studentBudget, roomType: studentRoomType }, mapContext: { schoolId: selectedSchoolId, radiusKm }, conversation: nextChat },
      authToken
    );
    setRecommendedIds(r.recommendedListingIds);
    setAiQuestions(r.questions);
    setChat((c) => [...c, { role: 'assistant', message: r.rationale }]);
    if (r.recommendedListingIds.length > 0) setSelectedListingId(r.recommendedListingIds[0]);
  }

  async function submitInterest() {
    if (!selectedListing || !authUser || !authToken) return;
    await apiPost('/api/interests', {
      listingId: selectedListing.id, studentName, studentPhone,
      studentNote: `Interested in ${selectedListing.title}`
    }, authToken);
    setStatusMessage('Interest submitted. Admin can now follow up with the landlord.');
  }

  async function submitReview(formData: FormData) {
    if (!selectedListing) return;
    await apiPost(`/api/listings/${selectedListing.id}/reviews`, {
      author: String(formData.get('author') || 'Anonymous'),
      rating: Number(formData.get('rating') || 5),
      comment: String(formData.get('comment') || '')
    }, authToken);
    setStatusMessage('Review added.');
    await loadReviews(selectedListing.id);
  }

  async function createListing(data: {
    title: string; description: string; price: number;
    roomType: 'private' | 'shared'; amenities: string[]; photos: string[];
    locationLabel: string;
  }) {
    if (!authUser || !landlordId || !authToken) {
      setStatusMessage('Please login as a landlord to submit listings.');
      return;
    }

    if (!data.locationLabel.trim()) {
      setStatusMessage('Add a real property address or place name first.');
      return;
    }

    let geocodedLocation: { label: string; latitude: number; longitude: number };
    try {
      const response = await apiGet<{ data: { label: string; latitude: number; longitude: number } }>(
        `/api/geo/search?query=${encodeURIComponent(data.locationLabel.trim())}`
      );
      geocodedLocation = response.data;
    } catch {
      setStatusMessage('Could not geocode that location. Use a more specific address or place name.');
      return;
    }

    await apiPost('/api/listings', {
      landlordName,
      schoolId: selectedSchoolId,
      ...data,
      locationLabel: geocodedLocation.label,
      latitude: geocodedLocation.latitude,
      longitude: geocodedLocation.longitude
    }, authToken);
    setStatusMessage('Listing submitted for admin review.');
    await loadLandlordData();
    await refreshForRole();
  }

  async function reviewListing(id: string, decision: 'approved' | 'rejected', comment: string) {
    await apiPost(`/api/admin/listings/${id}/review`, { decision, comment }, authToken);
    setStatusMessage(`Listing ${decision}.`);
    await loadAdminData();
    await refreshForRole();
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  if (!authUser) {
    return (
      <AuthLayout
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authError={authError}
        authLoading={authLoading}
        submitLogin={submitLogin}
        submitRegister={submitRegister}
        demoAccounts={demoAccounts}
      />
    );
  }

  return (
    <main className="app-shell">
      <TopBar
        authUser={authUser}
        schools={schools}
        selectedSchoolId={selectedSchoolId}
        setSelectedSchoolId={setSelectedSchoolId}
        schoolSearch={schoolSearch}
        setSchoolSearch={setSchoolSearch}
        schoolSearchLoading={schoolSearchLoading}
        loadSchools={loadSchools}
        radiusKm={radiusKm}
        setRadiusKm={setRadiusKm}
        sortBy={sortBy}
        setSortBy={setSortBy}
        mapTheme={mapTheme}
        setMapTheme={setMapTheme}
        dashboardCards={dashboardCards}
        statusMessage={statusMessage}
        logout={logout}
      />

      <section className="workspace-grid">
        <aside className="left-sidebar">
          {role === 'student' && (
            <AIAssistant
              studentName={studentName} setStudentName={setStudentName}
              studentPhone={studentPhone} setStudentPhone={setStudentPhone}
              studentBudget={studentBudget} setStudentBudget={setStudentBudget}
              studentRoomType={studentRoomType} setStudentRoomType={setStudentRoomType}
              minPrice={minPrice} setMinPrice={setMinPrice}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              listingRoomTypeFilter={listingRoomTypeFilter} setListingRoomTypeFilter={setListingRoomTypeFilter}
              verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly}
              selectedAmenities={selectedAmenities} toggleAmenity={toggleAmenity}
              chat={chat} chatInput={chatInput} setChatInput={setChatInput}
              askAssistant={(msg) => askAssistant(msg).catch(() => setStatusMessage('Assistant request failed.'))}
              aiQuestions={aiQuestions}
              listings={listings}
              isLoading={isLoadingListings}
            />
          )}

          {role === 'landlord' && (
            <LandlordPanel
              landlordName={landlordName}
              setLandlordName={setLandlordName}
              selectedSchoolId={selectedSchoolId}
              createListing={createListing}
              landlordListings={landlordListings}
            />
          )}

          {role === 'admin' && (
            <AdminPanel
              pendingListings={pendingListings}
              interests={interests}
              reviewListing={reviewListing}
            />
          )}
        </aside>

        <MapWorkspace
          selectedSchool={selectedSchool}
          selectedListing={selectedListing}
          listings={listings}
          recommendedIds={recommendedIds}
          radiusKm={radiusKm}
          mapTheme={mapTheme}
          setSelectedListingId={setSelectedListingId}
        />

        <aside className="detail-pane">
          <AnimatePresence mode="wait">
            {!selectedListing && (
              <motion.div
                key="empty"
                className="section-card detail-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="empty-state">
                  <span className="empty-icon">📍</span>
                  <p>Select a listing pin on the map to view details.</p>
                </div>
              </motion.div>
            )}
            {selectedListing && (
              <motion.div
                key={selectedListing.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <ListingDetail
                  listing={selectedListing}
                  school={selectedSchool}
                  reviews={reviews}
                  role={role}
                  studentName={studentName}
                  submitInterest={submitInterest}
                  submitReview={submitReview}
                  setStatusMessage={setStatusMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </section>
    </main>
  );
}

export default App;
