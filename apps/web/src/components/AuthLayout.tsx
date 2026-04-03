import React from 'react';
import { motion } from 'framer-motion';
import { AuthRole } from '../types';
import { IconCheck, IconMapPin, IconUser, IconHome, IconGraduationCap } from './Icons';

type Props = {
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  authForm: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<AuthRole, 'admin'>;
  };
  setAuthForm: React.Dispatch<React.SetStateAction<Props['authForm']>>;
  authError: string;
  authLoading: boolean;
  submitLogin: () => void;
  submitRegister: () => void;
  demoAccounts: Array<{ role: string; email: string; password: string }>;
};

const features = [
  { icon: <IconGraduationCap size={16} />, text: 'Students: discover verified listings on a live campus-centred map.' },
  { icon: <IconHome size={16} />,          text: 'Landlords: publish properties and track moderation status.' },
  { icon: <IconUser size={16} />,          text: 'Admins: approve listings and manage incoming student leads.' },
];

export function AuthLayout({
  authMode, setAuthMode,
  authForm, setAuthForm,
  authError, authLoading,
  submitLogin, submitRegister,
  demoAccounts,
}: Props) {
  return (
    <main className="auth-screen">
      <motion.section
        className="auth-hero panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="auth-hero-eyebrow">
          <IconMapPin size={14} />
          <span>Map-first Housing Intelligence</span>
        </div>
        <h1>UniStayScout</h1>
        <p className="hero-copy">Find, compare, and secure student accommodation near your campus — with AI-powered recommendations that match your budget, lifestyle and location.</p>

        <ul>
          {features.map(({ icon, text }, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 + 0.2, duration: 0.35 }}
            >
              {icon}
              {text}
            </motion.li>
          ))}
        </ul>

        {demoAccounts.length > 0 && (
          <motion.div
            className="demo-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="demo-box-label">Demo accounts</p>
            {demoAccounts.map((account) => (
              <div key={account.email} className="demo-row">
                <span className="role-tag">{account.role}</span>
                <code>{account.email}</code>
                <span className="demo-sep">/</span>
                <code>{account.password}</code>
              </div>
            ))}
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="auth-card panel"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>
            {authMode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {authMode === 'login' ? 'Sign in to your UniStayScout workspace.' : 'Get started in 60 seconds.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            Sign in
          </button>
          <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
            Register
          </button>
        </div>

        <div className="profile-fields">
          {authMode === 'register' && (
            <label>
              I am a
              <div className="auth-role-cards">
                {(['student', 'landlord'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`auth-role-card ${authForm.role === r ? 'active' : 'outline'}`}
                    onClick={() => setAuthForm((c) => ({ ...c, role: r }))}
                  >
                    {r === 'student' ? <IconGraduationCap size={18} /> : <IconHome size={18} />}
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </label>
          )}

          {authMode === 'register' && (
            <label>
              Full Name
              <input
                placeholder="Your full name"
                value={authForm.name}
                onChange={(e) => setAuthForm((c) => ({ ...c, name: e.target.value }))}
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              placeholder="you@example.com"
              value={authForm.email}
              onChange={(e) => setAuthForm((c) => ({ ...c, email: e.target.value }))}
            />
          </label>

          {authMode === 'register' && (
            <label>
              Phone number
              <input
                placeholder="+27 XX XXX XXXX"
                value={authForm.phone}
                onChange={(e) => setAuthForm((c) => ({ ...c, phone: e.target.value }))}
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={authForm.password}
              onChange={(e) => setAuthForm((c) => ({ ...c, password: e.target.value }))}
            />
          </label>
        </div>

        {authError && <p className="auth-error">{authError}</p>}

        {authMode === 'login' ? (
          <button type="button" disabled={authLoading} onClick={submitLogin} style={{ width: '100%' }}>
            {authLoading ? 'Signing in…' : 'Sign in'}
          </button>
        ) : (
          <button type="button" disabled={authLoading} onClick={submitRegister} style={{ width: '100%' }}>
            {authLoading ? 'Creating account…' : 'Create account'}
          </button>
        )}
      </motion.section>
    </main>
  );
}
