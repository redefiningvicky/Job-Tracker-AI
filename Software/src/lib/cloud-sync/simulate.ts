import { PROVIDERS } from './providers';
import type { ProviderId } from './types';

export interface SimStep {
  phase: string;
  /** Progress (0–1) reached when this step finishes. */
  until: number;
  ms: number;
}

/** Realistic-feeling phases for a simulated sync or backup upload. */
export function syncPlan(provider: ProviderId, records: number, auto: boolean): SimStep[] {
  const meta = PROVIDERS[provider];
  const scale = auto ? 0.6 : 1;
  const push = Math.min(1600, 500 + records * 40) * scale;
  if (meta.kind === 'storage') {
    return [
      { phase: 'Packaging snapshot', until: 0.2, ms: 450 * scale },
      { phase: 'Encrypting', until: 0.35, ms: 400 * scale },
      { phase: `Uploading to ${meta.name}`, until: 0.9, ms: push },
      { phase: 'Verifying checksum', until: 1, ms: 400 * scale },
    ];
  }
  const noun = provider === 'notion' ? 'pages' : 'rows';
  return [
    { phase: `Connecting to ${meta.name}`, until: 0.12, ms: 400 * scale },
    { phase: 'Reading remote changes', until: 0.3, ms: 600 * scale },
    { phase: 'Comparing records', until: 0.45, ms: 450 * scale },
    { phase: `Writing ${records} ${noun}`, until: 0.92, ms: push },
    { phase: 'Finalizing', until: 1, ms: 350 * scale },
  ];
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `jobtrack-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export function estimateBackupBytes(records: number): number {
  return 600 + records * 820;
}
