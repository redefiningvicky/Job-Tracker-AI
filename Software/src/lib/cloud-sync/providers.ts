import type { FieldMapping, MappableField, ProviderId, ProviderKind, SyncTarget } from './types';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  kind: ProviderKind;
  tagline: string;
  targetNoun: string;
  /** Tailwind classes for the tile. */
  tile: string;
  targets: SyncTarget[];
  scopes: string[];
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  'google-sheets': {
    id: 'google-sheets',
    name: 'Google Sheets',
    kind: 'sync',
    tagline: 'Two-way sync with a spreadsheet — one row per application.',
    targetNoun: 'spreadsheet',
    tile: 'bg-emerald-600',
    targets: [
      { id: 'new', name: 'Create new: “JobTrack Pipeline”' },
      { id: 'sheet-2026', name: 'Job Search 2026' },
      { id: 'sheet-career', name: 'Career Planning Tracker' },
    ],
    scopes: ['See, edit and create only the spreadsheets you pick', 'See your account email address'],
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    kind: 'sync',
    tagline: 'Mirror applications as pages in a Notion database.',
    targetNoun: 'database',
    tile: 'bg-slate-900',
    targets: [
      { id: 'new', name: 'Create new database in “Career HQ”' },
      { id: 'db-apps', name: 'Job Applications' },
      { id: 'db-opps', name: 'Career HQ / Opportunities' },
    ],
    scopes: ['Read and update pages in databases you share', 'Create pages for weekly digests'],
  },
  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    kind: 'storage',
    tagline: 'Versioned JSON backups in a Drive folder.',
    targetNoun: 'folder',
    tile: 'bg-amber-500',
    targets: [
      { id: 'drive-backups', name: 'My Drive / JobTrack Backups' },
      { id: 'drive-career', name: 'My Drive / Career' },
    ],
    scopes: ['Create and update files this app creates'],
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    kind: 'storage',
    tagline: 'Backups land in your Apps folder.',
    targetNoun: 'folder',
    tile: 'bg-sky-600',
    targets: [
      { id: 'dbx-apps', name: '/Apps/JobTrack' },
      { id: 'dbx-docs', name: '/Documents/Job Search' },
    ],
    scopes: ['Read and write files in /Apps/JobTrack'],
  },
  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    kind: 'storage',
    tagline: 'Keep backups next to your résumé.',
    targetNoun: 'folder',
    tile: 'bg-blue-600',
    targets: [
      { id: 'od-docs', name: 'Documents / JobTrack' },
      { id: 'od-career', name: 'Documents / Career / Backups' },
    ],
    scopes: ['Read and write files in the selected folder'],
  },
};

export const SYNC_PROVIDERS: ProviderId[] = ['google-sheets', 'notion'];
export const STORAGE_PROVIDERS: ProviderId[] = ['google-drive', 'dropbox', 'onedrive'];

export const FIELD_LABELS: Record<MappableField, string> = {
  company: 'Company',
  role: 'Role',
  status: 'Status',
  workMode: 'Work mode',
  location: 'Location',
  dateApplied: 'Date applied',
  salary: 'Salary range',
  url: 'Job URL',
  followUpDate: 'Follow-up date',
  notes: 'Notes',
};

const SHEETS_TYPES: Record<MappableField, string> = {
  company: 'Text',
  role: 'Text',
  status: 'Dropdown',
  workMode: 'Dropdown',
  location: 'Text',
  dateApplied: 'Date',
  salary: 'Currency',
  url: 'Hyperlink',
  followUpDate: 'Date',
  notes: 'Text',
};

const NOTION_TYPES: Record<MappableField, string> = {
  company: 'Title',
  role: 'Text',
  status: 'Status',
  workMode: 'Select',
  location: 'Text',
  dateApplied: 'Date',
  salary: 'Number',
  url: 'URL',
  followUpDate: 'Date',
  notes: 'Text',
};

export function defaultMapping(provider: ProviderId): FieldMapping[] {
  const types = provider === 'notion' ? NOTION_TYPES : SHEETS_TYPES;
  return (Object.keys(FIELD_LABELS) as MappableField[]).map((field) => ({
    field,
    remote: provider === 'notion' && field === 'company' ? 'Name' : FIELD_LABELS[field],
    type: types[field],
    enabled: field !== 'notes',
  }));
}
