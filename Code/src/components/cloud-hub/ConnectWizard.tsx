'use client';

import { Check, Lock, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCloudHub } from '@/context/CloudHubProvider';
import { PROVIDERS, defaultMapping, isValidEmail, type FieldMapping, type ProviderId } from '@/lib/cloud-sync';
import { cn } from '@/lib/utils';
import { MappingTable } from './MappingTable';
import { ProviderTile } from './shared';

type Step = 'authorize' | 'authorizing' | 'target' | 'mapping';

export function ConnectWizard({ provider, onClose }: { provider: ProviderId; onClose: () => void }) {
  const meta = PROVIDERS[provider];
  const { connect, startSync } = useCloudHub();
  const [step, setStep] = useState<Step>('authorize');
  const [account, setAccount] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [target, setTarget] = useState(meta.targets[0].id);
  const [mapping, setMapping] = useState<FieldMapping[]>(() => defaultMapping(provider));
  const [syncNow, setSyncNow] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const steps: Step[] = meta.kind === 'sync' ? ['authorize', 'target', 'mapping'] : ['authorize', 'target'];
  const visibleIndex = steps.indexOf(step === 'authorizing' ? 'authorize' : step);

  const authorize = () => {
    if (!isValidEmail(account)) {
      setAccountError('Enter the email for the account you want to connect');
      return;
    }
    setStep('authorizing');
    setTimeout(() => setStep('target'), 1300);
  };

  const finish = () => {
    const t = meta.targets.find((x) => x.id === target)!;
    connect(provider, {
      account: account.trim(),
      target: t.id === 'new' ? { id: `new-${Date.now()}`, name: t.name.replace(/^Create new(?: database in)?:?\s*/, '').replace(/[“”]/g, '') || 'JobTrack' } : t,
      mapping: meta.kind === 'sync' ? mapping : undefined,
    });
    onClose();
    if (syncNow) setTimeout(() => startSync(provider), 120);
  };

  return (
    <div data-nested-dialog className="absolute inset-0 z-30 flex animate-fade-in items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Connect ${meta.name}`}>
      <div className="flex max-h-full w-full max-w-lg animate-scale-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <ProviderTile provider={provider} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Connect {meta.name}</p>
            <div className="mt-1 flex gap-1">
              {steps.map((s, i) => (
                <span key={s} className={cn('h-1 w-8 rounded-full transition', i <= visibleIndex ? 'bg-indigo-600' : 'bg-slate-200')} />
              ))}
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cancel">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {(step === 'authorize' || step === 'authorizing') && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <p className="text-sm font-semibold text-slate-900">JobTrack wants to access your {meta.name} account</p>
                <ul className="mt-3 space-y-2">
                  {meta.scopes.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Account email</span>
                <input
                  type="email"
                  autoFocus
                  className={cn('input', accountError && 'input-error')}
                  placeholder="you@example.com"
                  value={account}
                  disabled={step === 'authorizing'}
                  onChange={(e) => {
                    setAccount(e.target.value);
                    setAccountError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && authorize()}
                />
                {accountError && <span className="mt-1 block text-xs font-medium text-rose-600">{accountError}</span>}
              </label>
              <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                Demo mode: this is a simulated authorization. No password is requested and nothing leaves your browser.
              </p>
            </div>
          )}

          {step === 'target' && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-semibold text-slate-900">Choose a {meta.targetNoun}</legend>
              {meta.targets.map((t) => (
                <label
                  key={t.id}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg p-3 ring-1 transition', target === t.id ? 'bg-indigo-50/60 ring-2 ring-indigo-500' : 'ring-slate-200 hover:bg-slate-50')}
                >
                  <input type="radio" name="target" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" checked={target === t.id} onChange={() => setTarget(t.id)} />
                  <span className="text-sm text-slate-800">{t.name}</span>
                </label>
              ))}
              <p className="pt-1 text-xs text-slate-500">Signed in as {account}</p>
            </fieldset>
          )}

          {step === 'mapping' && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Map your fields</p>
                <p className="text-xs text-slate-500">
                  Rename {provider === 'notion' ? 'properties' : 'columns'} or leave fields out. Status and follow-up date changes made in {meta.name} sync back to JobTrack.
                </p>
              </div>
              <MappingTable mapping={mapping} onChange={setMapping} remoteNoun={provider === 'notion' ? 'Notion property' : 'Sheet column'} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-3">
          {step === 'target' || step === 'mapping' ? (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={syncNow} onChange={(e) => setSyncNow(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              {meta.kind === 'sync' ? 'Run first sync now' : 'Back up now'}
            </label>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            {(step === 'authorize' || step === 'authorizing') && (
              <button type="button" className="btn btn-primary min-w-[8rem]" onClick={authorize} disabled={step === 'authorizing'}>
                {step === 'authorizing' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {step === 'authorizing' ? 'Authorizing…' : 'Allow access'}
              </button>
            )}
            {step === 'target' && (
              <button type="button" className="btn btn-primary" onClick={() => (meta.kind === 'sync' ? setStep('mapping') : finish())}>
                {meta.kind === 'sync' ? 'Next: map fields' : (
                  <>
                    <Check className="h-4 w-4" /> Connect
                  </>
                )}
              </button>
            )}
            {step === 'mapping' && (
              <button type="button" className="btn btn-primary" onClick={finish} disabled={!mapping.some((m) => m.enabled)}>
                <Check className="h-4 w-4" />
                Finish & connect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
