import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Listing, Review, School } from '../types';

type Props = {
  listing: Listing;
  school?: School;
  reviews: Review[];
  role: 'student' | 'landlord' | 'admin';
  studentName: string;
  submitInterest: () => Promise<void>;
  submitReview: (data: FormData) => Promise<void>;
  setStatusMessage: (msg: string) => void;
};

function estimateWalkMinutes(listing: Listing, school?: School): number | null {
  if (!school) return null;
  const distKm = listing.distanceKm ?? 0;
  // Average walking speed ~5 km/h = ~12 min/km
  return Math.round(distKm * 12);
}

export function ListingDetail({
  listing,
  school,
  reviews,
  role,
  studentName,
  submitInterest,
  submitReview,
  setStatusMessage
}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = listing.photos.length > 0 ? listing.photos : ['/placeholder.jpg'];
  const walkMins = estimateWalkMinutes(listing, school);

  const prev = () => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setPhotoIndex((i) => (i + 1) % photos.length);

  return (
    <>
      {/* Photo Gallery */}
      <div className="section-card gallery-card">
        <div className="gallery-wrap">
          <AnimatePresence mode="wait">
            <motion.img
              key={photoIndex}
              src={photos[photoIndex]}
              alt={`${listing.title} — photo ${photoIndex + 1}`}
              className="gallery-photo"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          {photos.length > 1 && (
            <>
              <button type="button" className="gallery-btn gallery-prev" onClick={prev}>‹</button>
              <button type="button" className="gallery-btn gallery-next" onClick={next}>›</button>
              <div className="gallery-dots">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`gallery-dot ${i === photoIndex ? 'active' : ''}`}
                    onClick={() => setPhotoIndex(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <motion.div
          key={listing.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 style={{ marginTop: '1rem' }}>{listing.title}</h2>

          <div className="listing-meta-row">
            <span className="meta-pill">{listing.roomType}</span>
            <span className="meta-pill">{listing.distanceKm?.toFixed(1)} km</span>
            <span className="meta-pill">{listing.views} views</span>
            <span className="meta-pill">{listing.availableBeds} beds</span>
            {listing.isVerified && <span className="meta-pill verified">✓ Verified</span>}
          </div>

          <div className="price-tag">R{listing.price} <small>/ month</small></div>

          <div className="walk-time-badge">
            <span className="walk-icon">🚶</span>
            {walkMins !== null
              ? `~${walkMins} min walk to ${school?.name ?? 'campus'}`
              : `${listing.distanceKm?.toFixed(1)} km from campus`
            }
          </div>

          <p className="muted">{listing.description}</p>

          <div className="detail-facts">
            <p><strong>Room:</strong> {listing.roomType}</p>
            <p><strong>Location:</strong> {listing.locationLabel}</p>
            <p><strong>Amenities:</strong> {listing.amenities.join(', ')}</p>
            <p><strong>Landlord:</strong> {listing.landlordName}</p>
          </div>

          {role === 'student' && (
            <button
              type="button"
              className="full-width-btn"
              onClick={() => submitInterest().catch(() => setStatusMessage('Interest submit failed.'))}
            >
              I'm Interested
            </button>
          )}
        </motion.div>
      </div>

      {/* Reviews */}
      <div className="section-card">
        <h3>Ratings & Comments</h3>
        <div className="stack-list">
          {reviews.length === 0 && <p className="muted">No reviews yet. Be the first!</p>}
          {reviews.map((item, i) => (
            <motion.article
              key={item.id}
              className="stack-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
            >
              <div className="review-header">
                <strong>{item.author}</strong>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= item.rating ? 'star filled' : 'star'}>★</span>
                  ))}
                </div>
              </div>
              <p>{item.comment}</p>
            </motion.article>
          ))}
        </div>

        {role === 'student' && (
          <form
            className="review-form"
            style={{ marginTop: '1rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              submitReview(new FormData(form))
                .then(() => form.reset())
                .catch(() => setStatusMessage('Review submit failed.'));
            }}
          >
            <label>
              Your Name
              <input name="author" defaultValue={studentName} placeholder="Your name" required />
            </label>
            <label>
              Rating
              <div className="rating-input-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="rating-star-label">
                    <input type="radio" name="rating" value={n} defaultChecked={n === 5} />
                    <span className="star rating-star">★</span>
                  </label>
                ))}
              </div>
            </label>
            <label>
              Comment
              <textarea name="comment" placeholder="Share your experience…" required />
            </label>
            <button type="submit">Post Review</button>
          </form>
        )}
      </div>
    </>
  );
}
