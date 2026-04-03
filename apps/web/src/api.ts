// Shared API helpers

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
export const AUTH_STORAGE_KEY = 'unistayscout-auth-user';
export const AUTH_SESSION_KEY = 'unistayscout-auth-session';
export const PROFILE_STORAGE_KEY = 'unistayscout-profile';

const NETWORK_ERROR_MESSAGE = 'Unable to connect right now. Please try again in a moment.';

function normalizeServerMessage(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed) as { message?: string };
    if (parsed?.message) return parsed.message;
  } catch {
    // Keep original content when this is not JSON.
  }

  return trimmed;
}

function toFriendlyMessage(message: string, fallback: string): string {
  const cleaned = message.trim();
  if (!cleaned) return fallback;

  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(cleaned)) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (/request failed:/i.test(cleaned)) {
    return fallback;
  }

  return cleaned;
}

async function requestWithHandling(path: string, init: RequestInit, fallback: string): Promise<Response> {
  try {
    const response = await fetch(`${API_BASE}${path}`, init);
    if (!response.ok) {
      const raw = await response.text();
      const message = toFriendlyMessage(normalizeServerMessage(raw), fallback);
      throw new Error(message);
    }
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(toFriendlyMessage(error.message, fallback));
    }
    throw new Error(fallback);
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await requestWithHandling(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }, 'Unable to load data right now. Please try again.');
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await requestWithHandling(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }, 'Unable to complete this action right now. Please try again.');
  return response.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, file: File, token?: string): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await requestWithHandling(path, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  }, 'Upload failed. Please try again.');
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await requestWithHandling(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }, 'Unable to save changes right now. Please try again.');
  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const response = await requestWithHandling(path, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }, 'Unable to complete this request right now. Please try again.');
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
