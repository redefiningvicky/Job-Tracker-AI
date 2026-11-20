'use client';

import { Archive, ArrowRight, Cloud, LoaderCircle, ShieldCheck, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApplications, type ImportMode } from '@/context/ApplicationsProvider';
import { useCloudHub } from '@/context/CloudHubProvider';
import { useToast } from '@/context/ToastProvider';
import { parseBackup, type ParsedBackup } from '@/lib/backup';
import { cn, timeAgo } from '@/lib/utils';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function DataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { applications, importApplications, clearAll, lastBackupAt } = useApplications();
  const { toast } = useToast();
  const { openHub } = useCloudHub();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [pending, setPending] = useState<(ParsedBackup & { fileName: string }) | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const close = () => {
    setPending(null);
    setImportError(null);
    setConfirmClear(false);
    onClose();
  };

  const goToHub = (archive: boolean) => {
    close();
    openHub(archive ? 'share' : 'integrations', archive ? { template: 'full-archive' } : undefined);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    setPending(null);
    if (file.size > MAX_FILE_BYTES) {
      setImportError('That file is larger than 10 MB — it doesn’t look like a backup from this app.');
      return;
    }
    setReading(true);
    try {
      const parsed = parseBackup(await file.text());
      setPending({ ...parsed, fileName: file.name });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setReading(false);
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const { added, updated } = importApplications(pending.applications, mode);
    toast({
      title: 'Backup restored',
      description:
        mode === 'replace'
          ? `Replaced your data with ${added} applications.`
          : `${added} added, ${updated} updated${pending.skipped ? `, ${pending.skipped} skipped` : ''}.`,
    });
    close();
  };

  const backupAge = lastBackupAt ? Date.now() - new Date(lastBackupAt).getTime() : Infinity;
  const backupStale = applications.length > 0 && backupAge > 7 * 86_400_000;

  return (
    <Modal open={open} onClose={close} title="Backup & export" description="Your data lives in this browser only." size="md">
      <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg p-3 text-sm',
            backupStale ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900',
          )}
        >
          {backupStale ? (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>
            {lastBackupAt ? `Last backup ${timeAgo(lastBackupAt)}.` : 'You haven’t made a backup yet.'}{' '}
            {backupStale
              ? 'Clearing your browser data would erase your applications — download a JSON backup now.'
              : 'Download a fresh backup regularly to keep your data safe.'}
          </p>
        </div>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Back up & share</h3>
          <button
            type="button"
            onClick={() => goToHub(false)}
            className="group mt-3 flex w-full items-center gap-3 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 p-3.5 text-left ring-1 ring-indigo-200 transition hover:ring-indigo-300"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
              <Cloud className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">Sync & Share Hub</span>
              <span className="block text-xs text-slate-600">Cloud backups, Sheets & Notion sync, digests and share links</span>
            </span>
            <ArrowRight className="h-4 w-4 text-indigo-500 transition group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => goToHub(true)}
            disabled={applications.length === 0}
            className="mt-2 flex w-full items-center gap-3 rounded-lg p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Archive className="h-5 w-5 text-amber-600" />
            <span>
              <span className="block text-sm font-medium text-slate-900">Full Job Hunt Archive</span>
              <span className="block text-xs text-slate-500">Download a restorable copy to this device, or share it.</span>
            </span>
          </button>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Restore from backup</h3>
          <fieldset className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <legend className="sr-only">Import mode</legend>
            {(
              [
                ['merge', 'Merge', 'Keep current data'],
                ['replace', 'Replace', 'Overwrite everything'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-2 text-center transition',
                  mode === value ? 'bg-white shadow-sm' : 'hover:bg-white/60',
                )}
              >
                <input type="radio" name="import-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                <span className="block text-sm font-medium text-slate-900">{label}</span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </label>
            ))}
          </fieldset>

          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          <button type="button" className="btn btn-secondary mt-3 w-full" onClick={() => fileRef.current?.click()} disabled={reading}>
            {reading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {reading ? 'Reading file…' : 'Choose JSON backup file'}
          </button>

          {importError && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {importError}
            </p>
          )}

          {pending && (
            <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
              <p className="text-sm text-slate-800">
                <span className="font-medium">{pending.fileName}</span> contains{' '}
                <span className="font-semibold">{pending.applications.length}</span> applications
                {pending.skipped > 0 && ` (${pending.skipped} unreadable records will be skipped)`}
                {pending.exportedAt && `, exported ${timeAgo(pending.exportedAt)}`}.
              </p>
              {mode === 'replace' && applications.length > 0 && (
                <p className="mt-1 text-sm font-medium text-rose-700">
                  This will permanently replace your {applications.length} current applications.
                </p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={cn('btn', mode === 'replace' && applications.length > 0 ? 'btn-danger' : 'btn-primary')}
                  onClick={confirmImport}
                >
                  {mode === 'replace' ? 'Replace data' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </section>

        {applications.length > 0 && (
          <section className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-rose-700">Danger zone</h3>
            {confirmClear ? (
              <div className="mt-3 rounded-lg bg-rose-50 p-3">
                <p className="text-sm text-rose-800">
                  Delete all {applications.length} applications from this browser? This can’t be undone unless you have a backup.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      clearAll();
                      close();
                    }}
                  >
                    Delete everything
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost mt-2 -ml-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear all data
              </button>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
