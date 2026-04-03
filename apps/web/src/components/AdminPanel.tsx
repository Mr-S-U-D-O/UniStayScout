import React from 'react';
import { motion } from 'framer-motion';
import { Listing, Interest } from '../types';

type Props = {
  pendingListings: Listing[];
  interests: Interest[];
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

export function AdminPanel({ pendingListings, interests, reviewListing }: Props) {
  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h2>Admin Moderation</h2>
          <p className="muted">Approve listings and monitor incoming student leads.</p>
        </div>
        <div className="admin-stats-row">
          <div className="admin-stat">
            <span className="admin-stat-value">{pendingListings.length}</span>
            <span className="muted">Pending</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{interests.length}</span>
            <span className="muted">Leads</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h3>Pending Listings</h3>
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
        <h3>Student Interest Leads</h3>
        <div className="stack-list">
          {interests.length === 0 && <p className="muted">No leads yet.</p>}
          {interests.map((lead, i) => (
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
              <p className="muted">{new Date(lead.createdAt).toLocaleString()}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </>
  );
}
