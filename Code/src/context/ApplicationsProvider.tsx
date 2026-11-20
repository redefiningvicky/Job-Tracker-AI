'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EMPTY_FILTERS, STATUS_META, STORAGE_KEY } from '@/lib/constants';
import { sampleApplications } from '@/lib/sample-data';
import { CorruptDataError, getLastBackup, loadApplications, saveApplications, setLastBackup } from '@/lib/storage';
import type { Application, ApplicationInput, Filters, Status } from '@/lib/types';
import { uid } from '@/lib/utils';
import { useToast } from './ToastProvider';

export type ImportMode = 'merge' | 'replace';

interface ApplicationsContextValue {
  applications: Application[];
  loading: boolean;
  error: string | null;
  lastBackupAt: string | null;
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  getById: (id: string) => Application | undefined;
  addApplication: (input: ApplicationInput) => Application;
  updateApplication: (id: string, input: ApplicationInput) => void;
  updateStatus: (id: string, status: Status) => void;
  deleteApplication: (id: string) => void;
  importApplications: (apps: Application[], mode: ImportMode) => { added: number; updated: number };
  clearAll: () => void;
  loadSampleData: () => void;
  markBackedUp: () => void;
}

const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  // Source of truth for mutations, so actions never act on a stale render.
  const ref = useRef<Application[]>([]);

  useEffect(() => {
    try {
      const data = loadApplications();
      ref.current = data;
      setApplications(data);
      setLastBackupAt(getLastBackup());
    } catch (err) {
      setError(
        err instanceof CorruptDataError
          ? 'Your saved data could not be read, so the app started empty. A copy of the damaged data was kept in browser storage — restore from a JSON backup if you have one.'
          : 'Browser storage is unavailable (private mode or blocked site data). Changes will not be saved after you close this tab — export a JSON backup to keep them.',
      );
    } finally {
      setLoading(false);
    }

    // Keep multiple open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const data = loadApplications();
        ref.current = data;
        setApplications(data);
      } catch {
        /* ignore — the other tab owns the write */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback(
    (next: Application[]) => {
      ref.current = next;
      setApplications(next);
      try {
        saveApplications(next);
      } catch {
        toast({
          type: 'error',
          title: "Couldn't save to browser storage",
          description: 'Storage may be full or blocked. Export a JSON backup so you don’t lose changes.',
        });
      }
    },
    [toast],
  );

  const getById = useCallback((id: string) => applications.find((a) => a.id === id), [applications]);

  const addApplication = useCallback(
    (input: ApplicationInput) => {
      const now = new Date().toISOString();
      const app: Application = {
        ...input,
        id: uid(),
        createdAt: now,
        updatedAt: now,
        statusHistory: [{ status: input.status, date: now }],
      };
      commit([app, ...ref.current]);
      toast({ title: 'Application added', description: `${app.role} at ${app.company}` });
      return app;
    },
    [commit, toast],
  );

  const updateApplication = useCallback(
    (id: string, input: ApplicationInput) => {
      const existing = ref.current.find((a) => a.id === id);
      if (!existing) return;
      const now = new Date().toISOString();
      const updated: Application = {
        ...existing,
        ...input,
        updatedAt: now,
        statusHistory:
          input.status !== existing.status
            ? [...existing.statusHistory, { status: input.status, date: now }]
            : existing.statusHistory,
      };
      commit(ref.current.map((a) => (a.id === id ? updated : a)));
      toast({ title: 'Changes saved', description: `${updated.role} at ${updated.company}` });
    },
    [commit, toast],
  );

  const updateStatus = useCallback(
    (id: string, status: Status) => {
      const existing = ref.current.find((a) => a.id === id);
      if (!existing || existing.status === status) return;
      const now = new Date().toISOString();
      const previous = existing.status;
      commit(
        ref.current.map((a) =>
          a.id === id
            ? { ...a, status, updatedAt: now, statusHistory: [...a.statusHistory, { status, date: now }] }
            : a,
        ),
      );
      toast({
        title: status === 'offer' ? 'Offer received — congratulations!' : `Moved to ${STATUS_META[status].label}`,
        description: `${existing.company} · ${existing.role}`,
        action: {
          label: 'Undo',
          onClick: () => {
            const current = ref.current.find((a) => a.id === id);
            if (!current) return;
            commit(
              ref.current.map((a) =>
                a.id === id
                  ? { ...a, status: previous, updatedAt: existing.updatedAt, statusHistory: existing.statusHistory }
                  : a,
              ),
            );
          },
        },
      });
    },
    [commit, toast],
  );

  const deleteApplication = useCallback(
    (id: string) => {
      const index = ref.current.findIndex((a) => a.id === id);
      if (index < 0) return;
      const removed = ref.current[index];
      commit(ref.current.filter((a) => a.id !== id));
      toast({
        type: 'info',
        title: 'Application deleted',
        description: `${removed.role} at ${removed.company}`,
        duration: 7000,
        action: {
          label: 'Undo',
          onClick: () => {
            if (ref.current.some((a) => a.id === removed.id)) return;
            const next = [...ref.current];
            next.splice(Math.min(index, next.length), 0, removed);
            commit(next);
            toast({ title: 'Application restored' });
          },
        },
      });
    },
    [commit, toast],
  );

  const importApplications = useCallback(
    (incoming: Application[], mode: ImportMode) => {
      if (mode === 'replace') {
        commit(incoming);
        return { added: incoming.length, updated: 0 };
      }
      const byId = new Map(ref.current.map((a) => [a.id, a]));
      let added = 0;
      let updated = 0;
      for (const app of incoming) {
        const existing = byId.get(app.id);
        if (!existing) {
          byId.set(app.id, app);
          added++;
        } else if (app.updatedAt > existing.updatedAt) {
          byId.set(app.id, app);
          updated++;
        }
      }
      commit(Array.from(byId.values()));
      return { added, updated };
    },
    [commit],
  );

  const clearAll = useCallback(() => {
    commit([]);
    toast({ type: 'info', title: 'All applications cleared' });
  }, [commit, toast]);

  const loadSampleData = useCallback(() => {
    commit([...sampleApplications(), ...ref.current]);
    toast({ title: 'Sample data loaded', description: 'Explore the dashboard, board and list views.' });
  }, [commit, toast]);

  const markBackedUp = useCallback(() => {
    const now = new Date().toISOString();
    setLastBackup(now);
    setLastBackupAt(now);
  }, []);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);
  const resetFilters = useCallback(() => setFiltersState(EMPTY_FILTERS), []);

  const value = useMemo<ApplicationsContextValue>(
    () => ({
      applications,
      loading,
      error,
      lastBackupAt,
      filters,
      setFilters,
      resetFilters,
      getById,
      addApplication,
      updateApplication,
      updateStatus,
      deleteApplication,
      importApplications,
      clearAll,
      loadSampleData,
      markBackedUp,
    }),
    [
      applications,
      loading,
      error,
      lastBackupAt,
      filters,
      setFilters,
      resetFilters,
      getById,
      addApplication,
      updateApplication,
      updateStatus,
      deleteApplication,
      importApplications,
      clearAll,
      loadSampleData,
      markBackedUp,
    ],
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}

export function useApplications(): ApplicationsContextValue {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error('useApplications must be used inside <ApplicationsProvider>');
  return ctx;
}
