import { sanitizeApplication } from './sanitize';
import type { Application } from './types';

export const BACKUP_APP_ID = 'jobtrack';

export function createBackup(applications: Application[]): string {
  return JSON.stringify(
    {
      app: BACKUP_APP_ID,
      version: 1,
      exportedAt: new Date().toISOString(),
      count: applications.length,
      applications,
    },
    null,
    2,
  );
}

export interface ParsedBackup {
  applications: Application[];
  skipped: number;
  exportedAt?: string;
}

export function parseBackup(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }

  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as {
    applications?: unknown;
    exportedAt?: unknown;
  };
  const list: unknown = Array.isArray(parsed) ? parsed : obj.applications;
  if (!Array.isArray(list)) {
    throw new Error('No applications found. Choose a JSON backup exported from this app.');
  }

  const applications: Application[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const item of list) {
    const app = sanitizeApplication(item);
    if (!app || seen.has(app.id)) {
      skipped++;
      continue;
    }
    seen.add(app.id);
    applications.push(app);
  }

  if (applications.length === 0 && list.length > 0) {
    throw new Error('None of the records in this file could be read.');
  }

  return {
    applications,
    skipped,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined,
  };
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
