import type { Filters, Status, WorkMode } from './types';

export interface StatusMeta {
  label: string;
  short: string;
  badge: string;
  dot: string;
  bar: string;
  column: string;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  wishlist: {
    label: 'Wishlist',
    short: 'Wishlist',
    badge: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    column: 'bg-slate-100/80',
  },
  applied: {
    label: 'Applied',
    short: 'Applied',
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    column: 'bg-sky-50/70',
  },
  phone_screen: {
    label: 'Phone Screen',
    short: 'Screen',
    badge: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
    column: 'bg-violet-50/70',
  },
  interview: {
    label: 'Technical / Interview',
    short: 'Interview',
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    column: 'bg-amber-50/70',
  },
  offer: {
    label: 'Offer',
    short: 'Offer',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    column: 'bg-emerald-50/70',
  },
  rejected: {
    label: 'Rejected',
    short: 'Rejected',
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
    bar: 'bg-rose-400',
    column: 'bg-rose-50/60',
  },
};

export const WORK_MODE_META: Record<WorkMode, { label: string; badge: string }> = {
  remote: { label: 'Remote', badge: 'bg-teal-50 text-teal-700 ring-teal-600/20' },
  hybrid: { label: 'Hybrid', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  onsite: { label: 'On-site', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
};

/** Forward-progress stages used for the funnel. Wishlist and Rejected sit outside it. */
export const PIPELINE: Status[] = ['applied', 'phone_screen', 'interview', 'offer'];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'SGD', 'CHF', 'NZD'];

export const STORAGE_KEY = 'job-tracker:v1';
export const BACKUP_KEY = 'job-tracker:last-backup';

export const EMPTY_FILTERS: Filters = {
  search: '',
  statuses: [],
  workModes: [],
  dateFrom: '',
  dateTo: '',
};
