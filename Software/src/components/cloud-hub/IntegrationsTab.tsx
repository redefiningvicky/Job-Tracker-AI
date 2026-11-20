'use client';

import { ChevronDown, CloudUpload, Folder, Plug, RefreshCw, Unplug, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useApplications } from '@/context/ApplicationsProvider';
import { useCloudHub } from '@/context/CloudHubProvider';
import { PROVIDERS, STORAGE_PROVIDERS, SYNC_PROVIDERS, type ProviderId } from '@/lib/cloud-sync';
import { cn, timeAgo } from '@/lib/utils';
import { ConnectWizard } from './ConnectWizard';
import { MappingTable } from './MappingTable';
import { ProgressBar, ProviderTile, SyncStatusBadge, Toggle, useNow } from './shared';

export function IntegrationsTab() {
  const [connecting, setConnecting] = useState<ProviderId | null>(null);
  return (
    <div className="space-y-8 p-4 sm:p-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-900">Live data sync</h3>
        <p className="mb-3 text-xs text-slate-500">Two-way sync keeps a spreadsheet or Notion database in step with your pipeline.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {SYNC_PROVIDERS.map((p) => (
            <ProviderCard key={p} provider={p} onConnect={() => setConnecting(p)} />
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-slate-900">Backup destinations</h3>
        <p className="mb-3 text-xs text-slate-500">Where scheduled and on-demand backups are uploaded.</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STORAGE_PROVIDERS.map((p) => (
            <ProviderCard key={p} provider={p} onConnect={() => setConnecting(p)} />
          ))}
        </div>
      </section>
      {connecting && <ConnectWizard provider={connecting} onClose={() => setConnecting(null)} />}
    </div>
  );
}

function ProviderCard({ provider, onConnect }: { provider: ProviderId; onConnect: () => void }) {
  const meta = PROVIDERS[provider];
  const { hub, jobs, startSync, disconnect, updateConnection } = useCloudHub();
  const { applications } = useApplications();
  const conn = hub.connections[provider];
  const job = jobs[provider];
  const [showMapping, setShowMapping] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useNow();

  return (
    <article className={cn('flex flex-col rounded-xl bg-white p-4 ring-1 transition', conn ? 'ring-slate-200' : 'ring-slate-200 bg-slate-50/40', job && 'ring-2 ring-sky-300')}>
      <div className="flex items-start gap-3">
        <ProviderTile provider={provider} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{meta.name}</h4>
            <SyncStatusBadge connected={!!conn} syncing={!!job} lastSyncedAt={conn?.lastSyncedAt} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{meta.tagline}</p>
        </div>
      </div>

      {conn ? (
        <div className="mt-4 flex flex-1 flex-col gap-3">
          <dl className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-slate-400" />
              <dt className="sr-only">Account</dt>
              <dd className="truncate">{conn.account}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-slate-400" />
              <dt className="sr-only">Target</dt>
              <dd className="truncate">{conn.target.name}</dd>
            </div>
          </dl>

          <div className="min-h-[2.5rem]">
            {job ? (
              <div className="space-y-1.5" aria-live="polite">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-sky-700">{job.phase}…</span>
                  <span className="tabular-nums text-slate-500">{Math.round(job.progress * 100)}%</span>
                </div>
                <ProgressBar value={job.progress} durationMs={job.stepMs} />
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {conn.lastSyncedAt
                  ? `Last ${meta.kind === 'storage' ? 'backup' : 'sync'} ${timeAgo(conn.lastSyncedAt)} · ${conn.lastSyncCount ?? 0} records`
                  : `Connected ${timeAgo(conn.connectedAt)} · no ${meta.kind === 'storage' ? 'backups' : 'syncs'} yet`}
              </p>
            )}
          </div>

          {meta.kind === 'sync' && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-800">Auto-sync on change</p>
                <p className="text-[11px] text-slate-500">Pushes edits a few seconds after you make them</p>
              </div>
              <Toggle checked={conn.autoSync} onChange={(autoSync) => updateConnection(provider, { autoSync })} label="Auto-sync" />
            </div>
          )}

          {meta.kind === 'sync' && conn.mapping && (
            <div>
              <button type="button" onClick={() => setShowMapping((s) => !s)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500" aria-expanded={showMapping}>
                <ChevronDown className={cn('h-3.5 w-3.5 transition', showMapping && 'rotate-180')} />
                Field mapping · {conn.mapping.filter((m) => m.enabled).length} of {conn.mapping.length} fields
              </button>
              {showMapping && (
                <div className="mt-2 animate-fade-in">
                  <MappingTable mapping={conn.mapping} onChange={(mapping) => updateConnection(provider, { mapping })} remoteNoun={provider === 'notion' ? 'Notion property' : 'Sheet column'} />
                </div>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => startSync(provider)} disabled={!!job || applications.length === 0}>
              {meta.kind === 'storage' ? <CloudUpload className="h-4 w-4" /> : <RefreshCw className={cn('h-4 w-4', job && 'animate-spin')} />}
              {job ? 'Working…' : meta.kind === 'storage' ? 'Back up now' : 'Sync now'}
            </button>
            {confirm ? (
              <>
                <button type="button" className="btn btn-danger" onClick={() => disconnect(provider)}>
                  Disconnect
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="btn-icon h-9 w-9 hover:bg-rose-50 hover:text-rose-600" onClick={() => setConfirm(true)} aria-label={`Disconnect ${meta.name}`} title="Disconnect">
                <Unplug className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={onConnect} className="btn btn-secondary mt-4 w-full">
          <Plug className="h-4 w-4" />
          Connect {meta.name}
        </button>
      )}
    </article>
  );
}
