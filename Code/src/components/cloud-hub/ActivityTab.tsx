'use client';

import { CalendarClock, Check, CircleAlert, CircleCheck, CloudUpload, Copy, Download, History, Info, Link2, Mail, Plug, RefreshCw, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCloudHub } from '@/context/CloudHubProvider';
import { PROVIDERS, TEMPLATES, describeExpiry, type ActivityEntry, type ActivityType, type Destination } from '@/lib/cloud-sync';
import { cn, timeAgo } from '@/lib/utils';
import { copyText } from './clipboard';
import { ProviderTile, useNow } from './shared';

const TYPE_META: Record<ActivityType, { icon: LucideIcon; tint: string; label: string }> = {
  share: { icon: Link2, tint: 'bg-indigo-100 text-indigo-700', label: 'Share' },
  email: { icon: Mail, tint: 'bg-violet-100 text-violet-700', label: 'Email' },
  sync: { icon: RefreshCw, tint: 'bg-sky-100 text-sky-700', label: 'Sync' },
  backup: { icon: CloudUpload, tint: 'bg-emerald-100 text-emerald-700', label: 'Backup' },
  schedule: { icon: CalendarClock, tint: 'bg-amber-100 text-amber-800', label: 'Schedule' },
  connect: { icon: Plug, tint: 'bg-slate-100 text-slate-700', label: 'Connection' },
  download: { icon: Download, tint: 'bg-teal-100 text-teal-700', label: 'Download' },
};

const FILTERS: Array<{ id: 'all' | ActivityType[]; label: string }> = [
  { id: 'all', label: 'All' },
  { id: ['share'], label: 'Shares' },
  { id: ['email'], label: 'Emails' },
  { id: ['sync'], label: 'Syncs' },
  { id: ['backup', 'download'], label: 'Backups' },
  { id: ['schedule', 'connect'], label: 'System' },
];

function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function DestinationBadge({ destination }: { destination: Destination }) {
  if (destination === 'email' || destination === 'link' || destination === 'device') {
    const label = { email: 'Email', link: 'Share link', device: 'This device' }[destination];
    return <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-0.5 pr-1.5 text-[11px] font-medium text-slate-600">
      <ProviderTile provider={destination} size="sm" />
      {PROVIDERS[destination].name}
    </span>
  );
}

export function ActivityTab() {
  const { hub, clearActivity } = useCloudHub();
  const [filter, setFilter] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const now = useNow();

  const entries = useMemo(() => {
    const f = FILTERS[filter].id;
    return f === 'all' ? hub.activity : hub.activity.filter((e) => f.includes(e.type));
  }, [hub.activity, filter]);

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: ActivityEntry[] }> = [];
    for (const e of entries) {
      const label = dayLabel(e.at, now);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [entries, now]);

  const counts = useMemo(() => {
    const week = Date.now() - 7 * 86_400_000;
    const recent = hub.activity.filter((e) => new Date(e.at).getTime() > week);
    return {
      shares: recent.filter((e) => e.type === 'share' || e.type === 'email').length,
      syncs: recent.filter((e) => e.type === 'sync' || e.type === 'backup').reduce((n, e) => n + (e.repeat ?? 1), 0),
      failed: recent.filter((e) => e.status === 'failed').length,
    };
  }, [hub.activity]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Shared this week', counts.shares],
          ['Syncs & backups', counts.syncs],
          ['Need attention', counts.failed],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p className={cn('text-2xl font-bold tabular-nums', label === 'Need attention' && (value as number) > 0 ? 'text-rose-600' : 'text-slate-900')}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={filter === i}
              onClick={() => setFilter(i)}
              className={cn('rounded-full px-3 py-1 text-xs font-medium transition', filter === i ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >
              {f.label}
            </button>
          ))}
        </div>
        {hub.activity.length > 0 &&
          (confirm ? (
            <span className="flex items-center gap-2 text-xs">
              Clear all history?
              <button type="button" className="font-semibold text-rose-600 hover:underline" onClick={() => (clearActivity(), setConfirm(false))}>
                Clear
              </button>
              <button type="button" className="text-slate-500 hover:underline" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="text-xs font-medium text-slate-500 hover:text-slate-800" onClick={() => setConfirm(true)}>
              Clear history
            </button>
          ))}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-14 text-center ring-1 ring-slate-200">
          <History className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-800">No activity yet</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">Shares, emails, syncs and backups will appear here as a timeline.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</h4>
              <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-slate-200">
                {g.items.map((e) => (
                  <ActivityRow key={e.id} entry={e} now={now} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry: e, now }: { entry: ActivityEntry; now: Date }) {
  const meta = TYPE_META[e.type];
  const Icon = meta.icon;
  const [copied, setCopied] = useState(false);
  const expiry = e.type === 'share' && e.link ? describeExpiry(e.expiresAt ?? null, now) : null;
  const StatusIcon = e.status === 'failed' ? CircleAlert : e.status === 'success' ? CircleCheck : Info;

  return (
    <li className="relative flex gap-3">
      <span className={cn('relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-slate-50', meta.tint)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className={cn('min-w-0 flex-1 rounded-xl bg-white p-3 ring-1', e.status === 'failed' ? 'ring-rose-200' : 'ring-slate-200')}>
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
            <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', e.status === 'failed' ? 'text-rose-500' : e.status === 'success' ? 'text-emerald-500' : 'text-slate-400')} aria-label={e.status} />
            {e.title}
            {e.repeat && e.repeat > 1 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">×{e.repeat}</span>}
          </p>
          <time className="shrink-0 text-[11px] text-slate-400" dateTime={e.at} title={new Date(e.at).toLocaleString()}>
            {timeAgo(e.at)}
          </time>
        </div>
        {e.detail && <p className="mt-0.5 text-xs text-slate-500">{e.detail}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {e.destination && <DestinationBadge destination={e.destination} />}
          {e.template && <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">{TEMPLATES[e.template].name}</span>}
          {e.recordCount != null && <span className="text-[11px] text-slate-500">{e.recordCount} records</span>}
          {expiry && <span className={cn('text-[11px]', expiry.expired ? 'text-rose-600' : 'text-slate-500')}>· {expiry.label}</span>}
          {e.link && expiry && !expiry.expired && (
            <button
              type="button"
              onClick={async () => {
                if (await copyText(e.link!)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
