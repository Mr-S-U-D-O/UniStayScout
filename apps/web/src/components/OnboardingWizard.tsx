import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AuthUser, AuthRole,
  StudentProfile, LandlordProfile, AdminProfile, UserProfile,
  LifestyleTag, TransportMode, SecurityPriority,
  makeEmptyStudentProfile, makeEmptyLandlordProfile, makeEmptyAdminProfile,
} from '../types';
import {
  IconGraduationCap, IconHome, IconUser, IconBriefcase, IconPhone,
  IconShield, IconCheck, IconArrowRight, IconChevronLeft,
} from './Icons';

const amenityOptions = ['wifi', 'security', 'laundry', 'parking', 'backup-power'];
const lifestyleTags: LifestyleTag[] = ['quiet', 'social', 'night-owl', 'early-riser', 'pet-friendly', 'study-focused'];
const lifestyleEmoji: Record<LifestyleTag, string> = {
  quiet: '🤫', social: '🎉', 'night-owl': '🦉', 'early-riser': '🌅', 'pet-friendly': '🐾', 'study-focused': '📚',
};

type Props = {
  authUser: AuthUser;
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
};

type StudentStep = 'welcome' | 'university' | 'budget' | 'lifestyle' | 'done';
type LandlordStep = 'welcome' | 'business' | 'contact' | 'done';
type AdminStep = 'welcome' | 'department' | 'done';

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

