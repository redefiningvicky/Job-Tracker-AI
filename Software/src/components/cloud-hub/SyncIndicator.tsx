'use client';

import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import { useCloudHub } from '@/context/CloudHubProvider';
import { PROVIDERS, describeSchedule, type ProviderId } from '@/lib/cloud-sync';
import { cn, timeAgo } from '@/lib/utils';
import { useNow } from './shared';

/** Compact header status: live sync progress, last sync, or next scheduled run. */
export function SyncIndicator() {
  const { hub, jobs, openHub, ready } = useCloudHub();
  useNow();
  if (!ready) return null;

  const running = Object.values(jobs)[0];
  const connections = Object.values(hub.connections);
  const last = connections.map((c) => c?.lastSyncedAt).filter(Boolean).sort().pop();
  const nextSchedule = hub.schedules.filter((s) => s.enabled && s.nextRunAt).sort((a, b) => a.nextRunAt!.localeCompare(b.nextRunAt!))[0];

  if (!running && connections.length === 0 && !nextSchedule) return null;

  let label: string;
  let tone: string;
  let Icon = Cloud;
  if (running) {
    label = `${PROVIDERS[running.provider as ProviderId].name} · ${Math.round(running.progress * 100)}%`;
    tone = 'text-sky-700 bg-sky-50 ring-sky-200';
    Icon = LoaderCircle;
  } else if (last) {
    const mins = (Date.now() - new Date(last).getTime()) / 60_000;
    label = mins < 1 ? 'Synced just now' : `Synced ${timeAgo(last)}`;
    tone = 'text-emerald-700 bg-emerald-50 ring-emerald-200';
  } else if (nextSchedule) {
    label = `Scheduled: ${describeSchedule(nextSchedule)}`;
    tone = 'text-violet-700 bg-violet-50 ring-violet-200';
  } else {
    label = 'Not synced yet';
    tone = 'text-slate-600 bg-slate-50 ring-slate-200';
    Icon = CloudOff;
  }

  return (
    <button
      type="button"
      onClick={() => openHub(running || last ? 'integrations' : 'schedules')}
      className={cn('hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:brightness-95 lg:inline-flex', tone)}
      title="Open Sync & Share Hub"
      aria-live="polite"
    >
      <Icon className={cn('h-3.5 w-3.5', running && 'animate-spin')} />
      <span className="max-w-[14rem] truncate">{label}</span>
    </button>
  );
}
