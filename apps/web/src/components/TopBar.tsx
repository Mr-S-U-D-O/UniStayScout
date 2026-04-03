import React from 'react';
import { motion } from 'framer-motion';
import { AuthUser, School, DashboardCard } from '../types';

type Props = {
  authUser: AuthUser;
  schools: School[];
  selectedSchoolId: string;
  setSelectedSchoolId: (id: string) => void;
  schoolSearch: string;
  setSchoolSearch: (value: string) => void;
  schoolSearchLoading: boolean;
  loadSchools: (query?: string) => Promise<void>;
  radiusKm: number;
  setRadiusKm: (km: number) => void;
  sortBy: 'distance' | 'price-asc' | 'price-desc';
  setSortBy: (s: 'distance' | 'price-asc' | 'price-desc') => void;
  mapTheme: 'street' | 'terrain';
  setMapTheme: (t: 'street' | 'terrain') => void;
  dashboardCards: DashboardCard[];
  statusMessage: string;
  logout: () => void;
};

export function TopBar({
  authUser,
  schools,
  selectedSchoolId,
  setSelectedSchoolId,
  schoolSearch,
  setSchoolSearch,
  schoolSearchLoading,
  loadSchools,
  radiusKm,
  setRadiusKm,
  sortBy,
  setSortBy,
  mapTheme,
  setMapTheme,
  dashboardCards,
  statusMessage,
  logout
}: Props) {
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
          <div className="user-badge">
            <span className="role-tag">{authUser.role}</span>
            {authUser.name}
          </div>
        </div>
        <div className="topbar-controls">
          <form
            className="school-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              loadSchools(schoolSearch).catch(() => undefined);
            }}
          >
            <label>
              Find school
              <input
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Search real schools or campuses"
              />
            </label>
            <button type="submit" className="tool-btn" disabled={schoolSearchLoading}>
              {schoolSearchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
          <label>
            School
            <select className="tool-btn" value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)}>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </label>
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
            Map Theme
            <select className="tool-btn" value={mapTheme} onChange={(e) => setMapTheme(e.target.value as typeof mapTheme)}>
              <option value="street">Street</option>
              <option value="terrain">Terrain</option>
            </select>
          </label>
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
