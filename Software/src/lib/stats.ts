import { PIPELINE, STATUS_META } from './constants';
import { STATUSES, type Application, type Filters, type Status } from './types';
import { parseISODate, toISODate, todayISO } from './utils';

/** Furthest pipeline stage an application has ever reached (0 = applied … 3 = offer). */
export function highestStage(a: Application): number {
  let best = 0;
  for (const s of [...a.statusHistory.map((h) => h.status), a.status]) {
    const rank = PIPELINE.indexOf(s);
    if (rank > best) best = rank;
  }
  return best;
}

export interface FunnelStage {
  status: Status;
  label: string;
  count: number;
  /** share of all submitted applications */
  ofTotal: number;
  /** conversion from the previous stage, null for the first */
  conversion: number | null;
}

export interface Stats {
  total: number;
  applied: number;
  wishlist: number;
  responded: number;
  responseRate: number;
  interviewed: number;
  interviewRate: number;
  active: number;
  offers: number;
  rejected: number;
  byStatus: Record<Status, number>;
  funnel: FunnelStage[];
}

export function computeStats(apps: Application[]): Stats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const a of apps) byStatus[a.status]++;

  const submitted = apps.filter((a) => a.status !== 'wishlist');
  const ranks = submitted.map((a) => ({ a, rank: highestStage(a) }));
  // Any movement past "Applied" — including a rejection — counts as hearing back.
  const responded = ranks.filter(({ a, rank }) => rank >= 1 || a.status === 'rejected').length;
  const reached = PIPELINE.map((_, i) => ranks.filter((r) => r.rank >= i).length);
  const n = submitted.length;

  return {
    total: apps.length,
    applied: n,
    wishlist: byStatus.wishlist,
    responded,
    responseRate: n ? responded / n : 0,
    interviewed: reached[1],
    interviewRate: n ? reached[1] / n : 0,
    active: byStatus.phone_screen + byStatus.interview,
    offers: byStatus.offer,
    rejected: byStatus.rejected,
    byStatus,
    funnel: PIPELINE.map((status, i) => ({
      status,
      label: STATUS_META[status].label,
      count: reached[i],
      ofTotal: n ? reached[i] / n : 0,
      conversion: i === 0 ? null : reached[i - 1] ? reached[i] / reached[i - 1] : 0,
    })),
  };
}

export interface WeekBucket {
  start: string;
  end: string;
  count: number;
}

/** Applications submitted per week (Monday start) for the last `weeks` weeks. */
export function weeklyActivity(apps: Application[], weeks = 8): WeekBucket[] {
  const today = parseISODate(todayISO())!;
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (weeks - 1 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toISODate(start), end: toISODate(end), count: 0 };
  });

  for (const a of apps) {
    if (a.status === 'wishlist') continue;
    const b = buckets.find((w) => a.dateApplied >= w.start && a.dateApplied <= w.end);
    if (b) b.count++;
  }
  return buckets;
}

export function upcomingFollowUps(apps: Application[], limit = 5): Application[] {
  return apps
    .filter((a) => a.followUpDate && a.status !== 'rejected')
    .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!))
    .slice(0, limit);
}

export function filterApplications(apps: Application[], f: Filters): Application[] {
  const q = f.search.trim().toLowerCase();
  return apps.filter((a) => {
    if (q && ![a.company, a.role, a.location ?? '', a.notes ?? ''].some((s) => s.toLowerCase().includes(q)))
      return false;
    if (f.statuses.length && !f.statuses.includes(a.status)) return false;
    if (f.workModes.length && !f.workModes.includes(a.workMode)) return false;
    if (f.dateFrom && a.dateApplied < f.dateFrom) return false;
    if (f.dateTo && a.dateApplied > f.dateTo) return false;
    return true;
  });
}

export function countActiveFilters(f: Filters): number {
  return (
    (f.search.trim() ? 1 : 0) +
    f.statuses.length +
    f.workModes.length +
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0)
  );
}
