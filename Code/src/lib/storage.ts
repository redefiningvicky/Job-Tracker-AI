import { BACKUP_KEY, STORAGE_KEY } from './constants';
import { sanitizeApplication } from './sanitize';
import type { Application } from './types';

export class CorruptDataError extends Error {}

/**
 * Reads applications from localStorage. Throws CorruptDataError when the saved
 * data can't be parsed; the raw value is copied aside first so it isn't lost
 * the next time the app saves.
 */
export function loadApplications(): Application[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { applications?: unknown } | null)?.applications;
    if (!Array.isArray(list)) throw new Error('Unexpected data shape');
    return list.map(sanitizeApplication).filter((a): a is Application => a !== null);
  } catch (err) {
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:corrupt-${Date.now()}`, raw);
    } catch {
      /* storage full — nothing more we can do */
    }
    throw new CorruptDataError(err instanceof Error ? err.message : 'Corrupted data');
  }
}

export function saveApplications(applications: Application[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, applications }));
}

export function getLastBackup(): string | null {
  try {
    return window.localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackup(iso: string): void {
  try {
    window.localStorage.setItem(BACKUP_KEY, iso);
  } catch {
    /* non-critical */
  }
}
