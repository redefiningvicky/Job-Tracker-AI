'use client';

import { BookOpen, Box, Cloud, HardDrive, Sheet, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { PROVIDERS, type ProviderId } from '@/lib/cloud-sync';
import { cn, timeAgo } from '@/lib/utils';

const PROVIDER_ICONS: Record<ProviderId, LucideIcon> = {
  'google-sheets': Sheet,
  notion: BookOpen,
  'google-drive': HardDrive,
  dropbox: Box,
  onedrive: Cloud,
};

export function ProviderTile({ provider, size = 'md' }: { provider: ProviderId; size?: 'sm' | 'md' }) {
  const Icon = PROVIDER_ICONS[provider];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
        PROVIDERS[provider].tile,
        size === 'sm' ? 'h-6 w-6 rounded-md' : 'h-10 w-10',
      )}
      aria-hidden
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
    </span>
  );
}

/** Re-render every `ms` so relative times ("2m ago") stay fresh. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}

type BadgeTone = 'green' | 'blue' | 'amber' | 'slate' | 'rose' | 'violet';
const TONES: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};
const DOTS: Record<BadgeTone, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-sky-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-400',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
};

export function Pill({ tone = 'slate', pulse, children, className }: { tone?: BadgeTone; pulse?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONES[tone], className)}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-70', DOTS[tone])} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOTS[tone])} />
      </span>
      {children}
    </span>
  );
}

export function SyncStatusBadge({ connected, syncing, lastSyncedAt }: { connected: boolean; syncing?: boolean; lastSyncedAt?: string }) {
  useNow();
  if (!connected) return <Pill tone="slate">Not connected</Pill>;
  if (syncing) return <Pill tone="blue" pulse>Syncing…</Pill>;
  if (!lastSyncedAt) return <Pill tone="amber">Connected · never synced</Pill>;
  const mins = (Date.now() - new Date(lastSyncedAt).getTime()) / 60_000;
  return <Pill tone="green">{mins < 1 ? 'Synced just now' : `Synced ${timeAgo(lastSyncedAt)}`}</Pill>;
}

export function ProgressBar({ value, durationMs = 300, className }: { value: number; durationMs?: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-slate-200', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div
        className="relative h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
        style={{ width: `${Math.max(2, value * 100)}%`, transition: `width ${durationMs}ms linear` }}
      >
        <div className="absolute inset-0 animate-pulse bg-white/20" />
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-indigo-600' : 'bg-slate-300',
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function ToggleRow({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-60')}>
      <div>
        <p className="text-sm text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition',
            o.value === value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, description, aside, children, className }: { title?: string; description?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5', className)}>
      {(title || aside) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
