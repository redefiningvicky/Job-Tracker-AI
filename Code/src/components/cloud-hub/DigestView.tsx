'use client';

import { EyeOff } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badges';
import type { DigestContent } from '@/lib/cloud-sync';
import { cn } from '@/lib/utils';

const TONE: Record<string, string> = {
  default: 'text-slate-500',
  warning: 'text-amber-700',
  danger: 'text-rose-600',
  success: 'text-emerald-700',
};

/** Renders a digest — used for the email preview, link preview and the public snapshot page. */
export function DigestView({ digest, compact = false }: { digest: DigestContent; compact?: boolean }) {
  return (
    <div className={cn('text-slate-800', compact ? 'space-y-4 text-[13px]' : 'space-y-6 text-sm')}>
      {digest.note && (
        <blockquote className="whitespace-pre-wrap rounded-lg border-l-4 border-indigo-300 bg-indigo-50/60 px-4 py-3 text-slate-700">{digest.note}</blockquote>
      )}
      <p className="leading-relaxed text-slate-600">{digest.intro}</p>

      <div className={cn('grid gap-2', digest.stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
        {digest.stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200">
            <p className={cn('font-bold tabular-nums text-slate-900', compact ? 'text-lg' : 'text-2xl')}>{s.value}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {digest.sections.map((section) => (
        <section key={section.id}>
          <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-slate-200 pb-1.5">
            <h4 className={cn('font-semibold text-slate-900', compact ? 'text-sm' : 'text-base')}>
              {section.title}
              <span className="ml-1.5 text-xs font-normal text-slate-400">{section.items.length}</span>
            </h4>
            {section.subtitle && <span className="hidden text-xs text-slate-400 sm:inline">{section.subtitle}</span>}
          </div>
          {section.items.length === 0 ? (
            <p className="py-1 text-xs italic text-slate-400">{section.empty}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {section.items.map((item, i) => (
                <li key={`${item.company}-${i}`} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {item.company} <span className="font-normal text-slate-500">· {item.role}</span>
                    </p>
                    {item.meta && <p className={cn('truncate text-xs', TONE[item.tone ?? 'default'])}>{item.meta}</p>}
                    {item.note && <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-slate-500">{item.note}</p>}
                  </div>
                  {item.status && <StatusBadge status={item.status} className="shrink-0" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {digest.redacted && (
        <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <EyeOff className="h-3.5 w-3.5" />
          Salary, notes, follow-up dates and job links were redacted for privacy.
        </p>
      )}
    </div>
  );
}
