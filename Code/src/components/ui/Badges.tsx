'use client';

import { CalendarClock, ChevronDown } from 'lucide-react';
import { STATUS_META, WORK_MODE_META } from '@/lib/constants';
import { STATUSES, type Status, type WorkMode } from '@/lib/types';
import { avatarColor, cn, daysFromToday, formatShortDate, initials, relativeDay } from '@/lib/utils';

const BADGE_BASE = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn(BADGE_BASE, meta.badge, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function WorkModeBadge({ mode, className }: { mode: WorkMode; className?: string }) {
  const meta = WORK_MODE_META[mode];
  return <span className={cn(BADGE_BASE, meta.badge, className)}>{meta.label}</span>;
}

/** Badge-styled native select for one-click status changes. */
export function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: Status;
  onChange: (status: Status) => void;
  className?: string;
}) {
  const meta = STATUS_META[value];
  return (
    <div className={cn('relative inline-flex', className)} onClick={(e) => e.stopPropagation()}>
      <select
        aria-label="Change status"
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          'cursor-pointer appearance-none rounded-full py-1 pl-6 pr-7 text-xs font-medium ring-1 ring-inset transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-500',
          meta.badge,
        )}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <span
        className={cn('pointer-events-none absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full', meta.dot)}
        aria-hidden
      />
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden />
    </div>
  );
}

export function CompanyAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm',
        avatarColor(name),
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function FollowUpTag({ date, compact = false }: { date?: string; compact?: boolean }) {
  const days = daysFromToday(date);
  if (days === null) return null;
  const tone =
    days < 0 ? 'text-rose-700 bg-rose-50' : days === 0 ? 'text-amber-800 bg-amber-50' : 'text-slate-600 bg-slate-100';
  const label = days < 0 ? `Overdue · ${formatShortDate(date)}` : compact ? relativeDay(date) : `${relativeDay(date)} · ${formatShortDate(date)}`;
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium', tone)}
      title={`Follow up on ${formatShortDate(date)}`}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
