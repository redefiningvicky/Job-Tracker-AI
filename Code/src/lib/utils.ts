export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Local-time YYYY-MM-DD (avoids the UTC shift of toISOString). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDate(
  value?: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  const d = parseISODate(value);
  if (!d) return value || '—';
  return d.toLocaleDateString(undefined, opts);
}

export function formatShortDate(value?: string): string {
  return formatDate(value, { month: 'short', day: 'numeric' });
}

export function daysFromToday(value?: string): number | null {
  const d = parseISODate(value);
  if (!d) return null;
  const today = parseISODate(todayISO())!;
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDay(value?: string): string {
  const n = daysFromToday(value);
  if (n === null) return '';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: n >= 10_000 ? 1 : 0,
      notation: n >= 10_000 ? 'compact' : 'standard',
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function formatSalary(min?: number, max?: number, currency = 'USD'): string {
  if (min == null && max == null) return '';
  if (min != null && max != null) {
    return min === max
      ? formatMoney(min, currency)
      : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  if (min != null) return `${formatMoney(min, currency)}+`;
  return `Up to ${formatMoney(max!, currency)}`;
}

export const pct = (n: number): string => `${Math.round(n * 100)}%`;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
