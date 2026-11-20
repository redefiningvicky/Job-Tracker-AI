'use client';

import { Plus, SearchX, SquareKanban } from 'lucide-react';
import { useMemo } from 'react';
import { FilterBar } from '@/components/applications/FilterBar';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/ui/Layout';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { useApplications } from '@/context/ApplicationsProvider';
import { filterApplications } from '@/lib/stats';
import { STATUSES } from '@/lib/types';

export function BoardView() {
  const { applications, filters, loading, loadSampleData, resetFilters } = useApplications();
  const { openCreate } = useApplicationModal();
  const filtered = useMemo(() => filterApplications(applications, filters), [applications, filters]);
  // Status filters narrow the visible columns rather than emptying them.
  const columns = filters.statuses.length ? STATUSES.filter((s) => filters.statuses.includes(s)) : STATUSES;

  if (loading) return <PageSkeleton variant="board" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Board"
        description="Drag cards between columns, or use the arrows on each card to move it."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add application
          </button>
        }
      />
      {applications.length === 0 ? (
        <EmptyState
          icon={SquareKanban}
          title="Your board is empty"
          description="Add an application to see it move through your pipeline."
          actions={
            <>
              <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
                Add application
              </button>
              <button type="button" className="btn btn-secondary" onClick={loadSampleData}>
                Load sample data
              </button>
            </>
          }
        />
      ) : (
        <>
          <FilterBar total={applications.length} shown={filtered.length} />
          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matches"
              description="No applications match your current search and filters."
              actions={
                <button type="button" className="btn btn-secondary" onClick={resetFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <KanbanBoard applications={filtered} columns={columns} />
          )}
        </>
      )}
    </div>
  );
}
