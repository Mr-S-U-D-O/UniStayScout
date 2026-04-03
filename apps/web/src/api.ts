// Shared API helpers

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
export const AUTH_STORAGE_KEY = 'unistayscout-auth-user';
export const AUTH_SESSION_KEY = 'unistayscout-auth-session';
export const PROFILE_STORAGE_KEY = 'unistayscout-profile';

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

// ─── Profile API ───────────────────────────────────────────────────────────
import type { UserProfile } from './types';

export async function fetchProfile(token: string): Promise<UserProfile | null> {
  try {
    const r = await apiGet<{ data: UserProfile }>('/api/profile', token);
    return r.data;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: UserProfile, token: string): Promise<UserProfile | null> {
  try {
    const r = await apiPut<{ data: UserProfile }>('/api/profile', profile, token);
    return r.data;
  } catch {
    // Persist locally when backend unavailable
    return profile;
  }
}

export async function deleteAccount(password: string, token: string): Promise<void> {
  await apiDelete<{ ok: boolean }>('/api/auth/account', { password }, token);
}
