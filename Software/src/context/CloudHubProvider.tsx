'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  PROVIDERS,
  SYNC_PROVIDERS,
  TEMPLATES,
  backupFileName,
  buildDigest,
  computeNextRun,
  defaultHub,
  estimateBackupBytes,
  loadHub,
  saveHub,
  syncPlan,
  type ActivityEntry,
  type Connection,
  type ContactLabel,
  type HubState,
  type ProviderId,
  type Schedule,
  type ScheduleId,
  type SharedLink,
  type SyncJob,
  type TemplateId,
} from '@/lib/cloud-sync';
import { uid } from '@/lib/utils';
import { useApplications } from './ApplicationsProvider';
import { useToast } from './ToastProvider';

export type HubTab = 'share' | 'integrations' | 'schedules' | 'activity';

export type LogInput = Omit<ActivityEntry, 'id' | 'at'>;

interface CloudHubValue {
  ready: boolean;
  hub: HubState;
  jobs: Partial<Record<ProviderId, SyncJob & { stepMs: number }>>;
  isOpen: boolean;
  tab: HubTab;
  initialTemplate: TemplateId | null;
  openHub: (tab?: HubTab, opts?: { template?: TemplateId }) => void;
  closeHub: () => void;
  setTab: (tab: HubTab) => void;
  setProfileName: (name: string) => void;
  connect: (provider: ProviderId, data: Pick<Connection, 'account' | 'target' | 'mapping'>) => void;
  disconnect: (provider: ProviderId) => void;
  updateConnection: (provider: ProviderId, patch: Partial<Connection>) => void;
  startSync: (provider: ProviderId, opts?: { auto?: boolean }) => void;
  updateSchedule: (id: ScheduleId, patch: Partial<Schedule>) => void;
  runScheduleNow: (id: ScheduleId) => void;
  log: (entry: LogInput) => void;
  clearActivity: () => void;
  addLink: (link: Omit<SharedLink, 'id'>) => void;
  removeLink: (id: string) => void;
  rememberContacts: (emails: string[], label?: ContactLabel) => void;
  setContactLabel: (email: string, label: ContactLabel) => void;
}

const Ctx = createContext<CloudHubValue | null>(null);

const COALESCE_MS = 15 * 60_000;
const TIMING_FIELDS: (keyof Schedule)[] = ['enabled', 'frequency', 'dayOfWeek', 'dayOfMonth', 'time'];