export function OnboardingWizard({ authUser, onComplete, onSkip }: Props) {
  const role = authUser.role as AuthRole;

  // Student state
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    ...makeEmptyStudentProfile(),
    university: '',
  });
  const [studentStep, setStudentStep] = useState<StudentStep>('welcome');

  // Landlord state
  const [landlordProfile, setLandlordProfile] = useState<LandlordProfile>(makeEmptyLandlordProfile());
  const [landlordStep, setLandlordStep] = useState<LandlordStep>('welcome');

  // Admin state
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(makeEmptyAdminProfile());
  const [adminStep, setAdminStep] = useState<AdminStep>('welcome');

  // Shared avatar
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarInput, setAvatarInput] = useState('');

  function toggleLifestyle(tag: LifestyleTag) {
    setStudentProfile((p) => ({
      ...p,
      lifestyle: p.lifestyle.includes(tag)
        ? p.lifestyle.filter((t) => t !== tag)
        : [...p.lifestyle, tag],
    }));
  }

  function toggleAmenity(a: string) {
    setStudentProfile((p) => ({
      ...p,
      preferredAmenities: p.preferredAmenities.includes(a)
        ? p.preferredAmenities.filter((x) => x !== a)
        : [...p.preferredAmenities, a],
    }));
  }

  function finishStudent() {
    onComplete({ ...studentProfile, avatarUrl });
  }
  function finishLandlord() {
    onComplete({ ...landlordProfile, avatarUrl });
  }
  function finishAdmin() {
    onComplete({ ...adminProfile, avatarUrl });
  }

  // ─── Avatar shared section ───────────────────────────────────────────────
  function AvatarSection() {
    return (
      <div className="avatar-upload-zone">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="avatar-preview-lg" />
        ) : (
          <div className="avatar-placeholder-lg">
            {authUser.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="avatar-url-row">
          <input
            placeholder="Paste image URL…"
            value={avatarInput}
            onChange={(e) => setAvatarInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => { if (avatarInput.trim()) { setAvatarUrl(avatarInput.trim()); setAvatarInput(''); } }}
          >
            Set
          </button>
          {avatarUrl && (
            <button type="button" className="outline" onClick={() => setAvatarUrl('')}>Remove</button>
          )}
        </div>
      </div>
    );
  }

  // ─── STUDENT WIZARD ──────────────────────────────────────────────────────
  if (role === 'student') {
    const steps: StudentStep[] = ['welcome', 'university', 'budget', 'lifestyle', 'done'];
    const stepIdx = steps.indexOf(studentStep);

    return (
      <OnboardingShell
        title="Student Profile Setup"
        subtitle={`Step ${stepIdx + 1} of ${steps.length}`}
        progress={(stepIdx / (steps.length - 1)) * 100}
        onSkip={onSkip}
      >
        <AnimatePresence mode="wait">
          <motion.div key={studentStep} variants={pageVariants} initial="enter" animate="center" exit="exit">
            {studentStep === 'welcome' && (
              <div className="ob-step">
                <div className="ob-icon-badge"><IconGraduationCap size={28} /></div>
                <h3>Welcome, {authUser.name}</h3>
                <p className="muted">Set up your profile in 2 minutes so the AI can find the perfect accommodation for you.</p>
                <AvatarSection />
                <label>
                  A bit about you (optional)
                  <textarea
                    value={studentProfile.bio}
                    onChange={(e) => setStudentProfile((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="e.g. 2nd year engineering student, looking for a quiet place close to campus…"
                  />
                </label>
                <button type="button" onClick={() => setStudentStep('university')}>Let's go →</button>
              </div>
            )}

            {studentStep === 'university' && (
              <div className="ob-step">
                <div className="ob-icon-badge"><IconHome size={28} /></div>
                <h3>Your Studies</h3>
                <p className="muted">This helps the AI centre the map around your campus and filter by proximity.</p>
                <div className="profile-fields">
                  <label>
                    University / Institution
                    <input
                      value={studentProfile.university}
                      onChange={(e) => setStudentProfile((p) => ({ ...p, university: e.target.value }))}
                      placeholder="e.g. University of Johannesburg"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Year of Study
                      <select
                        value={studentProfile.yearOfStudy}
                        onChange={(e) => setStudentProfile((p) => ({ ...p, yearOfStudy: Number(e.target.value) }))}
                      >
                        {[1, 2, 3, 4, 5, 6].map((y) => (
                          <option key={y} value={y}>Year {y}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Move-in Date
                      <input
                        type="date"
                        value={studentProfile.moveInDate}
                        onChange={(e) => setStudentProfile((p) => ({ ...p, moveInDate: e.target.value }))}
                      />
                    </label>
                  </div>
                </div>
                <div className="ob-nav">
                  <button type="button" className="outline" onClick={() => setStudentStep('welcome')}>← Back</button>
                  <button type="button" onClick={() => setStudentStep('budget')}>Next →</button>
                </div>
              </div>
            )}

            {studentStep === 'budget' && (
              <div className="ob-step">
                <div className="ob-icon-badge"><IconBriefcase size={28} /></div>
                <h3>Budget & Room</h3>
                <p className="muted">Set your monthly rental range so the AI only recommends what you can afford.</p>
                <div className="profile-fields">
                  <div className="form-row">
                    <label>
                      Min Budget (ZAR/month)
                      <input
                        type="number"
                        min={500}
                        max={studentProfile.budgetMax - 100}
                        value={studentProfile.budgetMin}
                        onChange={(e) => setStudentProfile((p) => ({ ...p, budgetMin: Number(e.target.value) }))}
                      />
                    </label>
                    <label>
                      Max Budget (ZAR/month)
                      <input
                        type="number"
                        min={studentProfile.budgetMin + 100}
                        value={studentProfile.budgetMax}
                        onChange={(e) => setStudentProfile((p) => ({ ...p, budgetMax: Number(e.target.value) }))}
                      />
                    </label>
                  </div>
                  <div className="budget-range-display">
                    <span>R{studentProfile.budgetMin.toLocaleString()}</span>
                    <div className="budget-range-bar">
                      <div
                        className="budget-range-fill budget-range-fill-full"
                      />
                    </div>
                    <span>R{studentProfile.budgetMax.toLocaleString()}</span>
                  </div>

                  <label>
                    Room Type Preference
                    <div className="room-type-cards">
                      {(['any', 'private', 'shared'] as const).map((rt) => (
                        <button
                          key={rt}
                          type="button"
                          className={`room-type-card ${studentProfile.roomType === rt ? 'active' : ''}`}
                          onClick={() => setStudentProfile((p) => ({ ...p, roomType: rt }))}
                        >
                          <span>{rt === 'private' ? '🚪' : rt === 'shared' ? '🛏️' : '🏠'}</span>
                          <strong>{rt === 'any' ? 'No preference' : rt.charAt(0).toUpperCase() + rt.slice(1)}</strong>
                        </button>
                      ))}
                    </div>
                  </label>

                  <label>
                    How do you get to campus?
                    <div className="transport-radio-group">
                      {(['walking', 'public-transport', 'own-car'] as TransportMode[]).map((t) => (
                        <label key={t} className={`transport-option ${studentProfile.transportMode === t ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="transport"
                            value={t}
                            checked={studentProfile.transportMode === t}
                            onChange={() => setStudentProfile((p) => ({ ...p, transportMode: t }))}
                          />
                          <span>{t === 'walking' ? '🚶 Walking' : t === 'public-transport' ? '🚌 Public Transport' : '🚗 Own Car'}</span>
                        </label>
                      ))}
                    </div>
                  </label>
                </div>
                <div className="ob-nav">
                  <button type="button" className="outline" onClick={() => setStudentStep('university')}>← Back</button>
                  <button type="button" onClick={() => setStudentStep('lifestyle')}>Next →</button>
                </div>
              </div>
            )}

            {studentStep === 'lifestyle' && (
              <div className="ob-step">
                <div className="ob-icon-badge"><IconUser size={28} /></div>
                <h3>Lifestyle & Preferences</h3>
                <p className="muted">The more context you give the AI, the better it can match you.</p>
                <div className="profile-fields">
                  <label>Your lifestyle (pick all that apply)</label>
                  <div className="amenity-chips">
                    {lifestyleTags.map((tag) => (
                      <div
                        key={tag}
                        className={`chip ${studentProfile.lifestyle.includes(tag) ? 'active' : ''}`}
                        onClick={() => toggleLifestyle(tag)}
                      >
                        {lifestyleEmoji[tag]} {tag}
                      </div>
                    ))}
                  </div>

                  <label>Security priority</label>
                  <div className="security-levels">
                    {(['low', 'medium', 'high'] as SecurityPriority[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`security-btn ${studentProfile.securityPriority === s ? 'active' : ''}`}
                        onClick={() => setStudentProfile((p) => ({ ...p, securityPriority: s }))}
                      >
                        {s === 'low' ? '🟢 Low' : s === 'medium' ? '🟡 Medium' : '🔴 High'}
                      </button>
                    ))}
                  </div>

                  <label>Must-have amenities</label>
                  <div className="amenity-chips">
                    {amenityOptions.map((a) => (
                      <div
                        key={a}
                        className={`chip ${studentProfile.preferredAmenities.includes(a) ? 'active' : ''}`}
                        onClick={() => toggleAmenity(a)}
                      >
                        {a}
                      </div>
                    ))}
                  </div>

                  <label>
                    Special needs / accessibility requirements (optional)
                    <textarea
                      value={studentProfile.specialNeeds}
                      onChange={(e) => setStudentProfile((p) => ({ ...p, specialNeeds: e.target.value }))}
                      placeholder="e.g. wheelchair access, ground floor, no stairs…"
                    />
                  </label>
                </div>
                <div className="ob-nav">
                  <button type="button" className="outline" onClick={() => setStudentStep('budget')}>← Back</button>
                  <button type="button" onClick={() => setStudentStep('done')}>Almost done →</button>
                </div>
              </div>
            )}

            {studentStep === 'done' && (
              <div className="ob-step ob-done">
                <div className="ob-icon-badge ob-done-badge"><IconCheck size={28} /></div>
                <h3>You're all set</h3>
                <p className="muted">Your profile is saved. The AI will now use your preferences to find the best listings on the map.</p>
                <div className="ob-summary">
                  <div className="ob-summary-row"><span>Uni</span><strong>{studentProfile.university || '—'}</strong></div>
                  <div className="ob-summary-row"><span>Budget</span><strong>R{studentProfile.budgetMin.toLocaleString()} – R{studentProfile.budgetMax.toLocaleString()}</strong></div>
                  <div className="ob-summary-row"><span>Room</span><strong>{studentProfile.roomType}</strong></div>
                  <div className="ob-summary-row"><span>Transport</span><strong>{studentProfile.transportMode}</strong></div>
                  <div className="ob-summary-row"><span>Security</span><strong>{studentProfile.securityPriority}</strong></div>
                </div>
                <button type="button" onClick={finishStudent}>Enter UniStayScout →</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </OnboardingShell>
    );
  }

  // ─── LANDLORD WIZARD ─────────────────────────────────────────────────────
  if (role === 'landlord') {
    const steps: LandlordStep[] = ['welcome', 'business', 'contact', 'done'];
    const stepIdx = steps.indexOf(landlordStep);
    return (
      <OnboardingShell
        title="Landlord Profile Setup"
        subtitle={`Step ${stepIdx + 1} of ${steps.length}`}
        progress={(stepIdx / (steps.length - 1)) * 100}
        onSkip={onSkip}
      >
        <AnimatePresence mode="wait">
          <motion.div key={landlordStep} variants={pageVariants} initial="enter" animate="center" exit="exit">
            {landlordStep === 'welcome' && (
            <div className="ob-step">
              <div className="ob-icon-badge"><IconHome size={28} /></div>
              <h3>Welcome, {authUser.name}</h3>
                <p className="muted">Set up your landlord profile to attract the right students and build trust.</p>
                <AvatarSection />
                <label>
                  About you / your property management business
                  <textarea
                    value={landlordProfile.bio}
                    onChange={(e) => setLandlordProfile((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="e.g. I manage 3 residential properties near UJ with 24h security and reliable internet…"
                  />
                </label>
                <button type="button" onClick={() => setLandlordStep('business')}>Next →</button>
              </div>
            )}

            {landlordStep === 'business' && (
            <div className="ob-step">
              <div className="ob-icon-badge"><IconBriefcase size={28} /></div>
              <h3>Business Details</h3>
                <div className="profile-fields">
                  <label>
                    Business / Trading Name
                    <input
                      value={landlordProfile.businessName}
                      onChange={(e) => setLandlordProfile((p) => ({ ...p, businessName: e.target.value }))}
                      placeholder="e.g. Mthembu Student Accommodation"
                    />
                  </label>
                  <label>
                    How many properties do you manage?
                    <input
                      type="number"
                      min={1}
                      value={landlordProfile.propertiesManaged}
                      onChange={(e) => setLandlordProfile((p) => ({ ...p, propertiesManaged: Number(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Typical response time
                    <select
                      value={landlordProfile.responseTime}
                      onChange={(e) => setLandlordProfile((p) => ({ ...p, responseTime: e.target.value }))}
                    >
                      <option>within 1 hour</option>
                      <option>within 12 hours</option>
                      <option>within 24 hours</option>
                      <option>within 48 hours</option>
                    </select>
                  </label>
                </div>
                <div className="ob-nav">
                  <button type="button" className="outline" onClick={() => setLandlordStep('welcome')}>← Back</button>
                  <button type="button" onClick={() => setLandlordStep('contact')}>Next →</button>
                </div>
              </div>
            )}

            {landlordStep === 'contact' && (
            <div className="ob-step">
              <div className="ob-icon-badge"><IconPhone size={28} /></div>
              <h3>Contact Details</h3>
                <div className="profile-fields">
                  <label>
                    WhatsApp Number
                    <input
                      value={landlordProfile.whatsapp}
                      onChange={(e) => setLandlordProfile((p) => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="+27 XX XXX XXXX"
                    />
                  </label>
                </div>
                <div className="ob-nav">
                  <button type="button" className="outline" onClick={() => setLandlordStep('business')}>← Back</button>
                  <button type="button" onClick={() => setLandlordStep('done')}>Almost done →</button>
                </div>
              </div>
            )}

            {landlordStep === 'done' && (
            <div className="ob-step ob-done">
              <div className="ob-icon-badge ob-done-badge"><IconCheck size={28} /></div>
              <h3>Profile ready</h3>
                <p className="muted">Students can now see your landlord profile when viewing your listings.</p>
                <button type="button" onClick={finishLandlord}>Enter Dashboard →</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </OnboardingShell>
    );
  }

  // ─── ADMIN WIZARD ────────────────────────────────────────────────────────
  const adminSteps: AdminStep[] = ['welcome', 'department', 'done'];
  const adminStepIdx = adminSteps.indexOf(adminStep);
  return (
    <OnboardingShell
      title="Admin Profile Setup"
      subtitle={`Step ${adminStepIdx + 1} of ${adminSteps.length}`}
      progress={(adminStepIdx / (adminSteps.length - 1)) * 100}
      onSkip={onSkip}
    >
      <AnimatePresence mode="wait">
        <motion.div key={adminStep} variants={pageVariants} initial="enter" animate="center" exit="exit">
          {adminStep === 'welcome' && (
          <div className="ob-step">
            <div className="ob-icon-badge"><IconShield size={28} /></div>
            <h3>Admin Setup</h3>
              <AvatarSection />
              <label>
                About you
                <textarea
                  value={adminProfile.bio}
                  onChange={(e) => setAdminProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Your role and responsibilities…"
                />
              </label>
              <button type="button" onClick={() => setAdminStep('department')}>Next →</button>
            </div>
          )}
          {adminStep === 'department' && (
          <div className="ob-step">
            <div className="ob-icon-badge"><IconBriefcase size={28} /></div>
            <h3>Your Department</h3>
              <label>
                Department / Team
                <input
                  value={adminProfile.department}
                  onChange={(e) => setAdminProfile((p) => ({ ...p, department: e.target.value }))}
                  placeholder="e.g. Housing & Student Affairs"
                />
              </label>
              <div className="ob-nav">
                <button type="button" className="outline" onClick={() => setAdminStep('welcome')}>← Back</button>
                <button type="button" onClick={() => setAdminStep('done')}>Done →</button>
              </div>
            </div>
          )}
          {adminStep === 'done' && (
          <div className="ob-step ob-done">
            <div className="ob-icon-badge ob-done-badge"><IconCheck size={28} /></div>
            <h3>Ready to moderate</h3>
              <p className="muted">Your admin profile is set up.</p>
              <button type="button" onClick={finishAdmin}>Enter Admin Panel →</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}

// ─── Shared Shell ────────────────────────────────────────────────────────────
function OnboardingShell({
  title, subtitle, progress, onSkip, children,
}: {
  title: string; subtitle: string; progress: number; onSkip: () => void; children: React.ReactNode;
}) {
  return (
    <div className="ob-overlay">
      <motion.div
        className="ob-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35 }}
      >
        <div className="ob-header">
          <div>
            <h2 className="onboarding-title">{title}</h2>
            <p className="muted onboarding-subtitle">{subtitle}</p>
          </div>
          <button type="button" className="ob-skip" onClick={onSkip}>Skip for now</button>
        </div>
        <div className="ob-progress-bar">
          <motion.div
            className="ob-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="ob-body">{children}</div>
      </motion.div>
    </div>
  );
}
