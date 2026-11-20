import { TEMPLATE_ORDER } from './templates';
import type { ContactLabel, HubState, ProviderId, Schedule } from './types';

export const HUB_KEY = 'job-tracker:cloud-hub';
const MAX_ACTIVITY = 200;
const PROVIDER_IDS: ProviderId[] = ['google-sheets', 'notion', 'google-drive', 'dropbox', 'onedrive'];
const LABELS: ContactLabel[] = ['Coach', 'Mentor', 'Partner', 'Recruiter', 'Friend'];

export const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 'weekly-digest',
    kind: 'digest',
    enabled: false,
    frequency: 'weekly',
    dayOfWeek: 0,
    dayOfMonth: 1,
    time: '18:00',
    template: 'coach-digest',
    recipients: [],
    destinations: [],
  },
  {
    id: 'auto-backup',
    kind: 'backup',
    enabled: false,
    frequency: 'daily',
    dayOfWeek: 0,
    dayOfMonth: 1,
    time: '21:00',
    template: 'full-archive',
    recipients: [],
    destinations: [],
  },
];

export function defaultHub(): HubState {
  return { version: 1, profile: { name: '' }, connections: {}, schedules: DEFAULT_SCHEDULES, activity: [], links: [], contacts: [] };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Defensive load — a bad value in storage should never break the app. */
export function loadHub(): HubState {
  const d = defaultHub();
  try {
    const raw = window.localStorage.getItem(HUB_KEY);
    if (!raw) return d;
    const p: unknown = JSON.parse(raw);
    if (!isObj(p)) return d;
    const connections: HubState['connections'] = {};
    if (isObj(p.connections)) {
      for (const id of PROVIDER_IDS) {
        const c = p.connections[id];
        if (isObj(c) && typeof c.account === 'string' && isObj(c.target)) connections[id] = c as unknown as NonNullable<HubState['connections'][ProviderId]>;
      }
    }
    const schedules = d.schedules.map((def) => {
      const saved = Array.isArray(p.schedules) ? p.schedules.find((s) => isObj(s) && s.id === def.id) : undefined;
      if (!isObj(saved)) return def;
      return {
        ...def,
        ...saved,
        id: def.id,
        kind: def.kind,
        template: TEMPLATE_ORDER.includes(saved.template as never) ? (saved.template as Schedule['template']) : def.template,
        recipients: Array.isArray(saved.recipients) ? saved.recipients.filter((r): r is string => typeof r === 'string') : [],
        destinations: Array.isArray(saved.destinations) ? saved.destinations.filter((x): x is ProviderId => PROVIDER_IDS.includes(x as ProviderId)) : [],
      } as Schedule;
    });
    return {
      version: 1,
      profile: { name: isObj(p.profile) && typeof p.profile.name === 'string' ? p.profile.name : '' },
      connections,
      schedules,
      activity: Array.isArray(p.activity) ? (p.activity.filter((a) => isObj(a) && typeof a.at === 'string') as unknown as HubState['activity']).slice(0, MAX_ACTIVITY) : [],
      links: Array.isArray(p.links) ? (p.links.filter((l) => isObj(l) && typeof l.url === 'string') as unknown as HubState['links']) : [],
      contacts: Array.isArray(p.contacts)
        ? (p.contacts.filter((c) => isObj(c) && typeof c.email === 'string' && LABELS.includes(c.label as ContactLabel)) as unknown as HubState['contacts'])
        : [],
    };
  } catch {
    return d;
  }
}

export function saveHub(state: HubState): void {
  try {
    window.localStorage.setItem(HUB_KEY, JSON.stringify({ ...state, activity: state.activity.slice(0, MAX_ACTIVITY) }));
  } catch {
    /* storage full or blocked — hub settings are a convenience */
  }
}

export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
