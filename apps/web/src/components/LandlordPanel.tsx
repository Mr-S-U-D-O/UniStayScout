import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Listing } from '../types';

type WizardStep = 'basics' | 'pricing' | 'amenities' | 'review';

const STEPS: WizardStep[] = ['basics', 'pricing', 'amenities', 'review'];
const STEP_LABELS: Record<WizardStep, string> = {
  basics: 'Basics',
  pricing: 'Pricing',
  amenities: 'Amenities',
  review: 'Review'
};
const amenityOptions = ['wifi', 'security', 'laundry', 'parking', 'backup-power'];

type Props = {
  landlordName: string;
  setLandlordName: (v: string) => void;
  selectedSchoolId: string;
  createListing: (data: {
    title: string;
    description: string;
    price: number;
    roomType: 'private' | 'shared';
    amenities: string[];
    photos: string[];
    files?: File[];
    locationLabel: string;
  }) => Promise<void>;
  landlordListings: Listing[];
};

export function LandlordPanel({ landlordName, setLandlordName, selectedSchoolId, createListing, landlordListings }: Props) {
  const [step, setStep] = useState<WizardStep>('basics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(3500);
  const [roomType, setRoomType] = useState<'private' | 'shared'>('private');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [locationLabel, setLocationLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const addPhoto = () => {
    if (photoUrl.trim()) {
      setPhotos((prev) => [...prev, photoUrl.trim()]);
      setPhotoUrl('');
    }
  };

  const stepIndex = STEPS.indexOf(step);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createListing({ title, description, price, roomType, amenities: selectedAmenities, photos, files, locationLabel });
      // reset
      setStep('basics');
      setTitle('');
      setDescription('');
      setPrice(3500);
      setRoomType('private');
      setSelectedAmenities([]);
      setPhotos([]);
      setFiles([]);
      setLocationLabel('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 }
  };

  return (
    <>
      {/* Wizard Card */}
      <div className="section-card">
        <div className="section-head">
          <h2>Landlord Dashboard</h2>
          <p className="muted">List your property in 4 quick steps.</p>
        </div>

        <label>Display Name<input value={landlordName} onChange={(e) => setLandlordName(e.target.value)} /></label>

        {/* Step Progress */}
        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`wizard-step-btn ${step === s ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
              onClick={() => setStep(s)}
            >
              <span className="wizard-step-num">{i < stepIndex ? '✓' : i + 1}</span>
              {STEP_LABELS[s]}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="wizard-page"
          >
            {step === 'basics' && (
              <div className="profile-fields">
                <label>Listing Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunny studio near UJ" /></label>
                <label>Property Location<input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="e.g. 12 De Beer Street, Braamfontein" /></label>
                <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the space, environment, nearby transport…" /></label>
                <button type="button" onClick={() => setStep('pricing')} disabled={!title}>Next →</button>
              </div>
            )}

            {step === 'pricing' && (
              <div className="profile-fields">
                <div className="form-row">
                  <label>
                    Price (ZAR/month)
                    <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                  </label>
                  <label>
                    Room type
                    <select value={roomType} onChange={(e) => setRoomType(e.target.value as typeof roomType)}>
                      <option value="private">Private</option>
                      <option value="shared">Shared</option>
                    </select>
                  </label>
                </div>
                <div className="wizard-nav">
                  <button type="button" className="outline" onClick={() => setStep('basics')}>← Back</button>
                  <button type="button" onClick={() => setStep('amenities')}>Next →</button>
                </div>
              </div>
            )}

            {step === 'amenities' && (
              <div className="profile-fields">
                <p className="muted">Select all amenities this property offers:</p>
                <div className="amenity-chips">
                  {amenityOptions.map((a) => (
                    <div
                      key={a}
                      className={selectedAmenities.includes(a) ? 'chip active' : 'chip'}
                      onClick={() => toggleAmenity(a)}
                    >
                      {a}
                    </div>
                  ))}
                </div>

                <p className="muted landlord-photo-label">Add photos (upload files or paste URLs):</p>
                <div className="photo-input-row photo-input-row-spaced">
                  <label className="file-upload-label">
                    Upload image files
                    <input type="file" multiple accept="image/*" title="Upload listing photos" onChange={(e) => {
                      if (e.target.files) {
                        setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                      }
                      e.target.value = '';
                    }} />
                  </label>
                </div>
                <div className="photo-input-row">
                  <input placeholder="https://…" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                  <button type="button" onClick={addPhoto}>+ Add URL</button>
                </div>

                {/* Drag & Drop zone */}
                <div
                  className={`photo-drop-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                    } else {
                      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                      if (url) setPhotos((prev) => [...prev, url]);
                    }
                  }}
                >
                  {photos.length === 0 && files.length === 0
                    ? <span className="muted">Drag image files or URLs here or use the inputs above</span>
                    : (
                      <div className="photo-preview-grid">
                        {photos.map((src, i) => (
                          <div key={`url-${i}`} className="photo-preview-item">
                            <img src={src} alt={`Photo ${i + 1}`} />
                            <button type="button" className="photo-remove" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>×</button>
                          </div>
                        ))}
                        {files.map((file, i) => (
                          <div key={`file-${i}`} className="photo-preview-item">
                            <img src={URL.createObjectURL(file)} alt={`Upload ${i + 1}`} />
                            <button type="button" className="photo-remove" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>×</button>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>

                <div className="wizard-nav">
                  <button type="button" className="outline" onClick={() => setStep('pricing')}>← Back</button>
                  <button type="button" onClick={() => setStep('review')}>Review →</button>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="profile-fields">
                <div className="review-summary">
                  <div className="review-row"><span>Title</span><strong>{title || '—'}</strong></div>
                  <div className="review-row"><span>Location</span><strong>{locationLabel || '—'}</strong></div>
                  <div className="review-row"><span>Price</span><strong>R{price}/month</strong></div>
                  <div className="review-row"><span>Room</span><strong>{roomType}</strong></div>
                  <div className="review-row"><span>Amenities</span><strong>{selectedAmenities.join(', ') || 'None'}</strong></div>
                  <div className="review-row"><span>Photos</span><strong>{photos.length + files.length} added</strong></div>
                </div>
                <div className="wizard-nav">
                  <button type="button" className="outline" onClick={() => setStep('amenities')}>← Edit</button>
                  <button type="button" disabled={isSubmitting || !title} onClick={handleSubmit}>
                    {isSubmitting ? 'Submitting…' : '✓ Submit for Review'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* My Listings */}
      <div className="section-card">
        <h3>Your Listings</h3>
        <div className="stack-list">
          {landlordListings.length === 0 && <p className="muted">No listings yet.</p>}
          {landlordListings.map((item) => (
            <motion.article
              key={item.id}
              className={`stack-card status-${item.status}`}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
            >
              <p><strong>{item.title}</strong> — <span className="price-tag">R{item.price}/{item.currency}</span></p>
              <p>Status: <span className={`status-badge ${item.status}`}>{item.status}</span></p>
              <p className="muted">Admin: {item.adminComment || 'No comments'}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </>
  );
}
