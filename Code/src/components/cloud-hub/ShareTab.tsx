'use client';

import { Archive, Check, Download, Eye, EyeOff, GraduationCap, Link2, Mail, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useApplications } from '@/context/ApplicationsProvider';
import { useCloudHub } from '@/context/CloudHubProvider';
import { useToast } from '@/context/ToastProvider';
import { createBackup, downloadFile } from '@/lib/backup';
import { REDACTED_FIELDS, TEMPLATE_ORDER, TEMPLATES, buildDigest, type TemplateId } from '@/lib/cloud-sync';
import { cn, todayISO } from '@/lib/utils';
import { EmailComposer, EmailPreview } from './EmailComposer';
import { LinkComposer } from './LinkComposer';
import { DigestView } from './DigestView';
import { Panel, Segmented, Toggle } from './shared';

const TEMPLATE_ICONS: Record<TemplateId, ComponentType<{ className?: string }>> = {
  'coach-digest': GraduationCap,
  'mentor-share': Users,
  'full-archive': Archive,
};

export function ShareTab() {
  const { applications, markBackedUp } = useApplications();
  const { hub, setProfileName, initialTemplate, log } = useCloudHub();
  const { toast } = useToast();
  const [mode, setMode] = useState<'link' | 'email'>('link');
  const [template, setTemplate] = useState<TemplateId>(initialTemplate ?? 'coach-digest');
  const [redact, setRedact] = useState(TEMPLATES[initialTemplate ?? 'coach-digest'].defaultRedact);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
      setRedact(TEMPLATES[initialTemplate].defaultRedact);
    }
  }, [initialTemplate]);

  const digest = useMemo(
    () => buildDigest(applications, template, { owner: hub.profile.name, redact, note: mode === 'email' ? note : undefined }),
    [applications, template, hub.profile.name, redact, note, mode],
  );

  const chooseTemplate = (t: TemplateId) => {
    setTemplate(t);
    setRedact(TEMPLATES[t].defaultRedact);
  };

  const downloadArchive = () => {
    try {
      downloadFile(`jobtrack-archive-${todayISO()}.json`, createBackup(applications), 'application/json');
      markBackedUp();
      log({ type: 'download', status: 'success', title: 'Archive downloaded to this device', detail: `jobtrack-archive-${todayISO()}.json · restorable from Backup → Restore`, destination: 'device', recordCount: applications.length, template: 'full-archive' });
      toast({ title: 'Archive downloaded', description: 'Restore it any time from Backup → Restore.' });
    } catch {
      toast({ type: 'error', title: 'Download failed', description: 'Your browser blocked the download.' });
    }
  };

  return (
    <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="space-y-5">
        <Panel
          title="1 · Pick a template"
          aside={
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Sharing as
              <input
                className="input w-36 py-1 text-xs"
                placeholder="Your name"
                value={hub.profile.name}
                maxLength={60}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </label>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {TEMPLATE_ORDER.map((t) => {
              const meta = TEMPLATES[t];
              const Icon = TEMPLATE_ICONS[t];
              const active = template === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => chooseTemplate(t)}
                  aria-pressed={active}
                  className={cn(
                    'relative flex gap-3 rounded-xl p-3 text-left ring-1 transition sm:flex-col xl:flex-row 2xl:flex-col',
                    active ? 'bg-indigo-50/60 ring-2 ring-indigo-500' : 'ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
                  )}
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight text-slate-900">{meta.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{meta.description}</span>
                    <span className="mt-1.5 block text-[11px] font-medium text-indigo-600">For: {meta.audience}</span>
                  </span>
                  {active && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="2 · Privacy"
          aside={<Toggle checked={redact} onChange={setRedact} label="Redact private details" />}
        >
          <p className="text-sm text-slate-700">{redact ? 'Private details are redacted' : 'Private details will be included'}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REDACTED_FIELDS.map((f) => (
              <span
                key={f}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                  redact ? 'bg-slate-100 text-slate-400 line-through decoration-slate-300' : 'bg-amber-50 text-amber-800',
                )}
              >
                {redact ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {f}
              </span>
            ))}
          </div>
          {!redact && template !== 'full-archive' && (
            <p className="mt-2 text-xs text-amber-700">Anyone who receives this will see salary targets and notes.</p>
          )}
          {template === 'full-archive' && (
            <button type="button" onClick={downloadArchive} className="btn btn-secondary mt-4 w-full">
              <Download className="h-4 w-4" />
              Download restorable archive (.json)
            </button>
          )}
        </Panel>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">3 · Deliver</h3>
            <div className="w-64">
              <Segmented
                label="Delivery method"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'link', label: 'Link & QR code' },
                  { value: 'email', label: 'Email digest' },
                ]}
              />
            </div>
          </div>
          {mode === 'link' ? (
            <LinkComposer digest={digest} />
          ) : (
            <EmailComposer digest={digest} template={template} note={note} onNoteChange={setNote} />
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-0 xl:self-start">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {mode === 'link' ? <Link2 className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
          {mode === 'link' ? 'What viewers will see' : 'Email preview'}
        </p>
        {mode === 'email' ? (
          <EmailPreview digest={digest} />
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-2 truncate rounded bg-white px-2 py-0.5 font-mono text-[11px] text-slate-400 ring-1 ring-slate-200">…/share#snapshot</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Read-only snapshot</p>
              <h4 className="mt-1 text-lg font-bold text-slate-900">{digest.title}</h4>
              <p className="mb-4 text-xs text-slate-500">Shared by {digest.owner}</p>
              <DigestView digest={digest} compact />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
