'use client';

import { ArrowRight } from 'lucide-react';
import { FIELD_LABELS, type FieldMapping } from '@/lib/cloud-sync';
import { cn } from '@/lib/utils';

export function MappingTable({ mapping, onChange, remoteNoun }: { mapping: FieldMapping[]; onChange: (m: FieldMapping[]) => void; remoteNoun: string }) {
  const set = (i: number, patch: Partial<FieldMapping>) => onChange(mapping.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      <div className="grid grid-cols-[1.5rem_1fr_1rem_1.3fr_auto] items-center gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span />
        <span>JobTrack field</span>
        <span />
        <span>{remoteNoun}</span>
        <span className="w-20 text-right">Type</span>
      </div>
      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
        {mapping.map((m, i) => (
          <li key={m.field} className={cn('grid grid-cols-[1.5rem_1fr_1rem_1.3fr_auto] items-center gap-2 px-3 py-1.5 transition', !m.enabled && 'opacity-50')}>
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={(e) => set(i, { enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              aria-label={`Sync ${FIELD_LABELS[m.field]}`}
            />
            <span className="truncate text-sm text-slate-800">{FIELD_LABELS[m.field]}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            <input
              value={m.remote}
              disabled={!m.enabled}
              onChange={(e) => set(i, { remote: e.target.value })}
              aria-label={`${remoteNoun} name for ${FIELD_LABELS[m.field]}`}
              className="min-w-0 rounded-md border-0 bg-slate-50 px-2 py-1 text-sm text-slate-800 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
            <span className="w-20 truncate rounded bg-slate-100 px-1.5 py-0.5 text-right text-[11px] font-medium text-slate-500">{m.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
