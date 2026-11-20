'use client';

import { Check, CircleCheck, Clock, Copy, LoaderCircle, Mail, Monitor, Send, Smartphone, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useCloudHub } from '@/context/CloudHubProvider';
import { useToast } from '@/context/ToastProvider';
import {
  TEMPLATES,
  digestToPlainText,
  isValidEmail,
  mailtoUrl,
  type ContactLabel,
  type DigestContent,
  type TemplateId,
} from '@/lib/cloud-sync';
import { cn } from '@/lib/utils';
import { copyText } from './clipboard';
import { DigestView } from './DigestView';
import { Panel } from './shared';

const LABELS: ContactLabel[] = ['Coach', 'Mentor', 'Partner', 'Recruiter', 'Friend'];
const DEFAULT_LABEL: Record<TemplateId, ContactLabel> = { 'coach-digest': 'Coach', 'mentor-share': 'Mentor', 'full-archive': 'Partner' };

type Delivery = 'queued' | 'sending' | 'delivered';

export function EmailComposer({
  digest,
  template,
  note,
  onNoteChange,
}: {
  digest: DigestContent;
  template: TemplateId;
  note: string;
  onNoteChange: (v: string) => void;
}) {
  const { hub, log, rememberContacts } = useCloudHub();
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<ContactLabel>(DEFAULT_LABEL[template]);
  const [subject, setSubject] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Record<string, Delivery> | null>(null);

  const effectiveSubject = subject ?? digest.subject;
  const sending = !!delivery && Object.values(delivery).some((d) => d !== 'delivered');

  const add = (raw: string) => {
    const parts = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const bad = parts.filter((p) => !isValidEmail(p));
    const good = parts.filter((p) => isValidEmail(p) && !recipients.some((r) => r.toLowerCase() === p.toLowerCase()));
    if (good.length) setRecipients((r) => [...r, ...good].slice(0, 10));
    setError(bad.length ? `“${bad[0]}” isn’t a valid email address` : null);
    setDraft(bad.join(' '));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key) && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && recipients.length) {
      setRecipients((r) => r.slice(0, -1));
    }
  };

  const send = async () => {
    const pending = draft.trim() ? draft : '';
    if (pending) add(pending);
    const list = [...recipients, ...pending.split(/[,;\s]+/).filter(isValidEmail)].filter((v, i, a) => a.indexOf(v) === i);
    if (!list.length) {
      setError('Add at least one recipient');
      return;
    }
    const state: Record<string, Delivery> = Object.fromEntries(list.map((r) => [r, 'queued']));
    setDelivery({ ...state });
    await new Promise((r) => setTimeout(r, 500));
    setDelivery(Object.fromEntries(list.map((r) => [r, 'sending'])));
    for (const [i, r] of list.entries()) {
      await new Promise((res) => setTimeout(res, 650 + i * 250));
      setDelivery((d) => ({ ...(d ?? {}), [r]: 'delivered' }));
    }
    rememberContacts(list, label);
    log({
      type: 'email',
      status: 'success',
      title: `${TEMPLATES[template].name} sent`,
      detail: `To ${list.join(', ')} · “${effectiveSubject}” · simulated delivery`,
      destination: 'email',
      recordCount: digest.recordCount,
      template,
    });
    toast({ title: `Digest delivered to ${list.length} recipient${list.length === 1 ? '' : 's'}`, description: 'Simulated delivery — use “Open in mail app” to send for real.' });
  };

  const plain = () => digestToPlainText({ ...digest, subject: effectiveSubject });
  const suggestions = hub.contacts.filter((c) => !recipients.includes(c.email)).slice(0, 6);

  return (
    <Panel>
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="digest-to" className="text-xs font-medium text-slate-600">
              To
            </label>
            <select value={label} onChange={(e) => setLabel(e.target.value as ContactLabel)} className="rounded-md border-0 bg-transparent py-0 pr-6 text-xs text-slate-500 focus:ring-0" aria-label="Relationship">
              {LABELS.map((l) => (
                <option key={l} value={l}>
                  Save as {l.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className={cn('flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-inset focus-within:ring-2', error ? 'ring-rose-400 focus-within:ring-rose-500' : 'ring-slate-300 focus-within:ring-indigo-600')}>
            {recipients.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-indigo-700">
                {r}
                <button type="button" onClick={() => setRecipients((x) => x.filter((y) => y !== r))} className="rounded-full p-0.5 hover:bg-indigo-100" aria-label={`Remove ${r}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="digest-to"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={onKey}
              onBlur={() => draft.trim() && add(draft)}
              placeholder={recipients.length ? '' : 'coach@example.com'}
              className="min-w-[10rem] flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
            />
          </div>
          {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Recent:</span>
              {suggestions.map((c) => (
                <button key={c.email} type="button" onClick={() => setRecipients((r) => [...r, c.email])} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200">
                  {c.email} <span className="text-slate-400">· {c.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Subject</span>
          <input className="input" value={effectiveSubject} onChange={(e) => setSubject(e.target.value)} maxLength={140} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Personal note (optional)</span>
          <textarea className="input resize-y" rows={2} maxLength={600} value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Hi! Here's this week's update — would love your take on the Northwind offer timing." />
        </label>

        {delivery && (
          <ul className="space-y-1.5 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200" aria-live="polite">
            {Object.entries(delivery).map(([r, s]) => (
              <li key={r} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-700">{r}</span>
                <span className={cn('inline-flex items-center gap-1 font-medium', s === 'delivered' ? 'text-emerald-700' : s === 'sending' ? 'text-sky-700' : 'text-slate-500')}>
                  {s === 'queued' && <Clock className="h-3.5 w-3.5" />}
                  {s === 'sending' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {s === 'delivered' && <CircleCheck className="h-3.5 w-3.5" />}
                  {s === 'queued' ? 'Queued' : s === 'sending' ? 'Sending…' : 'Delivered (simulated)'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send digest'}
          </button>
          <a
            href={recipients.length ? mailtoUrl(recipients, effectiveSubject, plain()) : undefined}
            onClick={(e) => {
              if (!recipients.length) {
                e.preventDefault();
                setError('Add a recipient first');
              }
            }}
            className="btn btn-secondary"
          >
            <Mail className="h-4 w-4" />
            Open in mail app
          </a>
          <CopyTextButton getText={plain} />
        </div>
        <p className="text-[11px] text-slate-400">“Send digest” simulates delivery in demo mode. “Open in mail app” drafts a real email in your default client.</p>
      </div>
    </Panel>
  );
}

function CopyTextButton({ getText }: { getText: () => string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        if (await copyText(getText())) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {done ? 'Copied' : 'Copy as text'}
    </button>
  );
}

export function EmailPreview({ digest }: { digest: DigestContent }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1">
        {(
          [
            ['desktop', Monitor],
            ['mobile', Smartphone],
          ] as const
        ).map(([d, Icon]) => (
          <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={`${d} preview`} className={cn('rounded-md p-1.5', device === d ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className={cn('mx-auto overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300', device === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
        <div className="space-y-1 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs">
          <p className="text-slate-500">
            <span className="inline-block w-14 text-slate-400">From</span>
            {digest.owner} via JobTrack
          </p>
          <p className="truncate font-semibold text-slate-900">
            <span className="inline-block w-14 font-normal text-slate-400">Subject</span>
            {digest.subject}
          </p>
          <p className="truncate text-slate-400">
            <span className="inline-block w-14">Preview</span>
            {digest.preheader}
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">JobTrack</p>
            <p className="mt-0.5 text-lg font-bold">{digest.title}</p>
          </div>
          <div className="p-5">
            <DigestView digest={digest} compact />
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-center text-[11px] text-slate-400">Sent by {digest.owner} using JobTrack · Reply directly to respond</p>
        </div>
      </div>
    </div>
  );
}
