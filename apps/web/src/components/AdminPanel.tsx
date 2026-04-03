import React from 'react';
import { motion } from 'framer-motion';
import { Listing, Interest, AdminInsights } from '../types';

type Props = {
  pendingListings: Listing[];
  interests: Interest[];
  adminInsights: AdminInsights | null;
  reviewListing: (id: string, decision: 'approved' | 'rejected', comment: string) => Promise<void>;
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3 }
  })
};

const privileges = [
  'Approve or reject new listings',
  'Monitor and prioritize moderation backlog',
  'View and triage student leads platform-wide',
  'Enforce governance policy for admin access',
  'Oversee supply quality and trust signals'
];

export function AdminPanel({ pendingListings, interests, adminInsights, reviewListing }: Props) {
  const newestLeads = interests
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <>
      <div className="section-card admin-hero-card">
        <div className="section-head">
          <h2>Admin Command Center</h2>
          <p className="muted">Platform oversight, moderation control, and governance visibility.</p>
        </div>

        <div className="admin-health-grid">
          <div className="admin-stat">
            <span className="admin-stat-value">{adminInsights?.pendingModeration ?? pendingListings.length}</span>
            <span className="muted">Pending Moderation</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{adminInsights?.studentLeads ?? interests.length}</span>
            <span className="muted">Total Leads</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{adminInsights?.stalePendingCount ?? 0}</span>
            <span className="muted">Stale Backlog (&gt;24h)</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{adminInsights?.recentLeads ?? 0}</span>
            <span className="muted">Leads (Last 24h)</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <h3>Governance and Access</h3>
          <p className="muted">How admin access is controlled and what this role can do.</p>
        </div>

        <div className="admin-governance-grid">
          <article className="governance-card">
            <p className="governance-label">Admin Selection</p>
            <strong>
              {adminInsights?.adminSelectionPolicy === 'manual-provisioning-only'
                ? 'Manual provisioning only'
                : 'Policy unavailable'}
            </strong>
            <p className="muted">Admin accounts are created through controlled internal onboarding, not public signup.</p>
          </article>
          <article className="governance-card">
            <p className="governance-label">Self Registration</p>
            <strong>{adminInsights?.adminSelfRegistrationEnabled ? 'Enabled' : 'Disabled'}</strong>
            <p className="muted">Public self-registration for admin is blocked at API level.</p>
          </article>
          <article className="governance-card">
            <p className="governance-label">User Mix</p>
            <strong>
              {adminInsights?.totalStudents ?? 0} students • {adminInsights?.totalLandlords ?? 0} landlords • {adminInsights?.totalAdmins ?? 0} admins
            </strong>
            <p className="muted">Platform population snapshot for capacity and moderation planning.</p>
          </article>
        </div>

        <div className="admin-privileges">
          <h4>Admin Privileges</h4>
          <ul>
            {privileges.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <h3>Moderation Queue</h3>
          <p className="muted">Highest-impact operational actions right now.</p>
        </div>

        <div className="stack-list">
          {pendingListings.length === 0 && <p className="muted">No pending listings. 🎉</p>}
          {pendingListings.map((item, i) => (
            <motion.article
              key={item.id}
              className="stack-card"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <p><strong>{item.title}</strong> — {item.landlordName}</p>
              <p className="muted queue-meta">
                {item.isVerified ? 'Verified landlord' : 'Unverified landlord'} • R{item.price} • {item.roomType}
              </p>
              <p className="muted">{item.description}</p>
              <div className="actions-row">
                <button
                  type="button"
                  onClick={() => reviewListing(item.id, 'approved', 'Approved. Listing quality meets requirements.')}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  className="danger outline"
                  onClick={() => reviewListing(item.id, 'rejected', 'Please add clearer photos and nearby amenities.')}
                >
                  ✗ Reject
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <h3>Lead Operations</h3>
          <p className="muted">Most recent student demand signals.</p>
        </div>
        <div className="stack-list">
          {newestLeads.length === 0 && <p className="muted">No leads yet.</p>}
          {newestLeads.map((lead, i) => (
            <motion.article
              key={lead.id}
              className="stack-card"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <p>
                <strong>{lead.studentName}</strong>
                <span className="lead-arrow"> → </span>
                {lead.listingTitle}
              </p>
              <p>📞 {lead.studentPhone}</p>
              <p className="muted">{lead.studentNote || 'No note provided.'}</p>
              <p className="muted">{new Date(lead.createdAt).toLocaleString()}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </>
  );
}
