import type { Schedule } from './types';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** "Sundays at 6:00 PM", "Daily at 9:00 AM", "Monthly on the 1st at 8:00 AM" */
export function describeSchedule(s: Pick<Schedule, 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'time'>): string {
  const at = formatTime(s.time);
  if (s.frequency === 'daily') return `Daily at ${at}`;
  if (s.frequency === 'weekly') return `${WEEKDAYS[s.dayOfWeek]}s at ${at}`;
  return `Monthly on the ${ordinal(s.dayOfMonth)} at ${at}`;
}

/** Next occurrence strictly after `from`, in local time. */
export function computeNextRun(s: Pick<Schedule, 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'time'>, from = new Date()): Date {
  const [hh, mm] = s.time.split(':').map(Number);
  const c = new Date(from);
  c.setHours(hh || 0, mm || 0, 0, 0);

  if (s.frequency === 'daily') {
    if (c <= from) c.setDate(c.getDate() + 1);
    return c;
  }
  if (s.frequency === 'weekly') {
    c.setDate(c.getDate() + ((s.dayOfWeek - c.getDay() + 7) % 7));
    if (c <= from) c.setDate(c.getDate() + 7);
    return c;
  }
  c.setDate(s.dayOfMonth);
  if (c <= from) c.setMonth(c.getMonth() + 1, s.dayOfMonth);
  return c;
}

export function describeCountdown(iso: string | undefined, now = new Date()): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return 'due now';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `in ${Math.round(hours / 24)} days`;
}
