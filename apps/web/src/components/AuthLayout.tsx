import { AuthRole, AuthUser } from '../types';

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

import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const childVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1 + 0.2, duration: 0.4, ease: 'easeOut' }
  })
};

export function AuthLayout({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authError,
  authLoading,
  submitLogin,
  submitRegister,
  demoAccounts
}: Props) {
  return (
    <main className="auth-screen">
      <motion.section
        className="auth-hero panel"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <span className="eyebrow">Map-first Housing Intelligence</span>
        <h1>UniStayScout</h1>
        <p className="hero-copy">Sign in to access your role-specific dashboard and map workspace.</p>
        <ul>
          {[
            'Students: discover listings on a live school-centered map.',
            'Landlords: publish properties and track moderation status.',
            'Admins: approve listings and manage incoming leads.'
          ].map((item, i) => (
            <motion.li key={i} custom={i} variants={childVariants} initial="hidden" animate="visible">
              {item}
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
            <h3>Demo Accounts</h3>
            {demoAccounts.map((account) => (
              <p key={account.email}>
                <strong>{account.role}:</strong> {account.email} / {account.password}
              </p>
            ))}
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="auth-card panel"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
      >
        <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <div className="auth-tabs">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            Login
          </button>
          <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
            Create Account
          </button>
        </div>

        {authMode === 'register' && (
          <label>
            Role
            <select
              value={authForm.role}
              onChange={(e) => setAuthForm((c) => ({ ...c, role: e.target.value as Exclude<AuthRole, 'admin'> }))}
            >
              <option value="student">Student</option>
              <option value="landlord">Landlord</option>
            </select>
          </label>
        )}

        {authMode === 'register' && (
          <label>
            Full Name
            <input value={authForm.name} onChange={(e) => setAuthForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={authForm.email}
            onChange={(e) => setAuthForm((c) => ({ ...c, email: e.target.value }))}
          />
        </label>

        {authMode === 'register' && (
          <label>
            Phone
            <input value={authForm.phone} onChange={(e) => setAuthForm((c) => ({ ...c, phone: e.target.value }))} />
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            value={authForm.password}
            onChange={(e) => setAuthForm((c) => ({ ...c, password: e.target.value }))}
          />
        </label>

        {authError && <p className="auth-error">{authError}</p>}

        {authMode === 'login' ? (
          <button type="button" disabled={authLoading} onClick={submitLogin}>
            {authLoading ? 'Logging in…' : 'Login'}
          </button>
        ) : (
          <button type="button" disabled={authLoading} onClick={submitRegister}>
            {authLoading ? 'Creating account…' : 'Create Account'}
          </button>
        )}
      </motion.section>
    </main>
  );
}
