import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AuthUser, UserProfile, StudentProfile, LandlordProfile, AdminProfile,
  LifestyleTag, TransportMode, SecurityPriority,
} from '../types';

const amenityOptions = ['wifi', 'security', 'laundry', 'parking', 'backup-power'];
const lifestyleTags: LifestyleTag[] = ['quiet', 'social', 'night-owl', 'early-riser', 'pet-friendly', 'study-focused'];
const lifestyleEmoji: Record<LifestyleTag, string> = {
  quiet: '🤫', social: '🎉', 'night-owl': '🦉', 'early-riser': '🌅', 'pet-friendly': '🐾', 'study-focused': '📚',
};

type Tab = 'profile' | 'preferences' | 'account';

type Props = {
  authUser: AuthUser;
  profile: UserProfile;
  onSave: (updated: UserProfile) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  onClose: () => void;
};

export function ProfileModal({ authUser, profile, onSave, onDeleteAccount, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('profile');
  const [draft, setDraft] = useState<UserProfile>({ ...profile });
  const [avatarInput, setAvatarInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Delete account flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setSaveMsg('Profile saved ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Save failed. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return; }
    if (!deletePassword) { setDeleteError('Password required.'); return; }
    setIsDeleting(true);
    try {
      await onDeleteAccount(deletePassword);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
      setIsDeleting(false);
    }
  }

  function setAvatarUrl(url: string) {
    setDraft((d) => ({ ...d, avatarUrl: url }));
  }

  // Student-specific helpers
  function toggleLifestyle(tag: LifestyleTag) {
    if (draft.role !== 'student') return;
    const s = draft as StudentProfile;
    setDraft({ ...s, lifestyle: s.lifestyle.includes(tag) ? s.lifestyle.filter((t) => t !== tag) : [...s.lifestyle, tag] });
  }

  function toggleAmenity(a: string) {
    if (draft.role !== 'student') return;
    const s = draft as StudentProfile;
    setDraft({ ...s, preferredAmenities: s.preferredAmenities.includes(a) ? s.preferredAmenities.filter((x) => x !== a) : [...s.preferredAmenities, a] });
  }

  // Completeness score
  function completeness(): number {
    let filled = 0;
    const fields = Object.values(draft).filter((v) =>
      v !== '' && v !== 0 && !(Array.isArray(v) && v.length === 0)
    );
    if (draft.role === 'student') {
      const s = draft as StudentProfile;
      const checks = [s.avatarUrl, s.bio, s.university, s.budgetMin, s.budgetMax, s.lifestyle.length > 0, s.preferredAmenities.length > 0];
      filled = checks.filter(Boolean).length;
      return Math.round((filled / checks.length) * 100);
    }
    if (draft.role === 'landlord') {
      const l = draft as LandlordProfile;
      const checks = [l.avatarUrl, l.bio, l.businessName, l.whatsapp];
      filled = checks.filter(Boolean).length;
      return Math.round((filled / checks.length) * 100);
    }
    if (draft.role === 'admin') {
      const a = draft as AdminProfile;
      const checks = [a.avatarUrl, a.bio, a.department];
      filled = checks.filter(Boolean).length;
      return Math.round((filled / checks.length) * 100);
    }
    return 0;
  }

  const pct = completeness();

  return (
    <AnimatePresence>
      <motion.div
        className="profile-drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="profile-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-avatar-block">
            {draft.avatarUrl ? (
              <img src={draft.avatarUrl} alt="avatar" className="avatar-ring" />
            ) : (
              <div className="avatar-ring avatar-placeholder">
                {authUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="profile-name">{authUser.name}</h2>
              <span className="role-tag">{authUser.role}</span>
              <div className="completeness-bar-wrap">
                <div className="completeness-bar">
                  <motion.div
                    className="completeness-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
                <span className="muted profile-complete-label">{pct}% complete</span>
              </div>
            </div>
          </div>
          <button type="button" className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          {(['profile', 'preferences', 'account'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`drawer-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'profile' ? '👤 Profile' : t === 'preferences' ? '⚙️ Preferences' : '🔐 Account'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="drawer-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── PROFILE TAB ─────────────────────────────────────────── */}
              {tab === 'profile' && (
                <div className="profile-fields drawer-section">
                  <h3>Avatar</h3>
                  <div className="avatar-upload-zone">
                    {draft.avatarUrl ? (
                      <img src={draft.avatarUrl} alt="Avatar" className="avatar-preview-lg" />
                    ) : (
                      <div className="avatar-placeholder-lg">{authUser.name.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="avatar-url-row">
                      <input
                        placeholder="Paste image URL…"
                        value={avatarInput}
                        onChange={(e) => setAvatarInput(e.target.value)}
                      />
                      <button type="button" onClick={() => { if (avatarInput.trim()) { setAvatarUrl(avatarInput.trim()); setAvatarInput(''); } }}>Set</button>
                      {draft.avatarUrl && (
                        <button type="button" className="outline" onClick={() => setAvatarUrl('')}>Remove</button>
                      )}
                    </div>
                  </div>

                  <h3>Basic Info</h3>
                  <label>
                    Full Name
                    <input value={authUser.name} readOnly className="readonly-input" />
                  </label>
                  <label>
                    Email
                    <input value={authUser.email} readOnly className="readonly-input" />
                  </label>
                  <label>
                    Phone
                    <input value={authUser.phone} readOnly className="readonly-input" />
                  </label>
                  <p className="muted profile-readonly-note">To change name, email or phone, contact support.</p>

                  <label>
                    Bio
                    <textarea
                      value={draft.bio}
                      onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                      placeholder="Tell us a bit about yourself…"
                    />
                  </label>

                  {/* Role-specific profile fields */}
                  {draft.role === 'student' && (
                    <>
                      <h3>Student Details</h3>
                      <label>
                        University / Institution
                        <input
                          value={(draft as StudentProfile).university}
                          onChange={(e) => setDraft({ ...(draft as StudentProfile), university: e.target.value })}
                          placeholder="University of Johannesburg"
                        />
                      </label>
                      <div className="form-row">
                        <label>
                          Year of Study
                          <select
                            value={(draft as StudentProfile).yearOfStudy}
                            onChange={(e) => setDraft({ ...(draft as StudentProfile), yearOfStudy: Number(e.target.value) })}
                          >
                            {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                          </select>
                        </label>
                        <label>
                          Move-in Date
                          <input
                            type="date"
                            value={(draft as StudentProfile).moveInDate}
                            onChange={(e) => setDraft({ ...(draft as StudentProfile), moveInDate: e.target.value })}
                          />
                        </label>
                      </div>
                      <label>
                        Special Needs / Accessibility
                        <textarea
                          value={(draft as StudentProfile).specialNeeds}
                          onChange={(e) => setDraft({ ...(draft as StudentProfile), specialNeeds: e.target.value })}
                          placeholder="e.g. wheelchair access, ground floor…"
                        />
                      </label>
                    </>
                  )}

                  {draft.role === 'landlord' && (
                    <>
                      <h3>Business Info</h3>
                      <label>
                        Business Name
                        <input
                          value={(draft as LandlordProfile).businessName}
                          onChange={(e) => setDraft({ ...(draft as LandlordProfile), businessName: e.target.value })}
                        />
                      </label>
                      <div className="form-row">
                        <label>
                          WhatsApp
                          <input
                            value={(draft as LandlordProfile).whatsapp}
                            onChange={(e) => setDraft({ ...(draft as LandlordProfile), whatsapp: e.target.value })}
                          />
                        </label>
                        <label>
                          Response Time
                          <select
                            value={(draft as LandlordProfile).responseTime}
                            onChange={(e) => setDraft({ ...(draft as LandlordProfile), responseTime: e.target.value })}
                          >
                            <option>within 1 hour</option>
                            <option>within 12 hours</option>
                            <option>within 24 hours</option>
                            <option>within 48 hours</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Properties Managed
                        <input
                          type="number"
                          min={1}
                          value={(draft as LandlordProfile).propertiesManaged}
                          onChange={(e) => setDraft({ ...(draft as LandlordProfile), propertiesManaged: Number(e.target.value) })}
                        />
                      </label>
                    </>
                  )}

                  {draft.role === 'admin' && (
                    <>
                      <h3>Admin Info</h3>
                      <label>
                        Department
                        <input
                          value={(draft as AdminProfile).department}
                          onChange={(e) => setDraft({ ...(draft as AdminProfile), department: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* ── PREFERENCES TAB ─────────────────────────────────────── */}
              {tab === 'preferences' && draft.role === 'student' && (
                <div className="drawer-section profile-fields">
                  <h3>Budget Range</h3>
                  <div className="form-row">
                    <label>
                      Min (ZAR/month)
                      <input
                        type="number"
                        value={(draft as StudentProfile).budgetMin}
                        onChange={(e) => setDraft({ ...(draft as StudentProfile), budgetMin: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Max (ZAR/month)
                      <input
                        type="number"
                        value={(draft as StudentProfile).budgetMax}
                        onChange={(e) => setDraft({ ...(draft as StudentProfile), budgetMax: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <h3>Room Type</h3>
                  <div className="room-type-cards">
                    {(['any', 'private', 'shared'] as const).map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        className={`room-type-card ${(draft as StudentProfile).roomType === rt ? 'active' : ''}`}
                        onClick={() => setDraft({ ...(draft as StudentProfile), roomType: rt })}
                      >
                        <span>{rt === 'private' ? '🚪' : rt === 'shared' ? '🛏️' : '🏠'}</span>
                        <strong>{rt === 'any' ? 'No preference' : rt.charAt(0).toUpperCase() + rt.slice(1)}</strong>
                      </button>
                    ))}
                  </div>

                  <h3>Transport Mode</h3>
                  <div className="transport-radio-group">
                    {(['walking', 'public-transport', 'own-car'] as TransportMode[]).map((t) => (
                      <label key={t} className={`transport-option ${(draft as StudentProfile).transportMode === t ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="transport-modal"
                          value={t}
                          checked={(draft as StudentProfile).transportMode === t}
                          onChange={() => setDraft({ ...(draft as StudentProfile), transportMode: t })}
                        />
                        <span>{t === 'walking' ? '🚶 Walking' : t === 'public-transport' ? '🚌 Public Transport' : '🚗 Own Car'}</span>
                      </label>
                    ))}
                  </div>

                  <h3>Security Priority</h3>
                  <div className="security-levels">
                    {(['low', 'medium', 'high'] as SecurityPriority[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`security-btn ${(draft as StudentProfile).securityPriority === s ? 'active' : ''}`}
                        onClick={() => setDraft({ ...(draft as StudentProfile), securityPriority: s })}
                      >
                        {s === 'low' ? '🟢 Low' : s === 'medium' ? '🟡 Medium' : '🔴 High'}
                      </button>
                    ))}
                  </div>

                  <h3>Lifestyle Tags</h3>
                  <div className="amenity-chips">
                    {lifestyleTags.map((tag) => (
                      <div
                        key={tag}
                        className={`chip ${(draft as StudentProfile).lifestyle.includes(tag) ? 'active' : ''}`}
                        onClick={() => toggleLifestyle(tag)}
                      >
                        {lifestyleEmoji[tag]} {tag}
                      </div>
                    ))}
                  </div>

                  <h3>Must-Have Amenities</h3>
                  <div className="amenity-chips">
                    {amenityOptions.map((a) => (
                      <div
                        key={a}
                        className={`chip ${(draft as StudentProfile).preferredAmenities.includes(a) ? 'active' : ''}`}
                        onClick={() => toggleAmenity(a)}
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'preferences' && draft.role !== 'student' && (
                <div className="drawer-section">
                  <p className="muted">Preferences are only available for student accounts.</p>
                </div>
              )}

              {/* ── ACCOUNT TAB ─────────────────────────────────────────── */}
              {tab === 'account' && (
                <div className="drawer-section profile-fields">
                  <h3>Account Info</h3>
                  <div className="account-info-row">
                    <span>Role</span><span className="role-tag">{authUser.role}</span>
                  </div>
                  <div className="account-info-row">
                    <span>Account ID</span><code className="account-id-code">{authUser.id}</code>
                  </div>

                  <div className="danger-zone">
                    <h3 className="danger-title">⚠️ Danger Zone</h3>
                    <p className="muted">Deleting your account is permanent and cannot be undone. All your listings, reviews, and data will be removed.</p>
                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete My Account
                      </button>
                    ) : (
                      <div className="delete-confirm-box">
                        <p>Type <strong>DELETE</strong> to confirm:</p>
                        <input
                          value={deleteInput}
                          onChange={(e) => setDeleteInput(e.target.value)}
                          placeholder="Type DELETE here"
                        />
                        <label>
                          Your Password
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Confirm your password"
                          />
                        </label>
                        {deleteError && <p className="auth-error">{deleteError}</p>}
                        <div className="actions-row">
                          <button
                            type="button"
                            className="danger"
                            disabled={isDeleting || deleteInput !== 'DELETE' || !deletePassword}
                            onClick={handleDelete}
                          >
                            {isDeleting ? 'Deleting…' : 'Permanently Delete Account'}
                          </button>
                          <button type="button" className="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeletePassword(''); setDeleteError(''); }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Save footer (not shown on account tab) */}
        {tab !== 'account' && (
          <div className="drawer-footer">
            {saveMsg && <span className={saveMsg.includes('✓') ? 'save-success' : 'auth-error'}>{saveMsg}</span>}
            <button type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
