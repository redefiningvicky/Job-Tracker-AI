import { STATUSES, WORK_MODES, type Application, type ApplicationInput, type InterviewNote, type Status, type WorkMode } from './types';
import { parseISODate, todayISO } from './utils';

export interface FormValues {
  company: string;
  role: string;
  status: Status;
  workMode: WorkMode;
  dateApplied: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  url: string;
  followUpDate: string;
  notes: string;
  interviewNotes: InterviewNote[];
}

export type FormErrors = Partial<Record<keyof FormValues, string>>;

export interface NoteDraft {
  date: string;
  stage: Status | '';
  content: string;
  /** id of the note being edited, if any */
  editingId?: string | null;
}

export function emptyForm(defaults?: Partial<FormValues>): FormValues {
  return {
    company: '',
    role: '',
    status: 'applied',
    workMode: 'remote',
    dateApplied: todayISO(),
    location: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    url: '',
    followUpDate: '',
    notes: '',
    interviewNotes: [],
    ...defaults,
  };
}

export function fromApplication(a: Application): FormValues {
  return {
    company: a.company,
    role: a.role,
    status: a.status,
    workMode: a.workMode,
    dateApplied: a.dateApplied,
    location: a.location ?? '',
    salaryMin: a.salaryMin != null ? String(a.salaryMin) : '',
    salaryMax: a.salaryMax != null ? String(a.salaryMax) : '',
    currency: a.currency,
    url: a.url ?? '',
    followUpDate: a.followUpDate ?? '',
    notes: a.notes ?? '',
    interviewNotes: a.interviewNotes,
  };
}

/** "120k", "$95,000", "1.2m" → number. undefined = empty, null = invalid. */
export function parseSalary(input: string): number | undefined | null {
  const t = input.trim().toLowerCase().replace(/[,\s$€£¥₹]/g, '');
  if (!t) return undefined;
  const m = /^(\d+(?:\.\d+)?)(k|m)?$/.exec(t);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === 'k') n *= 1_000;
  if (m[2] === 'm') n *= 1_000_000;
  return Math.round(n);
}

/** Adds https:// to bare domains like "jobs.example.com/123". */
export function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return '';
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+/.test(t)) return `https://${t}`;
  return t;
}

export function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return (
      (u.protocol === 'http:' || u.protocol === 'https:') &&
      (u.hostname.includes('.') || u.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

export function validateForm(v: FormValues): FormErrors {
  const e: FormErrors = {};

  const company = v.company.trim();
  if (!company) e.company = 'Company is required';
  else if (company.length > 100) e.company = 'Keep it under 100 characters';

  const role = v.role.trim();
  if (!role) e.role = 'Role title is required';
  else if (role.length > 120) e.role = 'Keep it under 120 characters';

  if (!STATUSES.includes(v.status)) e.status = 'Choose a status';
  if (!WORK_MODES.includes(v.workMode)) e.workMode = 'Choose a work mode';

  if (!v.dateApplied) e.dateApplied = 'Date is required';
  else if (!parseISODate(v.dateApplied)) e.dateApplied = 'Enter a valid date';
  else if (v.status !== 'wishlist' && v.dateApplied > todayISO())
    e.dateApplied = "Date applied can't be in the future";

  const min = parseSalary(v.salaryMin);
  const max = parseSalary(v.salaryMax);
  if (min === null) e.salaryMin = 'Use a number, e.g. 90000 or 90k';
  if (max === null) e.salaryMax = 'Use a number, e.g. 120000 or 120k';
  if (typeof min === 'number' && typeof max === 'number' && max < min)
    e.salaryMax = 'Max must be at least the min';

  if (v.url.trim() && !isValidUrl(normalizeUrl(v.url)))
    e.url = 'Enter a valid URL, e.g. https://company.com/jobs/123';

  if (v.followUpDate && !parseISODate(v.followUpDate)) e.followUpDate = 'Enter a valid date';

  if (v.notes.length > 5000) e.notes = 'Notes are limited to 5,000 characters';

  return e;
}

export function toInput(v: FormValues): ApplicationInput {
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  const min = parseSalary(v.salaryMin);
  const max = parseSalary(v.salaryMax);
  return {
    company: v.company.trim(),
    role: v.role.trim(),
    status: v.status,
    workMode: v.workMode,
    dateApplied: v.dateApplied,
    location: opt(v.location),
    salaryMin: typeof min === 'number' ? min : undefined,
    salaryMax: typeof max === 'number' ? max : undefined,
    currency: v.currency,
    url: opt(normalizeUrl(v.url)),
    followUpDate: v.followUpDate || undefined,
    notes: opt(v.notes),
    interviewNotes: v.interviewNotes,
  };
}
