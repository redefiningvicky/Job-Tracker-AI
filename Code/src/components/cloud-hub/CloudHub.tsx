'use client';

import { CalendarClock, Cloud, FlaskConical, History, Plug, Share2, X, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useCloudHub, type HubTab } from '@/context/CloudHubProvider';
import { cn } from '@/lib/utils';
import { ActivityTab } from './ActivityTab';
import { IntegrationsTab } from './IntegrationsTab';
import { SchedulesTab } from './SchedulesTab';
import { ShareTab } from './ShareTab';

export function CloudHub() {
  const titleId = useId();
  const { isOpen, closeHub, tab, setTab, hub, jobs } = useCloudHub();

  const connected = Object.keys(hub.connections).length;
  const scheduled = hub.schedules.filter((s) => s.enabled).length;
  const failed = hub.activity.filter((a) => a.status === 'failed' && Date.now() - new Date(a.at).getTime() < 86_400_000).length;
  const syncing = Object.keys(jobs).length > 0;

  const TABS: Array<{ id: HubTab; label: string; icon: LucideIcon; badge?: string | number; dot?: boolean }> = [
    { id: 'share', label: 'Share & Link', icon: Share2 },
    { id: 'integrations', label: 'Cloud Integrations', icon: Plug, badge: connected || undefined, dot: syncing },
    { id: 'schedules', label: 'Scheduled Digests', icon: CalendarClock, badge: scheduled || undefined },
    { id: 'activity', label: 'Activity Log', icon: History, badge: failed ? `${failed}!` : undefined },
  ];

  return (
    <Drawer open={isOpen} onClose={closeHub} labelledBy={titleId} className="max-w-[76rem]">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
          <Cloud className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            Sync & Share Hub
          </h2>
          <p className="truncate text-xs text-slate-500">Keep coaches, mentors and your tools in the loop.</p>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 md:inline-flex" title="Cloud services and email delivery are simulated in your browser. Share links, QR codes, downloads and mail drafts are real.">
          <FlaskConical className="h-3 w-3" />
          Demo mode · cloud services simulated
        </span>
        <button type="button" className="btn-icon" onClick={closeHub} aria-label="Close hub">
          <X className="h-5 w-5" />
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 sm:px-5" role="tablist" aria-label="Hub sections">
        {TABS.map(({ id, label, icon: Icon, badge, dot }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition',
              tab === id ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge != null && (
              <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', String(badge).endsWith('!') ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}>
                {String(badge).replace('!', '')}
              </span>
            )}
            {dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" aria-label="Syncing" />}
            {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600" />}
          </button>
        ))}
      </nav>

      <p className="flex items-center gap-1.5 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-900 md:hidden">
        <FlaskConical className="h-3 w-3" /> Demo mode: cloud services & email delivery are simulated.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {tab === 'share' && <ShareTab />}
        {tab === 'integrations' && <IntegrationsTab />}
        {tab === 'schedules' && <SchedulesTab />}
        {tab === 'activity' && <ActivityTab />}
      </div>
    </Drawer>
  );
}
