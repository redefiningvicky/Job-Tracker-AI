'use client';

import { ArrowRight, Bell, Clock, Send, TrendingUp, Trophy, Users, Reply } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { CompanyAvatar, FollowUpTag, StatusBadge } from '@/components/ui/Badges';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { STATUS_META } from '@/lib/constants';
import type { FunnelStage, Stats, WeekBucket } from '@/lib/stats';
import { STATUSES, type Application } from '@/lib/types';
import { cn, formatShortDate, pct, timeAgo } from '@/lib/utils';

type Tone = 'indigo' | 'sky' | 'violet' | 'amber' | 'emerald';
const TONES: Record<Tone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export function SummaryCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      <StatCard label="Total applied" value={stats.applied} sub={`${stats.wishlist} more on wishlist`} icon={Send} tone="indigo" />
      <StatCard
        label="Response rate"
        value={pct(stats.responseRate)}
        sub={`${stats.responded} of ${stats.applied} heard back`}
        icon={Reply}
        tone="sky"
      />
      <StatCard
        label="Interview rate"
        value={pct(stats.interviewRate)}
        sub={`${stats.interviewed} reached screens or interviews`}
        icon={Users}
        tone="violet"
      />
      <StatCard
        label="Active processes"
        value={stats.active}
        sub={`${stats.byStatus.phone_screen} screens · ${stats.byStatus.interview} interviews`}
        icon={TrendingUp}
        tone="amber"
      />
      <StatCard
        label="Offers"
        value={stats.offers}
        sub={stats.applied ? `${pct(stats.offers / stats.applied)} of applications` : 'None yet'}
        icon={Trophy}
        tone="emerald"
      />
    </div>
  );
}

export function PipelineFunnel({ funnel, className }: { funnel: FunnelStage[]; className?: string }) {
  const max = Math.max(funnel[0]?.count ?? 0, 1);
  return (
    <section className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pipeline funnel</h2>
          <p className="mt-0.5 text-sm text-slate-500">How far your applications progress, including ones that later closed.</p>
        </div>
      </div>
      <ol className="mt-5 space-y-4">
        {funnel.map((stage, i) => (
          <li key={stage.status}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{stage.label}</span>
              <span className="tabular-nums text-slate-500">
                <span className="font-semibold text-slate-900">{stage.count}</span>
                {i > 0 && stage.conversion !== null && (
                  <span className="ml-2 text-xs">
                    {pct(stage.conversion)} from {funnel[i - 1].label.toLowerCase()}
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', STATUS_META[stage.status].bar)}
                style={{ width: `${stage.count ? Math.max((stage.count / max) * 100, 2) : 0}%` }}
                role="presentation"
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StatusBreakdown({ stats, className }: { stats: Stats; className?: string }) {
  const total = Math.max(stats.total, 1);
  return (
    <section className={cn('card p-5', className)}>
      <h2 className="text-base font-semibold text-slate-900">By status</h2>
      <p className="mt-0.5 text-sm text-slate-500">Where every application stands today.</p>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Status distribution">
        {STATUSES.map((s) =>
          stats.byStatus[s] ? (
            <div
              key={s}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', STATUS_META[s].bar)}
              style={{ width: `${(stats.byStatus[s] / total) * 100}%` }}
              title={`${STATUS_META[s].label}: ${stats.byStatus[s]}`}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-5 space-y-2.5">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className={cn('h-2.5 w-2.5 rounded-sm', STATUS_META[s].bar)} aria-hidden />
              {STATUS_META[s].label}
            </span>
            <span className="tabular-nums text-slate-500">
              <span className="font-semibold text-slate-900">{stats.byStatus[s]}</span>
              <span className="ml-2 inline-block w-9 text-right text-xs">{pct(stats.byStatus[s] / total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WeeklyActivity({ weeks, className }: { weeks: WeekBucket[]; className?: string }) {
  const max = Math.max(...weeks.map((w) => w.count), 1);
  const total = weeks.reduce((n, w) => n + w.count, 0);
  return (
    <section className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Weekly activity</h2>
          <p className="mt-0.5 text-sm text-slate-500">Applications sent, last {weeks.length} weeks</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{total} sent</span>
      </div>
      <div className="mt-6 flex h-40 items-end gap-2" role="img" aria-label={`Applications per week: ${weeks.map((w) => w.count).join(', ')}`}>
        {weeks.map((w, i) => (
          <div key={w.start} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-medium tabular-nums text-slate-500 opacity-0 transition group-hover:opacity-100">
              {w.count}
            </span>
            <div
              className={cn(
                'w-full max-w-[2.5rem] rounded-t-md transition-all',
                i === weeks.length - 1 ? 'bg-indigo-600' : 'bg-indigo-300 group-hover:bg-indigo-400',
              )}
              style={{ height: `${w.count ? Math.max((w.count / max) * 100, 4) : 2}%` }}
              title={`Week of ${formatShortDate(w.start)}: ${w.count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 truncate text-center text-[10px] text-slate-400">
            {i === weeks.length - 1 ? 'This wk' : formatShortDate(w.start)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function FollowUps({ items, className }: { items: Application[]; className?: string }) {
  const { openEdit } = useApplicationModal();
  return (
    <section className={cn('card flex flex-col p-5', className)}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Bell className="h-4 w-4 text-slate-400" />
        Follow-ups
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">Reminders you’ve scheduled</p>
      {items.length === 0 ? (
        <p className="mt-6 flex-1 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
          No reminders. Set a follow-up date when editing an application.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => openEdit(a.id)}
                className="flex w-full items-center gap-3 rounded-md py-2.5 text-left hover:bg-slate-50"
              >
                <CompanyAvatar name={a.company} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{a.company}</p>
                  <p className="truncate text-xs text-slate-500">{a.role}</p>
                </div>
                <FollowUpTag date={a.followUpDate} compact />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentActivity({ items, className }: { items: Application[]; className?: string }) {
  const { openEdit } = useApplicationModal();
  return (
    <section className={cn('card flex flex-col p-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-slate-400" />
          Recently updated
        </h2>
        <Link href="/list" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => openEdit(a.id)}
              className="flex w-full items-center gap-3 rounded-md py-2.5 text-left hover:bg-slate-50"
            >
              <CompanyAvatar name={a.company} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{a.company}</p>
                <p className="truncate text-xs text-slate-500">
                  {a.role} · {timeAgo(a.updatedAt)}
                </p>
              </div>
              <StatusBadge status={a.status} className="hidden sm:inline-flex" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
