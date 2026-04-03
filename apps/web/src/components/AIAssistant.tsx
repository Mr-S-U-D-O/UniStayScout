import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Listing, StudentProfile } from '../types';

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
            <span className="ai-dot">🤖</span>
            <strong>AI Context Loaded</strong>
          </div>
          <div className="ai-context-tags">
            {studentProfile.university && (
              <span className="context-pill">🏛️ {studentProfile.university}</span>
            )}
            {studentProfile.yearOfStudy && (
              <span className="context-pill">📅 Year {studentProfile.yearOfStudy}</span>
            )}
            <span className="context-pill">
              💰 R{studentProfile.budgetMin.toLocaleString()}–R{studentProfile.budgetMax.toLocaleString()}
            </span>
            <span className="context-pill">
              {studentProfile.roomType === 'any' ? '🏠 Any room' : studentProfile.roomType === 'private' ? '🚪 Private' : '🛏️ Shared'}
            </span>
            <span className="context-pill">
              {studentProfile.transportMode === 'walking' ? '🚶 Walking' : studentProfile.transportMode === 'public-transport' ? '🚌 Transport' : '🚗 Car'}
            </span>
            <span className="context-pill">
              {studentProfile.securityPriority === 'high' ? '🔴 High security' : studentProfile.securityPriority === 'medium' ? '🟡 Medium security' : '🟢 Low security'}
            </span>
            {studentProfile.lifestyle.slice(0, 2).map((l) => (
              <span key={l} className="context-pill">✨ {l}</span>
            ))}
          </div>
          <button type="button" className="ai-edit-profile-btn" onClick={onOpenProfile}>
            Edit preferences →
          </button>
        </div>
      )}

      {!studentProfile && (
        <div className="section-card ai-context-card incomplete">
          <div className="ai-context-header">
            <span className="ai-dot">⚠️</span>
            <strong>Profile incomplete</strong>
          </div>
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Complete your profile so the AI can make personalised recommendations.
          </p>
          <button type="button" onClick={onOpenProfile}>Complete Profile →</button>
        </div>
      )}

      {/* Map Filters */}
      <section className="section-card">
        <h3>Map Filters</h3>
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
        <h3>Chat with AI</h3>
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
            <input
              placeholder="Ask for closer, cheaper, safer options…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit">Ask</button>
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
