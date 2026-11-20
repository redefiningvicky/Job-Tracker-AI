'use client';

import { Briefcase, Plus, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import {
  FollowUps,
  PipelineFunnel,
  RecentActivity,
  StatusBreakdown,
  SummaryCards,
  WeeklyActivity,
} from '@/components/dashboard/DashboardWidgets';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/ui/Layout';
import { useApplicationModal } from '@/context/ApplicationModalProvider';
import { useApplications } from '@/context/ApplicationsProvider';
import { computeStats, upcomingFollowUps, weeklyActivity } from '@/lib/stats';

export function DashboardView() {
  const { applications, loading, loadSampleData } = useApplications();
  const { openCreate } = useApplicationModal();

  const stats = useMemo(() => computeStats(applications), [applications]);
  const weeks = useMemo(() => weeklyActivity(applications), [applications]);
  const followUps = useMemo(() => upcomingFollowUps(applications), [applications]);
  const recent = useMemo(
    () => [...applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [applications],
  );

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your job search at a glance."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add application
          </button>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Start tracking your job search"
          description="Add the roles you've applied to — or want to — and watch your pipeline, response rate and offers come together here."
          actions={
            <>
              <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
                <Plus className="h-4 w-4" />
                Add your first application
              </button>
              <button type="button" className="btn btn-secondary" onClick={loadSampleData}>
                <Sparkles className="h-4 w-4" />
                Load sample data
              </button>
            </>
          }
        />
      ) : (
        <>
          <SummaryCards stats={stats} />
          <div className="grid gap-6 lg:grid-cols-3">
            <PipelineFunnel funnel={stats.funnel} className="lg:col-span-2" />
            <StatusBreakdown stats={stats} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <WeeklyActivity weeks={weeks} />
            <FollowUps items={followUps} />
            <RecentActivity items={recent} />
          </div>
        </>
      )}
    </div>
  );
}
