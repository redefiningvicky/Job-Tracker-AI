'use client';

import { List, Plus, SearchX, Share2 } from 'lucide-react';
import { useMemo } from 'react';
import { ApplicationTable } from '@/components/applications/ApplicationTable';
import { FilterBar } from '@/components/applications/FilterBar';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/ui/Layout';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { useApplications } from '@/context/ApplicationsProvider';
import { useCloudHub } from '@/context/CloudHubProvider';
import { filterApplications } from '@/lib/stats';

export function ListView() {
  const { applications, filters, loading, loadSampleData, resetFilters } = useApplications();
  const { openCreate } = useApplicationModal();
  const { openHub } = useCloudHub();
  const filtered = useMemo(() => filterApplications(applications, filters), [applications, filters]);

  if (loading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description="Every application in one place. Click a row to edit, or change status inline."
        actions={
          <>
            {applications.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => openHub('share')}>
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Add application
            </button>
          </>
        }
      />
      {applications.length === 0 ? (
        <EmptyState
          icon={List}
          title="No applications yet"
          description="Your applications will appear here in a sortable, filterable table."
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
            <ApplicationTable applications={filtered} />
          )}
        </>
      )}
    </div>
  );
}
