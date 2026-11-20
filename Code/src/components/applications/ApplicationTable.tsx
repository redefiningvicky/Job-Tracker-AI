'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, MapPin, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompanyAvatar, FollowUpTag, StatusSelect, WorkModeBadge } from '@/components/ui/Badges';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { useApplications } from '@/context/ApplicationsProvider';
import { STATUSES, type Application } from '@/lib/types';
import { cn, formatDate, formatSalary, relativeDay } from '@/lib/utils';

type SortKey = 'company' | 'status' | 'dateApplied' | 'salary' | 'followUpDate' | 'updatedAt';
interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const salaryOf = (a: Application) => a.salaryMax ?? a.salaryMin ?? -1;

function compare(a: Application, b: Application, key: SortKey): number {
  switch (key) {
    case 'company':
      return a.company.localeCompare(b.company) || a.role.localeCompare(b.role);
    case 'status':
      return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    case 'dateApplied':
      return a.dateApplied.localeCompare(b.dateApplied);
    case 'salary':
      return salaryOf(a) - salaryOf(b);
    case 'followUpDate':
      return (a.followUpDate ?? '9999').localeCompare(b.followUpDate ?? '9999');
    case 'updatedAt':
      return a.updatedAt.localeCompare(b.updatedAt);
  }
}

export function ApplicationTable({ applications }: { applications: Application[] }) {
  const { updateStatus, deleteApplication } = useApplications();
  const { openEdit } = useApplicationModal();
  const [sort, setSort] = useState<SortState>({ key: 'dateApplied', dir: 'desc' });

  const sorted = useMemo(() => {
    const list = [...applications].sort((a, b) => compare(a, b, sort.key));
    return sort.dir === 'desc' ? list.reverse() : list;
  }, [applications, sort]);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'company' ? 'asc' : 'desc' }));

  const header = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th scope="col" className={cn('px-4 py-3 text-left', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={() => onSort(key)}
          className={cn('inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide', active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800')}
        >
          {label}
          <Icon className={cn('h-3.5 w-3.5', !active && 'opacity-40')} aria-hidden />
        </button>
      </th>
    );
  };

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                {header('company', 'Company / Role')}
                {header('status', 'Status')}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Work mode
                </th>
                {header('dateApplied', 'Applied')}
                {header('salary', 'Salary', 'hidden lg:table-cell')}
                {header('followUpDate', 'Follow-up', 'hidden xl:table-cell')}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sorted.map((a) => (
                <tr
                  key={a.id}
                  tabIndex={0}
                  onClick={() => openEdit(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) openEdit(a.id);
                  }}
                  className="group cursor-pointer transition hover:bg-slate-50 focus:bg-indigo-50/40 focus:outline-none"
                >
                  <td className="max-w-xs px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={a.company} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{a.company}</p>
                        <p className="truncate text-sm text-slate-500">{a.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect value={a.status} onChange={(s) => updateStatus(a.id, s)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <WorkModeBadge mode={a.workMode} />
                      {a.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {a.location}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <p className="text-slate-700">{formatDate(a.dateApplied)}</p>
                    <p className="text-xs text-slate-400">{relativeDay(a.dateApplied)}</p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-700 lg:table-cell">
                    {formatSalary(a.salaryMin, a.salaryMax, a.currency) || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 xl:table-cell">
                    {a.followUpDate ? <FollowUpTag date={a.followUpDate} compact /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions app={a} onEdit={() => openEdit(a.id)} onDelete={() => deleteApplication(a.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {sorted.map((a) => (
          <li key={a.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => openEdit(a.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) openEdit(a.id);
              }}
              className="card block w-full cursor-pointer p-4 text-left transition active:bg-slate-50"
            >
              <div className="flex items-start gap-3">
                <CompanyAvatar name={a.company} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{a.company}</p>
                  <p className="truncate text-sm text-slate-600">{a.role}</p>
                </div>
                <RowActions app={a} onEdit={() => openEdit(a.id)} onDelete={() => deleteApplication(a.id)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusSelect value={a.status} onChange={(s) => updateStatus(a.id, s)} />
                <WorkModeBadge mode={a.workMode} />
                {a.followUpDate && <FollowUpTag date={a.followUpDate} compact />}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Applied {formatDate(a.dateApplied)}</span>
                <span>{formatSalary(a.salaryMin, a.salaryMax, a.currency)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function RowActions({ app, onEdit, onDelete }: { app: Application; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {app.interviewNotes.length > 0 && (
        <span className="mr-1 hidden items-center gap-1 text-xs text-slate-400 sm:inline-flex" title={`${app.interviewNotes.length} interview notes`}>
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          {app.interviewNotes.length}
        </span>
      )}
      {app.url && (
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-icon"
          aria-label={`Open job posting for ${app.company}`}
          title="Open job posting"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <button type="button" className="btn-icon" onClick={onEdit} aria-label={`Edit ${app.company}`} title="Edit">
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="btn-icon hover:bg-rose-50 hover:text-rose-600"
        onClick={onDelete}
        aria-label={`Delete ${app.company}`}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
