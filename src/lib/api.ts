import { auth } from './firebase';
import type { AppRole } from '../types/simapas';

let memoryPreviewRole: AppRole | null = null;

export function setPreviewRole(role: AppRole | null) {
  memoryPreviewRole = role;
}

export function getPreviewRole(): AppRole | null {
  return memoryPreviewRole;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (memoryPreviewRole) {
    headers.set('X-Simapas-Preview-Role', memoryPreviewRole);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Terjadi kesalahan (${res.status}).`);
  }
  return data as T;
}
