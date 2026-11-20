import { CURRENCIES } from './constants';
import {
  STATUSES,
  WORK_MODES,
  type Application,
  type InterviewNote,
  type Status,
  type StatusChange,
  type WorkMode,
} from './types';
import { parseISODate, todayISO, uid } from './utils';

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined;
const isStatus = (v: unknown): v is Status => STATUSES.includes(v as Status);
const isWorkMode = (v: unknown): v is WorkMode => WORK_MODES.includes(v as WorkMode);
const isDate = (v: unknown): v is string => typeof v === 'string' && parseISODate(v) !== null;
const isTimestamp = (v: unknown): v is string =>
  typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

/**
 * Turns untrusted data (localStorage, imported files) into a well-formed Application,
 * or null when the record is missing its required fields.
 */
export function sanitizeApplication(raw: unknown): Application | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const company = str(r.company);
  const role = str(r.role);
  if (!company || !role) return null;

  const now = new Date().toISOString();
  const status: Status = isStatus(r.status) ? r.status : 'applied';
  const createdAt = isTimestamp(r.createdAt) ? r.createdAt : now;
  const updatedAt = isTimestamp(r.updatedAt) ? r.updatedAt : createdAt;

  const interviewNotes: InterviewNote[] = Array.isArray(r.interviewNotes)
    ? r.interviewNotes.flatMap((n): InterviewNote[] => {
        if (!n || typeof n !== 'object') return [];
        const note = n as Record<string, unknown>;
        const content = str(note.content);
        if (!content) return [];
        return [
          {
            id: str(note.id) ?? uid(),
            date: isDate(note.date) ? note.date : createdAt.slice(0, 10),
            stage: isStatus(note.stage) ? note.stage : '',
            content,
          },
        ];
      })
    : [];

  let statusHistory: StatusChange[] = Array.isArray(r.statusHistory)
    ? r.statusHistory.flatMap((h): StatusChange[] => {
        if (!h || typeof h !== 'object') return [];
        const entry = h as Record<string, unknown>;
        return isStatus(entry.status) && isTimestamp(entry.date)
          ? [{ status: entry.status, date: entry.date }]
          : [];
      })
    : [];
  if (statusHistory.length === 0) statusHistory = [{ status, date: createdAt }];

  const currency = str(r.currency)?.toUpperCase();

  return {
    id: str(r.id) ?? uid(),
    company: company.slice(0, 100),
    role: role.slice(0, 120),
    status,
    workMode: isWorkMode(r.workMode) ? r.workMode : 'remote',
    dateApplied: isDate(r.dateApplied) ? r.dateApplied : createdAt.slice(0, 10) || todayISO(),
    location: str(r.location),
    salaryMin: num(r.salaryMin),
    salaryMax: num(r.salaryMax),
    currency: currency && (CURRENCIES.includes(currency) || /^[A-Z]{3}$/.test(currency)) ? currency : 'USD',
    url: str(r.url),
    notes: str(r.notes),
    followUpDate: isDate(r.followUpDate) ? r.followUpDate : undefined,
    interviewNotes,
    statusHistory,
    createdAt,
    updatedAt,
  };
}