export function CloudHubProvider({ children }: { children: ReactNode }) {
  const { applications, loading } = useApplications();
  const { toast } = useToast();
  const [hub, setHubState] = useState<HubState>(defaultHub);
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<CloudHubValue['jobs']>({});
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState<HubTab>('share');
  const [initialTemplate, setInitialTemplate] = useState<TemplateId | null>(null);

  const hubRef = useRef(hub);
  hubRef.current = hub;
  const appsRef = useRef(applications);
  appsRef.current = applications;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const timers = useRef<Partial<Record<ProviderId, ReturnType<typeof setTimeout>[]>>>({});

  const setHub = useCallback((fn: (h: HubState) => HubState) => {
    setHubState((prev) => {
      const next = fn(prev);
      hubRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const loaded = loadHub();
    hubRef.current = loaded;
    setHubState(loaded);
    setReady(true);
    const t = timers.current;
    return () => Object.values(t).forEach((list) => list?.forEach(clearTimeout));
  }, []);

  useEffect(() => {
    if (ready) saveHub(hub);
  }, [hub, ready]);

  // ── Activity log ────────────────────────────────────────────────────────────
  const log = useCallback(
    (entry: LogInput) => {
      setHub((h) => {
        const at = new Date().toISOString();
        const top = h.activity[0];
        if (entry.coalesceKey && top?.coalesceKey === entry.coalesceKey && Date.now() - new Date(top.at).getTime() < COALESCE_MS) {
          return { ...h, activity: [{ ...top, ...entry, at, repeat: (top.repeat ?? 1) + 1 }, ...h.activity.slice(1)] };
        }
        return { ...h, activity: [{ ...entry, id: uid(), at }, ...h.activity].slice(0, 200) };
      });
    },
    [setHub],
  );

  const clearActivity = useCallback(() => setHub((h) => ({ ...h, activity: [] })), [setHub]);

  // ── Connections & simulated sync ─────────────────────────────────────────────
  const updateConnection = useCallback(
    (provider: ProviderId, patch: Partial<Connection>) =>
      setHub((h) => {
        const c = h.connections[provider];
        return c ? { ...h, connections: { ...h.connections, [provider]: { ...c, ...patch } } } : h;
      }),
    [setHub],
  );

  const startSync = useCallback(
    (provider: ProviderId, opts: { auto?: boolean } = {}) => {
      const conn = hubRef.current.connections[provider];
      if (!conn || jobsRef.current[provider]) return;
      const auto = !!opts.auto;
      const meta = PROVIDERS[provider];
      const records = appsRef.current.length;
      const steps = syncPlan(provider, records, auto);
      const startedAt = new Date().toISOString();
      const list: ReturnType<typeof setTimeout>[] = [];
      setJobs((j) => ({ ...j, [provider]: { provider, phase: steps[0].phase, progress: 0, auto, startedAt, stepMs: 0 } }));

      let elapsed = 30;
      for (const step of steps) {
        list.push(
          setTimeout(() => setJobs((j) => (j[provider] ? { ...j, [provider]: { ...j[provider]!, phase: step.phase, progress: step.until, stepMs: step.ms } } : j)), elapsed),
        );
        elapsed += step.ms;
      }
      list.push(
        setTimeout(() => {
          setJobs((j) => {
            const next = { ...j };
            delete next[provider];
            return next;
          });
          const now = new Date().toISOString();
          updateConnection(provider, { lastSyncedAt: now, lastSyncCount: records });
          if (meta.kind === 'storage') {
            const kb = Math.max(1, Math.round(estimateBackupBytes(records) / 1024));
            log({
              type: 'backup',
              status: 'success',
              title: `${auto ? 'Automatic backup' : 'Backup'} uploaded to ${meta.name}`,
              detail: `${backupFileName()} · ${kb} KB · ${conn.target.name}`,
              destination: provider,
              recordCount: records,
            });
          } else {
            const noun = provider === 'notion' ? 'pages' : 'rows';
            log({
              type: 'sync',
              status: 'success',
              title: auto ? `Auto-synced to ${meta.name}` : `Synced with ${meta.name}`,
              detail: `${records} ${noun} up to date in “${conn.target.name}” · 0 remote conflicts`,
              destination: provider,
              recordCount: records,
              coalesceKey: auto ? `auto-sync:${provider}` : undefined,
            });
          }
          if (!auto) toast({ title: `${meta.kind === 'storage' ? 'Backed up to' : 'Synced with'} ${meta.name}`, description: `${records} records · simulated` });
          delete timers.current[provider];
        }, elapsed + 120),
      );
      timers.current[provider] = list;
    },
    [log, toast, updateConnection],
  );

  const connect = useCallback(
    (provider: ProviderId, data: Pick<Connection, 'account' | 'target' | 'mapping'>) => {
      const conn: Connection = { provider, ...data, connectedAt: new Date().toISOString(), autoSync: PROVIDERS[provider].kind === 'sync' };
      setHub((h) => ({ ...h, connections: { ...h.connections, [provider]: conn } }));
      log({ type: 'connect', status: 'info', title: `Connected ${PROVIDERS[provider].name}`, detail: `${data.account} · ${data.target.name}`, destination: provider });
      toast({ title: `${PROVIDERS[provider].name} connected`, description: data.target.name });
    },
    [setHub, log, toast],
  );

  const disconnect = useCallback(
    (provider: ProviderId) => {
      timers.current[provider]?.forEach(clearTimeout);
      delete timers.current[provider];
      setJobs((j) => {
        const next = { ...j };
        delete next[provider];
        return next;
      });
      setHub((h) => {
        const connections = { ...h.connections };
        delete connections[provider];
        return {
          ...h,
          connections,
          schedules: h.schedules.map((s) => ({ ...s, destinations: s.destinations.filter((d) => d !== provider) })),
        };
      });
      log({ type: 'connect', status: 'info', title: `Disconnected ${PROVIDERS[provider].name}`, destination: provider });
    },
    [setHub, log],
  );

  // Auto-sync: push changes to connected sync providers shortly after edits.
  const firstApps = useRef(true);
  useEffect(() => {
    if (!ready || loading) return;
    if (firstApps.current) {
      firstApps.current = false;
      return;
    }
    const t = setTimeout(() => {
      for (const p of SYNC_PROVIDERS) if (hubRef.current.connections[p]?.autoSync) startSync(p, { auto: true });
    }, 2500);
    return () => clearTimeout(t);
  }, [applications, ready, loading, startSync]);

  // ── Schedules ────────────────────────────────────────────────────────────────
  const updateSchedule = useCallback(
    (id: ScheduleId, patch: Partial<Schedule>) =>
      setHub((h) => ({
        ...h,
        schedules: h.schedules.map((s) => {
          if (s.id !== id) return s;
          const next = { ...s, ...patch };
          if (TIMING_FIELDS.some((k) => k in patch)) next.nextRunAt = next.enabled ? computeNextRun(next).toISOString() : undefined;
          return next;
        }),
      })),
    [setHub],
  );

  const executeSchedule = useCallback(
    (s: Schedule, manual: boolean) => {
      const now = new Date();
      const missed = !manual && s.nextRunAt && now.getTime() - new Date(s.nextRunAt).getTime() > 2 * 60_000;
      const suffix = missed ? ' · caught up on a run missed while JobTrack was closed' : manual ? ' · run manually' : '';
      const conns = hubRef.current.connections;

      if (s.kind === 'digest') {
        const digest = buildDigest(appsRef.current, s.template, { owner: hubRef.current.profile.name, redact: TEMPLATES[s.template].defaultRedact, now });
        if (s.recipients.length === 0 && s.destinations.length === 0) {
          log({ type: 'schedule', status: 'failed', title: 'Weekly digest skipped', detail: `No recipients or destinations set${suffix}`, template: s.template });
        } else {
          if (s.recipients.length) {
            log({
              type: 'email',
              status: 'success',
              title: `${TEMPLATES[s.template].name} delivered`,
              detail: `To ${s.recipients.join(', ')} · simulated delivery${suffix}`,
              destination: 'email',
              recordCount: digest.recordCount,
              template: s.template,
            });
          }
          for (const d of s.destinations) {
            log(
              conns[d]
                ? { type: 'sync', status: 'success', title: `Digest page added to ${PROVIDERS[d].name}`, detail: `“${digest.subject}”${suffix}`, destination: d, recordCount: digest.recordCount, template: s.template }
                : { type: 'schedule', status: 'failed', title: `Couldn’t post digest to ${PROVIDERS[d].name}`, detail: 'Not connected', destination: d },
            );
          }
          if (!manual) toast({ type: 'info', title: 'Weekly digest sent', description: 'Scheduled run · simulated delivery' });
        }
      } else {
        if (s.destinations.length === 0) {
          log({ type: 'schedule', status: 'failed', title: 'Automatic backup skipped', detail: `No destinations selected${suffix}` });
        } else {
          log({ type: 'schedule', status: 'info', title: 'Automatic backup started', detail: `${s.destinations.map((d) => PROVIDERS[d].name).join(', ')}${suffix}` });
          for (const d of s.destinations) {
            if (conns[d]) startSync(d, { auto: !manual });
            else log({ type: 'backup', status: 'failed', title: `Backup to ${PROVIDERS[d].name} failed`, detail: 'Not connected — reconnect in Cloud Integrations', destination: d });
          }
        }
      }
      setHub((h) => ({
        ...h,
        schedules: h.schedules.map((x) =>
          x.id === s.id ? { ...x, lastRunAt: now.toISOString(), nextRunAt: x.enabled ? computeNextRun(x, now).toISOString() : x.nextRunAt } : x,
        ),
      }));
    },
    [log, setHub, startSync, toast],
  );

  const runScheduleNow = useCallback(
    (id: ScheduleId) => {
      const s = hubRef.current.schedules.find((x) => x.id === id);
      if (s) executeSchedule(s, true);
    },
    [executeSchedule],
  );

  // Runs while the app is open; missed runs catch up on next launch.
  useEffect(() => {
    if (!ready || loading) return;
    const tick = () => {
      const now = new Date();
      for (const s of hubRef.current.schedules) {
        if (!s.enabled) continue;
        if (!s.nextRunAt) updateSchedule(s.id, { enabled: true });
        else if (new Date(s.nextRunAt) <= now) executeSchedule(s, false);
      }
    };
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, [ready, loading, executeSchedule, updateSchedule]);

  // ── Links, contacts, profile ────────────────────────────────────────────────
  const addLink = useCallback((link: Omit<SharedLink, 'id'>) => setHub((h) => ({ ...h, links: [{ ...link, id: uid() }, ...h.links].slice(0, 50) })), [setHub]);
  const removeLink = useCallback((id: string) => setHub((h) => ({ ...h, links: h.links.filter((l) => l.id !== id) })), [setHub]);

  const rememberContacts = useCallback(
    (emails: string[], label: ContactLabel = 'Coach') =>
      setHub((h) => {
        const now = new Date().toISOString();
        const map = new Map(h.contacts.map((c) => [c.email.toLowerCase(), c]));
        for (const e of emails) {
          const key = e.toLowerCase();
          const existing = map.get(key);
          map.set(key, existing ? { ...existing, lastUsedAt: now } : { email: e, label, lastUsedAt: now });
        }
        return { ...h, contacts: Array.from(map.values()).sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)).slice(0, 20) };
      }),
    [setHub],
  );

  const setContactLabel = useCallback(
    (email: string, label: ContactLabel) => setHub((h) => ({ ...h, contacts: h.contacts.map((c) => (c.email === email ? { ...c, label } : c)) })),
    [setHub],
  );

  const setProfileName = useCallback((name: string) => setHub((h) => ({ ...h, profile: { ...h.profile, name } })), [setHub]);

  const openHub = useCallback((t?: HubTab, opts?: { template?: TemplateId }) => {
    if (t) setTab(t);
    setInitialTemplate(opts?.template ?? null);
    setOpen(true);
  }, []);
  const closeHub = useCallback(() => setOpen(false), []);

  const value = useMemo<CloudHubValue>(
    () => ({
      ready,
      hub,
      jobs,
      isOpen,
      tab,
      initialTemplate,
      openHub,
      closeHub,
      setTab,
      setProfileName,
      connect,
      disconnect,
      updateConnection,
      startSync,
      updateSchedule,
      runScheduleNow,
      log,
      clearActivity,
      addLink,
      removeLink,
      rememberContacts,
      setContactLabel,
    }),
    [ready, hub, jobs, isOpen, tab, initialTemplate, openHub, closeHub, setProfileName, connect, disconnect, updateConnection, startSync, updateSchedule, runScheduleNow, log, clearActivity, addLink, removeLink, rememberContacts, setContactLabel],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloudHub(): CloudHubValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCloudHub must be used inside <CloudHubProvider>');
  return ctx;
}
