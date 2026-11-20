'use client';

import { CalendarClock, CloudUpload, Info, Mail, Play, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useCloudHub } from '@/context/CloudHubProvider';
import {
  PROVIDERS,
  STORAGE_PROVIDERS,
  TEMPLATE_ORDER,
  TEMPLATES,
  WEEKDAYS,
  describeCountdown,
  describeSchedule,
  isValidEmail,
  type Frequency,
  type ProviderId,
  type Schedule,
  type TemplateId,
} from '@/lib/cloud-sync';
import { cn, timeAgo } from '@/lib/utils';
import { Pill, ProviderTile, Segmented, Toggle, useNow } from './shared';

export function SchedulesTab() {
  const { hub } = useCloudHub();
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2.5 text-xs text-sky-900 ring-1 ring-inset ring-sky-200">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Schedules run in this browser while JobTrack is open. If one comes due while it’s closed, it catches up the next time you open the app.
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        {hub.schedules.map((s) => (
          <ScheduleCard key={s.id} schedule={s} />
        ))}
      </div>
    </div>
  );
}

function ScheduleCard({ schedule: s }: { schedule: Schedule }) {
  const { hub, updateSchedule, runScheduleNow, openHub } = useCloudHub();
  const now = useNow();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isDigest = s.kind === 'digest';
  const set = (patch: Partial<Schedule>) => updateSchedule(s.id, patch);

  const destinationOptions: ProviderId[] = isDigest ? ['notion'] : STORAGE_PROVIDERS;
  const addRecipient = () => {
    const email = draft.trim();
    if (!email) return;
    if (!isValidEmail(email)) return setError('Enter a valid email');
    if (!s.recipients.includes(email)) set({ recipients: [...s.recipients, email] });
    setDraft('');
    setError(null);
  };
  const missing = s.enabled && (isDigest ? s.recipients.length === 0 && s.destinations.length === 0 : s.destinations.length === 0);

  return (
    <article className={cn('flex flex-col rounded-xl bg-white ring-1 transition', s.enabled ? 'ring-indigo-200 shadow-sm' : 'ring-slate-200')}>
      <header className="flex items-start gap-3 border-b border-slate-100 p-4">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}>
          {isDigest ? <Mail className="h-5 w-5" /> : <CloudUpload className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{isDigest ? 'Pipeline digest' : 'Automatic cloud backup'}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {s.enabled ? <Pill tone="violet">Scheduled: {describeSchedule(s)}</Pill> : <Pill tone="slate">Paused</Pill>}
            {s.enabled && s.nextRunAt && <span className="text-[11px] text-slate-500">Next run {describeCountdown(s.nextRunAt, now)}</span>}
          </div>
        </div>
        <Toggle checked={s.enabled} onChange={(enabled) => set({ enabled })} label={`Enable ${isDigest ? 'digest' : 'backup'} schedule`} />
      </header>

      <div className="space-y-4 p-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Frequency</span>
          <Segmented<Frequency>
            label="Frequency"
            value={s.frequency}
            onChange={(frequency) => set({ frequency })}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {s.frequency === 'weekly' && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Day</span>
              <div className="flex gap-1" role="radiogroup" aria-label="Day of week">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={s.dayOfWeek === i}
                    aria-label={d}
                    onClick={() => set({ dayOfWeek: i })}
                    className={cn('h-8 w-8 rounded-full text-xs font-semibold transition', s.dayOfWeek === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {s.frequency === 'monthly' && (
            <label>
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Day of month</span>
              <select className="input w-24 py-1.5" value={s.dayOfMonth} onChange={(e) => set({ dayOfMonth: Number(e.target.value) })}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Time</span>
            <input type="time" className="input w-32 py-1.5" value={s.time} onChange={(e) => e.target.value && set({ time: e.target.value })} />
          </label>
        </div>

        {isDigest && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Template</span>
              <select className="input py-1.5" value={s.template} onChange={(e) => set({ template: e.target.value as TemplateId })}>
                {TEMPLATE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {TEMPLATES[t].name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Email to</span>
              <div className="flex flex-wrap gap-1.5">
                {s.recipients.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-indigo-700">
                    {r}
                    <button type="button" onClick={() => set({ recipients: s.recipients.filter((x) => x !== r) })} className="rounded-full p-0.5 hover:bg-indigo-100" aria-label={`Remove ${r}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  className={cn('input py-1.5', error && 'input-error')}
                  placeholder="mentor@example.com"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                />
                <button type="button" className="btn btn-secondary px-3" onClick={addRecipient} aria-label="Add recipient">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
              {hub.contacts.filter((c) => !s.recipients.includes(c.email)).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {hub.contacts
                    .filter((c) => !s.recipients.includes(c.email))
                    .slice(0, 4)
                    .map((c) => (
                      <button key={c.email} type="button" onClick={() => set({ recipients: [...s.recipients, c.email] })} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200">
                        + {c.email} · {c.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-600">{isDigest ? 'Also post to' : 'Upload to'}</span>
          <div className="space-y-1.5">
            {destinationOptions.map((p) => {
              const connected = !!hub.connections[p];
              const on = s.destinations.includes(p);
              return (
                <div key={p} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <ProviderTile provider={p} size="sm" />
                  <span className="flex-1 text-sm text-slate-800">
                    {PROVIDERS[p].name}
                    {isDigest && <span className="text-xs text-slate-500"> — as a digest page</span>}
                  </span>
                  {connected ? (
                    <Toggle checked={on} onChange={(v) => set({ destinations: v ? [...s.destinations, p] : s.destinations.filter((d) => d !== p) })} label={`Use ${PROVIDERS[p].name}`} />
                  ) : (
                    <button type="button" onClick={() => openHub('integrations')} className="text-xs font-medium text-indigo-600 hover:underline">
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {missing && <p className="text-xs font-medium text-amber-700">{isDigest ? 'Add a recipient or destination so the digest has somewhere to go.' : 'Pick at least one connected destination.'}</p>}
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarClock className="h-3.5 w-3.5" />
          {s.lastRunAt ? `Last ran ${timeAgo(s.lastRunAt)}` : 'Hasn’t run yet'}
        </span>
        <button type="button" className="btn btn-secondary" onClick={() => runScheduleNow(s.id)}>
          <Play className="h-4 w-4" />
          Run now
        </button>
      </footer>
    </article>
  );
}
