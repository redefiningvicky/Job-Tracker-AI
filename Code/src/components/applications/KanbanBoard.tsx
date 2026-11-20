'use client';

import { ChevronLeft, ChevronRight, MessageSquare, Plus } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { CompanyAvatar, FollowUpTag, WorkModeBadge } from '@/components/ui/Badges';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { useApplications } from '@/context/ApplicationsProvider';
import { STATUS_META } from '@/lib/constants';
import { STATUSES, type Application, type Status } from '@/lib/types';
import { cn, formatSalary, formatShortDate } from '@/lib/utils';

export function KanbanBoard({ applications, columns = STATUSES }: { applications: Application[]; columns?: readonly Status[] }) {
  const { updateStatus } = useApplications();
  const { openCreate } = useApplicationModal();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, [] as Application[]])) as Record<Status, Application[]>;
    for (const a of applications) map[a.status].push(a);
    for (const s of STATUSES) map[s].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return map;
  }, [applications]);

  const onDrop = (e: DragEvent, status: Status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setOverColumn(null);
    setDragId(null);
    if (id) updateStatus(id, status);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex snap-x snap-mandatory gap-4 sm:snap-none">
        {columns.map((status) => {
          const meta = STATUS_META[status];
          const items = grouped[status];
          const isOver = overColumn === status;
          return (
            <section
              key={status}
              aria-label={`${meta.label} column`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overColumn !== status) setOverColumn(status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverColumn(null);
              }}
              onDrop={(e) => onDrop(e, status)}
              className={cn(
                'flex w-[85vw] max-w-[20rem] shrink-0 snap-start flex-col rounded-xl p-2 transition sm:w-72',
                meta.column,
                isOver && 'ring-2 ring-inset ring-indigo-400',
              )}
            >
              <header className="flex items-center justify-between px-2 pb-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden />
                  <h2 className="text-sm font-semibold text-slate-800">{meta.label}</h2>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {items.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-icon h-7 w-7"
                  onClick={() => openCreate({ status })}
                  aria-label={`Add application to ${meta.label}`}
                  title={`Add to ${meta.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </header>

              <div className="flex min-h-[8rem] flex-1 flex-col gap-2">
                {items.map((a) => (
                  <KanbanCard
                    key={a.id}
                    app={a}
                    dragging={dragId === a.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', a.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDragId(a.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverColumn(null);
                    }}
                    onMove={(s) => updateStatus(a.id, s)}
                  />
                ))}
                {items.length === 0 && (
                  <div
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-lg border-2 border-dashed px-3 py-8 text-center text-xs text-slate-400',
                      isOver ? 'border-indigo-300 text-indigo-500' : 'border-slate-200',
                    )}
                  >
                    {dragId ? 'Drop here' : 'No applications'}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  app,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  app: Application;
  dragging: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onMove: (status: Status) => void;
}) {
  const { openEdit } = useApplicationModal();
  const index = STATUSES.indexOf(app.status);
  const prev = index > 0 ? STATUSES[index - 1] : null;
  const next = index < STATUSES.length - 1 ? STATUSES[index + 1] : null;
  const salary = formatSalary(app.salaryMin, app.salaryMax, app.currency);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => openEdit(app.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) openEdit(app.id);
      }}
      tabIndex={0}
      aria-label={`${app.company}, ${app.role}`}
      className={cn(
        'group cursor-pointer rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        dragging && 'rotate-1 opacity-50',
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyAvatar name={app.company} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{app.company}</h3>
          <p className="line-clamp-2 text-sm leading-snug text-slate-600">{app.role}</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <WorkModeBadge mode={app.workMode} />
        {salary && <span className="text-xs font-medium text-slate-600">{salary}</span>}
      </div>

      {app.followUpDate && (
        <div className="mt-2">
          <FollowUpTag date={app.followUpDate} compact />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-xs text-slate-400">
          {app.status === 'wishlist' ? 'Saved' : 'Applied'} {formatShortDate(app.dateApplied)}
          {app.interviewNotes.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-0.5" title={`${app.interviewNotes.length} interview notes`}>
              <MessageSquare className="h-3 w-3" aria-hidden />
              {app.interviewNotes.length}
            </span>
          )}
        </span>
        <div
          className="flex gap-0.5 transition md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn-icon h-7 w-7 disabled:invisible"
            disabled={!prev}
            onClick={() => prev && onMove(prev)}
            aria-label={prev ? `Move to ${STATUS_META[prev].label}` : undefined}
            title={prev ? `Move to ${STATUS_META[prev].label}` : undefined}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-icon h-7 w-7 disabled:invisible"
            disabled={!next}
            onClick={() => next && onMove(next)}
            aria-label={next ? `Move to ${STATUS_META[next].label}` : undefined}
            title={next ? `Move to ${STATUS_META[next].label}` : undefined}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
