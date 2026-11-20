'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useApplications } from '@/context/ApplicationsProvider';
import { STATUS_META, WORK_MODE_META } from '@/lib/constants';
import { countActiveFilters } from '@/lib/stats';
import { STATUSES, WORK_MODES } from '@/lib/types';
import { cn } from '@/lib/utils';

export function FilterBar({ total, shown }: { total: number; shown: number }) {
  const { filters, setFilters, resetFilters } = useApplications();
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const panelActive = active - (filters.search.trim() ? 1 : 0);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            aria-label="Search applications"
            className="input pl-9"
            placeholder="Search company, role, location or notes…"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn('btn btn-secondary', open && 'bg-slate-50 ring-indigo-300')}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="filter-panel"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {panelActive > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">{panelActive}</span>
            )}
          </button>
          {active > 0 && (
            <button type="button" className="btn btn-ghost" onClick={resetFilters}>
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
          <span className="ml-auto whitespace-nowrap text-sm text-slate-500 sm:ml-2" aria-live="polite">
            {shown === total ? `${total} total` : `${shown} of ${total}`}
          </span>
        </div>
      </div>

      {open && (
        <div id="filter-panel" className="mt-4 grid animate-fade-in gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto_auto]">
          <FilterGroup label="Status">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                active={filters.statuses.includes(s)}
                onClick={() => setFilters({ statuses: toggle(filters.statuses, s) })}
                dot={STATUS_META[s].dot}
              >
                {STATUS_META[s].label}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Work mode">
            {WORK_MODES.map((m) => (
              <Chip
                key={m}
                active={filters.workModes.includes(m)}
                onClick={() => setFilters({ workModes: toggle(filters.workModes, m) })}
              >
                {WORK_MODE_META[m].label}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Date applied">
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Applied from"
                className="input w-auto py-1.5"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(e) => setFilters({ dateFrom: e.target.value })}
              />
              <span className="text-sm text-slate-400">to</span>
              <input
                type="date"
                aria-label="Applied to"
                className="input w-auto py-1.5"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(e) => setFilters({ dateTo: e.target.value })}
              />
            </div>
          </FilterGroup>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
        active
          ? 'bg-indigo-600 text-white ring-indigo-600'
          : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50',
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-white' : dot)} aria-hidden />}
      {children}
    </button>
  );
}
