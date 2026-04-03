import React from 'react';
import { motion } from 'framer-motion';
import { AuthUser, School, DashboardCard, UserProfile, StudentProfile } from '../types';

type Props = {
  authUser: AuthUser;
  userProfile: UserProfile | null;
  schools: School[];
  selectedSchoolId: string;
  setSelectedSchoolId: (id: string) => void;
  schoolSearch: string;
  setSchoolSearch: (v: string) => void;
  schoolSearchLoading: boolean;
  loadSchools: (q: string) => void;
  radiusKm: number;
  setRadiusKm: (km: number) => void;
  sortBy: 'distance' | 'price-asc' | 'price-desc';
  setSortBy: (s: 'distance' | 'price-asc' | 'price-desc') => void;
  mapTheme: 'street' | 'terrain';
  setMapTheme: (t: 'street' | 'terrain') => void;
  dashboardCards: DashboardCard[];
  statusMessage: string;
  onOpenProfile: () => void;
  logout: () => void;
};

export function TopBar({
  authUser, userProfile,
  schools, selectedSchoolId, setSelectedSchoolId,
  schoolSearch, setSchoolSearch, schoolSearchLoading, loadSchools,
  radiusKm, setRadiusKm,
  sortBy, setSortBy,
  mapTheme, setMapTheme,
  dashboardCards, statusMessage,
  onOpenProfile, logout,
}: Props) {

  const avatarUrl = userProfile?.avatarUrl || '';
  const completeness = userProfile ? calcCompleteness(userProfile) : 0;

  return (
    <>
      <motion.header
        className="topbar panel"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="topbar-info">
          <span className="eyebrow">Live Workspace</span>
          <h1>UniStayScout</h1>
        </div>

        <div className="topbar-controls">
          <div className="school-search-group">
            <input
              className="tool-btn school-search-input"
              placeholder="Search schools…"
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSchools(schoolSearch)}
            />
            <button
              type="button"
              className="tool-btn"
              disabled={schoolSearchLoading}
              onClick={() => loadSchools(schoolSearch)}
            >
              {schoolSearchLoading ? '…' : '🔍'}
            </button>
          </div>
          {schools.length > 0 && (
            <label>
              School
              <select className="tool-btn" value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          <label>
            Radius: {radiusKm}km
            <input type="range" min={1} max={15} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} />
          </label>
          <label>
            Sort
            <select className="tool-btn" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="distance">Nearest first</option>
              <option value="price-asc">Cheapest first</option>
              <option value="price-desc">Most expensive first</option>
            </select>
          </label>
          <label>
            Map
            <select className="tool-btn" value={mapTheme} onChange={(e) => setMapTheme(e.target.value as typeof mapTheme)}>
              <option value="street">Street</option>
              <option value="terrain">Terrain</option>
            </select>
          </label>

          {/* Avatar chip — opens profile modal */}
          <button type="button" className="avatar-chip" onClick={onOpenProfile} title="View / edit your profile">
            {avatarUrl ? (
              <img src={avatarUrl} alt={authUser.name} className="avatar-chip-img" />
            ) : (
              <div className="avatar-chip-fallback">{authUser.name.charAt(0).toUpperCase()}</div>
            )}
            <span className="avatar-chip-name">{authUser.name.split(' ')[0]}</span>
            <span className="role-tag">{authUser.role}</span>
            {completeness < 70 && (
              <span className="completeness-warning" title={`Profile ${completeness}% complete`}>!</span>
            )}
          </button>

          <button type="button" className="danger outline" onClick={logout}>Logout</button>
        </div>
      </motion.header>

      <motion.section
        className="status-line"
        key={statusMessage}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <span className="status-dot" /> {statusMessage}
      </motion.section>

      {dashboardCards.length > 0 && (
        <section className="summary-grid">
          {dashboardCards.map((card, i) => (
            <motion.article
              key={card.label}
              className="summary-card panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <p className="summary-label">{card.label}</p>
              <h3>{card.value}</h3>
            </motion.article>
          ))}
        </section>
      )}
    </>
  );
}

function calcCompleteness(profile: UserProfile): number {
  if (profile.role === 'student') {
    const s = profile as StudentProfile;
    const checks = [s.avatarUrl, s.bio, s.university, s.lifestyle.length > 0, s.preferredAmenities.length > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
  return 100;
}
