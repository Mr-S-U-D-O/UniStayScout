import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [role, setRole] = useState<Role>('student');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('uj-auckland-park');
  const [radiusKm, setRadiusKm] = useState(5);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [landlordListings, setLandlordListings] = useState<Listing[]>([]);

  const [studentName, setStudentName] = useState('Lerato Student');
  const [studentPhone, setStudentPhone] = useState('+27 71 000 1234');
  const [studentBudget, setStudentBudget] = useState(4500);
  const [studentRoomType, setStudentRoomType] = useState<'private' | 'shared' | 'any'>('any');

  const [landlordId] = useState('landlord-1');
  const [landlordName, setLandlordName] = useState('Bright Rooms SA');
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

  const selectedSchool = useMemo(
    () => schools.find((item) => item.id === selectedSchoolId) || schools[0],
    [schools, selectedSchoolId]
  );

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedListingId) || null,
    [listings, selectedListingId]
  );

  async function loadListings(): Promise<void> {
    const params = new URLSearchParams({
      schoolId: selectedSchoolId,
      radiusKm: String(radiusKm),
      role
    });
    if (role === 'landlord') {
      params.set('landlordId', landlordId);
    }

    const response = await apiGet<{ data: Listing[] }>(`/api/listings?${params.toString()}`);
    setListings(response.data);
    if (!selectedListingId && response.data.length > 0) {
      setSelectedListingId(response.data[0].id);
    }
  }

  async function loadAdminData(): Promise<void> {
    const [pending, leadData] = await Promise.all([
      apiGet<{ data: Listing[] }>('/api/admin/pending-listings'),
      apiGet<{ data: Interest[] }>('/api/admin/interests')
    ]);
    setPendingListings(pending.data);
    setInterests(leadData.data);
  }

  async function loadLandlordData(): Promise<void> {
    const response = await apiGet<{ data: Listing[] }>(`/api/landlords/${landlordId}/listings`);
    setLandlordListings(response.data);
  }

  async function loadReviews(listingId: string): Promise<void> {
    const response = await apiGet<{ data: Review[] }>(`/api/listings/${listingId}/reviews`);
    setReviews(response.data);
  }

  async function refreshForRole(): Promise<void> {
    await loadListings();
    if (role === 'admin') {
      await loadAdminData();
    }
    if (role === 'landlord') {
      await loadLandlordData();
    }
  }

  useEffect(() => {
    apiGet<{ data: School[] }>('/api/schools')
      .then((response) => {
        setSchools(response.data);
        if (response.data.length > 0) {
          setSelectedSchoolId(response.data[0].id);
        }
      })
      .catch(() => setStatusMessage('Unable to load schools. Check API server.'));
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      return;
    }
    refreshForRole().catch(() => setStatusMessage('Data refresh failed.'));
  }, [selectedSchoolId, radiusKm, role]);

  useEffect(() => {
    if (!selectedListingId) {
      setReviews([]);
      return;
    }
    loadReviews(selectedListingId).catch(() => setReviews([]));
  }, [selectedListingId]);

  useEffect(() => {
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
  }, [role, selectedListingId, selectedSchoolId, radiusKm]);

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
    });

    setRecommendedIds(response.recommendedListingIds);
    setAiQuestions(response.questions);
    setChat((current) => [...current, { role: 'assistant', message: response.rationale }]);

    if (response.recommendedListingIds.length > 0) {
      setSelectedListingId(response.recommendedListingIds[0]);
    }
  }

  async function submitInterest(): Promise<void> {
    if (!selectedListing) {
      return;
    }

    await apiPost('/api/interests', {
      listingId: selectedListing.id,
      studentName,
      studentPhone,
      studentNote: `Interested in ${selectedListing.title}`
    });
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
    });
    setStatusMessage('Review added.');
  }

  async function createListing(): Promise<void> {
    await apiPost('/api/listings', {
      landlordId,
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
    });

    setNewTitle('');
    setNewDescription('');
    setStatusMessage('Listing submitted for admin review.');
    await loadLandlordData();
    await refreshForRole();
  }

  async function reviewListing(id: string, decision: 'approved' | 'rejected', comment: string): Promise<void> {
    await apiPost(`/api/admin/listings/${id}/review`, { decision, comment });
    setStatusMessage(`Listing ${decision}.`);
    await loadAdminData();
    await refreshForRole();
  }

  return (
    <main className="app-shell">
      <header className="topbar panel">
        <div>
          <h1>UniStayScout MVP</h1>
          <p>Map-first student housing with AI guidance and admin moderation.</p>
        </div>
        <div className="topbar-controls">
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="student">Student</option>
              <option value="landlord">Landlord</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            School
            <select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
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
        </div>
      </header>

      <section className="status-line">{statusMessage}</section>

      <section className="workspace-grid">
        <aside className="left-sidebar panel">
          {role === 'student' && (
            <>
              <h2>AI Assistant</h2>
              <p className="muted">Context-aware recommendations from your map filters.</p>

              <div className="profile-fields">
                <label>
                  Name
                  <input value={studentName} onChange={(event) => setStudentName(event.target.value)} />
                </label>
                <label>
                  Phone
                  <input value={studentPhone} onChange={(event) => setStudentPhone(event.target.value)} />
                </label>
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

              <div className="chat-box">
                {chat.map((item, index) => (
                  <div key={`${item.role}-${index}`} className={`chat-row ${item.role}`}>
                    <strong>{item.role === 'assistant' ? 'AI' : 'You'}:</strong> {item.message}
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

              {aiQuestions.length > 0 && (
                <div className="ai-questions">
                  <h3>Clarifying Questions</h3>
                  {aiQuestions.map((question) => (
                    <p key={question}>{question}</p>
                  ))}
                </div>
              )}
            </>
          )}

          {role === 'landlord' && (
            <>
              <h2>Landlord Dashboard</h2>
              <p className="muted">Create listings and track moderation status.</p>
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
                <label>
                  Amenities (comma separated)
                  <input value={newAmenities} onChange={(event) => setNewAmenities(event.target.value)} />
                </label>
                <button type="button" onClick={() => createListing().catch(() => setStatusMessage('Listing creation failed.'))}>
                  Submit for Review
                </button>
              </div>

              <h3>Your Listings</h3>
              <div className="stack-list">
                {landlordListings.map((item) => (
                  <article key={item.id} className={`stack-card status-${item.status}`}>
                    <p>
                      <strong>{item.title}</strong> - {item.price} {item.currency}
                    </p>
                    <p>Status: {item.status}</p>
                    <p className="muted">Admin: {item.adminComment || 'No comments'}</p>
                  </article>
                ))}
              </div>
            </>
          )}

          {role === 'admin' && (
            <>
              <h2>Admin Moderation</h2>
              <p className="muted">Approve listings and monitor incoming student leads.</p>
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
                        className="danger"
                        onClick={() => reviewListing(item.id, 'rejected', 'Please add clearer photos and nearby amenities.')}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>

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
            </>
          )}
        </aside>

        <section className="map-pane panel">
          {selectedSchool && (
            <MapContainer
              className="map-canvas"
              center={[selectedSchool.latitude, selectedSchool.longitude]}
              zoom={13}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

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

        <aside className="detail-pane panel">
          {!selectedListing && <p>Select a listing pin to view details.</p>}
          {selectedListing && (
            <>
              <img src={selectedListing.photos[0]} alt={selectedListing.title} className="listing-photo" />
              <h2>{selectedListing.title}</h2>
              <p>
                <strong>
                  {selectedListing.price} {selectedListing.currency}
                </strong>{' '}
                - {selectedListing.distanceKm?.toFixed(1)}km from school
              </p>
              <p>{selectedListing.description}</p>
              <p>
                <strong>Room:</strong> {selectedListing.roomType}
              </p>
              <p>
                <strong>Amenities:</strong> {selectedListing.amenities.join(', ')}
              </p>
              <p>
                <strong>Landlord:</strong> {selectedListing.landlordName}
              </p>

              {role === 'student' && (
                <button type="button" onClick={() => submitInterest().catch(() => setStatusMessage('Interest submit failed.'))}>
                  I am Interested
                </button>
              )}

              <h3>Ratings & Comments</h3>
              <div className="stack-list">
                {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
                {reviews.map((item) => (
                  <article key={item.id} className="stack-card">
                    <p>
                      <strong>{item.author}</strong> - {item.rating}/5
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
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
