import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Listing, StudentProfile } from '../types';
import {
  IconSearch, IconFilter, IconMessageCircle, IconSend,
  IconAlertTriangle, IconSettings, IconGraduationCap, IconClock,
  AmenityIcon, IconWalk, IconBus, IconCar, IconShield,
} from './Icons';

const amenityOptions = ['wifi', 'security', 'laundry', 'parking', 'backup-power'];

type Props = {
  studentProfile: StudentProfile | null;
  // Map filters (still controlled locally so the map updates live)
  minPrice: number;
  setMinPrice: (v: number) => void;
  maxPrice: number;
  setMaxPrice: (v: number) => void;
  listingRoomTypeFilter: 'any' | 'private' | 'shared';
  setListingRoomTypeFilter: (v: 'any' | 'private' | 'shared') => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  selectedAmenities: string[];
  toggleAmenity: (a: string) => void;
  // Chat
  chat: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  askAssistant: (msg: string) => void;
  aiQuestions: string[];
  listings: Listing[];
  isLoading: boolean;
  onOpenProfile: () => void;
};

export function AIAssistant({
  studentProfile,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  listingRoomTypeFilter, setListingRoomTypeFilter,
  verifiedOnly, setVerifiedOnly,
  selectedAmenities, toggleAmenity,
  chat, chatInput, setChatInput, askAssistant,
  aiQuestions, listings, isLoading,
  onOpenProfile,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const name = studentProfile?.university
    ? `${studentProfile.university} student`
    : 'student';

  const greeting = studentProfile
    ? `Hi ${studentProfile.university || 'there'}! I know you're ${
        studentProfile.yearOfStudy ? `a Year ${studentProfile.yearOfStudy} ` : 'a '
      }student with a R${studentProfile.budgetMin.toLocaleString()}–R${studentProfile.budgetMax.toLocaleString()} budget looking for a ${
        studentProfile.roomType === 'any' ? 'room' : `${studentProfile.roomType} room`
      }. Tell me what matters most right now and I'll find the best options on the map.`
    : 'Set up your profile so I can give you personalised recommendations on the map.';

  return (
    <>
      {/* Context awareness banner */}
      {studentProfile && (
        <div className="section-card ai-context-card">
          <div className="ai-context-header">
            <IconSettings size={15} />
            <strong>AI Context Active</strong>
          </div>
          <div className="ai-context-tags">
            {studentProfile.university && (
              <span className="context-pill"><IconGraduationCap size={11} />{studentProfile.university}</span>
            )}
            {studentProfile.yearOfStudy && (
              <span className="context-pill"><IconClock size={11} />Year {studentProfile.yearOfStudy}</span>
            )}
            <span className="context-pill">
              R{studentProfile.budgetMin.toLocaleString()}–R{studentProfile.budgetMax.toLocaleString()}
            </span>
            <span className="context-pill">
              {studentProfile.roomType === 'any' ? 'Any room' : studentProfile.roomType === 'private' ? 'Private' : 'Shared'}
            </span>
            <span className="context-pill">
              {studentProfile.transportMode === 'walking' ? <IconWalk size={11} /> : studentProfile.transportMode === 'public-transport' ? <IconBus size={11} /> : <IconCar size={11} />}
              {studentProfile.transportMode}
            </span>
            <span className="context-pill">
              <IconShield size={11} /> {studentProfile.securityPriority} security
            </span>
          </div>
          <button type="button" className="ai-edit-profile-btn" onClick={onOpenProfile}>
            Edit preferences
          </button>
        </div>
      )}

      {!studentProfile && (
        <div className="section-card ai-context-card incomplete">
          <div className="ai-context-header">
            <IconAlertTriangle size={15} />
            <strong>Profile incomplete</strong>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Complete your profile to unlock personalised AI recommendations.
          </p>
          <button type="button" onClick={onOpenProfile}>Complete profile</button>
        </div>
      )}

      {/* Map Filters */}
      <section className="section-card">
        <h3><span className="section-icon"><IconFilter size={13} /></span>Map Filters</h3>
        <div className="filter-grid">
          <div className="form-row">
            <label>
              Min price (ZAR)
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Max price (ZAR)
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <label>
            Room filter
            <select
              value={listingRoomTypeFilter}
              onChange={(e) => setListingRoomTypeFilter(e.target.value as typeof listingRoomTypeFilter)}
            >
              <option value="any">Any</option>
              <option value="private">Private only</option>
              <option value="shared">Shared only</option>
            </select>
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified listings only
          </label>
        </div>

        <div className="amenity-chips" style={{ marginTop: '0.5rem' }}>
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

      {/* Chat Section */}
      <div className="section-card">
        <h3><span className="section-icon"><IconMessageCircle size={13} /></span>Chat with AI</h3>
        <div className="chat-container">
          <div className="chat-box">
            <div className="chat-row assistant">{greeting}</div>
            <AnimatePresence initial={false}>
              {chat.map((item, index) => (
                <motion.div
                  key={`${item.role}-${index}`}
                  className={`chat-row ${item.role}`}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {item.message}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              askAssistant(chatInput);
              setChatInput('');
            }}
          >
            <input placeholder="Ask about closer, cheaper, safer options…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit"><IconSend size={15} /></button>
          </form>
        </div>

        {aiQuestions.length > 0 && (
          <div className="ai-questions">
            <h3>Clarifying Questions</h3>
            {aiQuestions.map((q) => <p key={q}>{q}</p>)}
          </div>
        )}
      </div>

      {/* Skeleton loaders */}
      {isLoading && (
        <div className="section-card">
          <div className="stack-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-line w-70" />
                <div className="skeleton-line w-45" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
