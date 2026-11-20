import type { Status } from '@/lib/types';

export type ProviderId = 'google-sheets' | 'notion' | 'google-drive' | 'dropbox' | 'onedrive';
/** sync = two-way record sync (rows / database pages); storage = backup file uploads. */
export type ProviderKind = 'sync' | 'storage';

export type MappableField =
  | 'company'
  | 'role'
  | 'status'
  | 'workMode'
  | 'location'
  | 'dateApplied'
  | 'salary'
  | 'url'
  | 'followUpDate'
  | 'notes';

export interface FieldMapping {
  field: MappableField;
  /** Column (Sheets) or property (Notion) name on the remote side. */
  remote: string;
  type: string;
  enabled: boolean;
}

export interface SyncTarget {
  id: string;
  name: string;
}

export interface Connection {
  provider: ProviderId;
  account: string;
  target: SyncTarget;
  mapping?: FieldMapping[];
  connectedAt: string;
  lastSyncedAt?: string;
  lastSyncCount?: number;
  /** Push changes automatically shortly after you edit applications. */
  autoSync: boolean;
}

export type TemplateId = 'coach-digest' | 'mentor-share' | 'full-archive';

export type ActivityType = 'share' | 'email' | 'sync' | 'backup' | 'schedule' | 'connect' | 'download';
export type ActivityStatus = 'success' | 'failed' | 'info';
export type Destination = ProviderId | 'email' | 'link' | 'device';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  title: string;
  detail?: string;
  destination?: Destination;
  recordCount?: number;
  template?: TemplateId;
  /** For shares: the link, so it can be copied again from the log. */
  link?: string;
  expiresAt?: string | null;
  at: string;
  /** Repeated background events (auto-sync) collapse into one entry. */
  coalesceKey?: string;
  repeat?: number;
}

export type Frequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleId = 'weekly-digest' | 'auto-backup';

export interface Schedule {
  id: ScheduleId;
  kind: 'digest' | 'backup';
  enabled: boolean;
  frequency: Frequency;
  /** 0 = Sunday */
  dayOfWeek: number;
  /** 1–28 so every month has it. */
  dayOfMonth: number;
  /** HH:MM, 24h */
  time: string;
  template: TemplateId;
  recipients: string[];
  destinations: ProviderId[];
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface SharedLink {
  id: string;
  url: string;
  title: string;
  template: TemplateId;
  createdAt: string;
  expiresAt: string | null;
  redacted: boolean;
  recordCount: number;
}

export type ContactLabel = 'Coach' | 'Mentor' | 'Partner' | 'Recruiter' | 'Friend';

export interface Contact {
  email: string;
  label: ContactLabel;
  lastUsedAt: string;
}

export interface HubState {
  version: 1;
  profile: { name: string };
  connections: Partial<Record<ProviderId, Connection>>;
  schedules: Schedule[];
  activity: ActivityEntry[];
  links: SharedLink[];
  contacts: Contact[];
}

export interface SyncJob {
  provider: ProviderId;
  phase: string;
  progress: number;
  auto: boolean;
  startedAt: string;
}

// ── Digest content (shared by email preview, share links and the snapshot viewer) ──

export interface DigestItem {
  company: string;
  role: string;
  status?: Status;
  meta?: string;
  note?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export interface DigestSection {
  id: string;
  title: string;
  subtitle?: string;
  items: DigestItem[];
  empty: string;
}

export interface DigestStat {
  label: string;
  value: string;
  hint?: string;
}

export interface DigestContent {
  template: TemplateId;
  title: string;
  subject: string;
  preheader: string;
  intro: string;
  note?: string;
  owner: string;
  stats: DigestStat[];
  sections: DigestSection[];
  recordCount: number;
  redacted: boolean;
  generatedAt: string;
}
