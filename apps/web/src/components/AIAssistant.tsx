import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Listing } from '../types';

const amenityOptions = ['wifi', 'security', 'laundry', 'parking', 'backup-power'];

const emojiMap: Record<string, string> = {
  wifi: '📶',
  security: '🔒',
  laundry: '🧺',
  parking: '🚗',
  'backup-power': '⚡'
};

type Props = {
  studentName: string;
  setStudentName: (v: string) => void;
  studentPhone: string;
  setStudentPhone: (v: string) => void;
  studentBudget: number;
  setStudentBudget: (v: number) => void;
  studentRoomType: 'private' | 'shared' | 'any';
  setStudentRoomType: (v: 'private' | 'shared' | 'any') => void;
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
  chat: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  askAssistant: (msg: string) => void;
  aiQuestions: string[];
  listings: Listing[];
  isLoading: boolean;
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

export function AIAssistant({
  studentName, setStudentName,
  studentPhone, setStudentPhone,
  studentBudget, setStudentBudget,
  studentRoomType, setStudentRoomType,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  listingRoomTypeFilter, setListingRoomTypeFilter,
  verifiedOnly, setVerifiedOnly,
  selectedAmenities, toggleAmenity,
  chat, chatInput, setChatInput, askAssistant,
  aiQuestions, listings, isLoading
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  return (
    <>
      {/* Profile Section */}
      <div className="section-card">
        <div className="section-head">
          <h2>AI Assistant</h2>
          <p className="muted">Context-aware recommendations from your map filters.</p>
        </div>
        <div className="profile-fields">
          <div className="form-row">
            <label>Name<input value={studentName} onChange={(e) => setStudentName(e.target.value)} /></label>
            <label>Phone<input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>
              Budget (ZAR)
              <input type="number" value={studentBudget} onChange={(e) => setStudentBudget(Number(e.target.value))} />
            </label>
            <label>
              Room type
              <select value={studentRoomType} onChange={(e) => setStudentRoomType(e.target.value as typeof studentRoomType)}>
                <option value="any">Any</option>
                <option value="private">Private</option>
                <option value="shared">Shared</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Map Filters */}
      <section className="section-card">
        <h3>Map Filters</h3>
        <div className="filter-grid">
          <div className="form-row">
            <label>Min price (ZAR)<input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value) || 0)} /></label>
            <label>Max price (ZAR)<input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)} /></label>
          </div>
          <label>
            Room filter
            <select value={listingRoomTypeFilter} onChange={(e) => setListingRoomTypeFilter(e.target.value as typeof listingRoomTypeFilter)}>
              <option value="any">Any</option>
              <option value="private">Private only</option>
              <option value="shared">Shared only</option>
            </select>
          </label>
          <label className="check-line">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
            Verified listings only
          </label>
        </div>

        <div className="amenity-chips">
          {amenityOptions.map((amenity) => (
            <div
              key={amenity}
              className={selectedAmenities.includes(amenity) ? 'chip active' : 'chip'}
              onClick={() => toggleAmenity(amenity)}
            >
              {emojiMap[amenity]} {amenity}
            </div>
          ))}
        </div>
      </section>

      {/* Chat Section */}
      <div className="section-card">
        <h3>Chat with AI</h3>
        <div className="chat-container">
          <div className="chat-box">
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
              placeholder="Ask for closer, cheaper, or safer options…"
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

      {/* Listing Skeletons or count */}
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
