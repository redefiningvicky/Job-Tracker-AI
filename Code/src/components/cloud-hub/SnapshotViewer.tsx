'use client';

import { Briefcase, Clock, EyeOff, Link2Off, LoaderCircle, Lock, Printer } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { decodeSnapshot, describeExpiry, tokenFromHash, type Snapshot } from '@/lib/cloud-sync';
import { DigestView } from './DigestView';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'expired'; snapshot: Snapshot } | { kind: 'ready'; snapshot: Snapshot };

/** Public, read-only view of a shared snapshot. All data comes from the URL fragment. */
export function SnapshotViewer() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const load = async () => {
      const token = tokenFromHash(window.location.hash);
      if (!token) return setState({ kind: 'error', message: 'This link doesn’t contain a snapshot. Ask the sender to share it again.' });
      try {
        const snapshot = await decodeSnapshot(token);
        setState(describeExpiry(snapshot.expiresAt).expired ? { kind: 'expired', snapshot } : { kind: 'ready', snapshot });
      } catch (err) {
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'This snapshot couldn’t be opened.' });
      }
    };
    load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, []);

  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-8 sm:py-12 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            JobTrack
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            <Lock className="h-3 w-3" /> Read-only snapshot
          </span>
        </div>

        {state.kind === 'loading' && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-16 text-sm text-slate-500 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Opening snapshot…
          </div>
        )}

        {state.kind === 'error' && <Notice icon={<Link2Off className="h-6 w-6 text-rose-500" />} title="Snapshot unavailable" body={state.message} />}

        {state.kind === 'expired' && (
          <Notice
            icon={<Clock className="h-6 w-6 text-amber-500" />}
            title="This snapshot has expired"
            body={`${state.snapshot.digest.owner} shared this with an expiry date that has passed. Ask them for a fresh link.`}
          />
        )}

        {state.kind === 'ready' && (
          <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
            <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-6 text-white sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Shared job search snapshot</p>
              <h1 className="mt-1 text-2xl font-bold">{state.snapshot.digest.title}</h1>
              <p className="mt-1 text-sm opacity-90">
                Shared by {state.snapshot.digest.owner} ·{' '}
                {new Date(state.snapshot.digest.generatedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5">{describeExpiry(state.snapshot.expiresAt).label}</span>
                {state.snapshot.digest.redacted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
                    <EyeOff className="h-3 w-3" /> Private details hidden
                  </span>
                )}
              </div>
            </header>
            <div className="px-6 py-6 sm:px-8">
              <DigestView digest={state.snapshot.digest} />
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-8 print:hidden">
              <span>A point-in-time snapshot. It won’t change as the search progresses.</span>
              <button type="button" onClick={() => window.print()} className="btn btn-secondary py-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" /> Print / Save PDF
              </button>
            </footer>
          </article>
        )}

        <p className="mt-6 text-center text-xs text-slate-500 print:hidden">
          Organize your own search with{' '}
          <Link href="/" className="font-medium text-indigo-600 hover:underline">
            JobTrack
          </Link>
        </p>
      </div>
    </div>
  );
}

function Notice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">{icon}</span>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>
    </div>
  );
}
