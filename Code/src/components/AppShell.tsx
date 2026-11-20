'use client';

import { Briefcase, Database, LayoutDashboard, List, Plus, Share2, SquareKanban, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CloudHub } from '@/components/cloud-hub/CloudHub';
import { SyncIndicator } from '@/components/cloud-hub/SyncIndicator';
import { DataDialog } from '@/components/DataDialog';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { useApplications } from '@/context/ApplicationsProvider';
import { useCloudHub } from '@/context/CloudHubProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board', label: 'Board', icon: SquareKanban },
  { href: '/list', label: 'List', icon: List },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { openCreate, isOpen } = useApplicationModal();
  const { error, applications, lastBackupAt, loading } = useApplications();
  const { openHub, isOpen: hubOpen } = useCloudHub();
  const [dataOpen, setDataOpen] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const isSharePage = pathname.startsWith('/share');

  // "N" opens the new-application form, "S" the Sync & Share Hub.
  useEffect(() => {
    if (isSharePage) return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key !== 'n' && key !== 's') return;
      if (e.metaKey || e.ctrlKey || e.altKey || isOpen || dataOpen || hubOpen) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      if (key === 'n') openCreate();
      else openHub('share');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCreate, openHub, isOpen, dataOpen, hubOpen, isSharePage]);

  const needsBackup =
    !loading &&
    applications.length > 0 &&
    (!lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 86_400_000);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // Shared snapshots are a standalone, read-only page for recipients.
  if (isSharePage) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="text-base tracking-tight">JobTrack</span>
          </Link>

          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive(href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <SyncIndicator />
            <button type="button" className="btn btn-ghost" onClick={() => openHub('share')} title="Sync & Share Hub (S)">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
              <span className="sr-only sm:hidden">Sync and share</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost relative"
              onClick={() => setDataOpen(true)}
              title={needsBackup ? 'Backup recommended' : 'Backup & export'}
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Backup</span>
              {needsBackup && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" aria-label="Backup recommended" />
              )}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openCreate()} title="New application (N)">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New application</span>
              <span className="sr-only sm:hidden">New application</span>
            </button>
          </div>
        </div>
      </header>

      {error && !errorDismissed && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-screen-2xl items-start gap-3 px-4 py-3 text-sm text-amber-900 sm:px-6 lg:px-8">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{error}</p>
            <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => setDataOpen(true)}>
              Restore backup
            </button>
            <button type="button" onClick={() => setErrorDismissed(true)} aria-label="Dismiss warning" className="text-amber-700 hover:text-amber-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-screen-2xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                isActive(href) ? 'text-indigo-600' : 'text-slate-500',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <DataDialog open={dataOpen} onClose={() => setDataOpen(false)} />
      <CloudHub />
    </div>
  );
}
