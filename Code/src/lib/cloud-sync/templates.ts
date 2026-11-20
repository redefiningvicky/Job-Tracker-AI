import { STATUS_META, WORK_MODE_META } from '@/lib/constants';
import { computeStats } from '@/lib/stats';
import type { Application, Status } from '@/lib/types';
import { addDays, daysFromToday, formatSalary, formatShortDate, pct, relativeDay, toISODate } from '@/lib/utils';
import type { DigestContent, DigestItem, DigestSection, TemplateId } from './types';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  audience: string;
  description: string;
  includes: string[];
  /** Whether private details are hidden by default. */
  defaultRedact: boolean;
}

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  'coach-digest': {
    id: 'coach-digest',
    name: 'Career Coach Weekly Digest',
    audience: 'Coach or accountability partner',
    description: 'Your active pipeline, upcoming interviews and follow-ups due.',
    includes: ['Weekly stats', 'Active pipeline', 'Upcoming interviews', 'Follow-ups due'],
    defaultRedact: true,
  },
  'mentor-share': {
    id: 'mentor-share',
    name: 'Mentor / Network Share',
    audience: 'Mentors, peers and referrers',
    description: 'A clean company & role list. Salary targets and private notes are redacted.',
    includes: ['Interviewing', 'Applied', 'On my radar'],
    defaultRedact: true,
  },
  'full-archive': {
    id: 'full-archive',
    name: 'Full Job Hunt Archive',
    audience: 'You — or a trusted backup',
    description: 'Every application across all stages, including notes.',
    includes: ['All six stages', 'Salary', 'Notes & interview notes'],
    defaultRedact: false,
  },
};

export const TEMPLATE_ORDER: TemplateId[] = ['coach-digest', 'mentor-share', 'full-archive'];

/** Fields hidden when privacy redaction is on. */
export const REDACTED_FIELDS = ['Salary targets', 'Notes', 'Interview notes', 'Follow-up dates', 'Job links'];

const STAGE_RANK: Record<Status, number> = { offer: 0, interview: 1, phone_screen: 2, applied: 3, wishlist: 4, rejected: 5 };

const firstName = (name: string) => name.trim().split(/\s+/)[0] || '';

interface BuildOptions {
  owner: string;
  redact: boolean;
  note?: string;
  now?: Date;
}

function baseItem(a: Application, redact: boolean): DigestItem {
  const parts = [WORK_MODE_META[a.workMode].label, a.location].filter(Boolean) as string[];
  const salary = formatSalary(a.salaryMin, a.salaryMax, a.currency);
  if (!redact && salary) parts.push(salary);
  return { company: a.company, role: a.role, status: a.status, meta: parts.join(' · ') };
}

function sinceUpdate(a: Application, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(a.updatedAt).getTime()) / 86_400_000));
  return days === 0 ? 'updated today' : `updated ${days}d ago`;
}

export function buildDigest(apps: Application[], template: TemplateId, opts: BuildOptions): DigestContent {
  const now = opts.now ?? new Date();
  const today = toISODate(now);
  const weekAgo = addDays(today, -6);
  const weekAhead = addDays(today, 7);
  const owner = opts.owner.trim() || 'A JobTrack user';
  const who = firstName(opts.owner);
  const redact = opts.redact;
  const stats = computeStats(apps);
  const meta = TEMPLATES[template];

  let sections: DigestSection[] = [];
  let digestStats: DigestContent['stats'] = [];
  let intro = '';
  let subject = '';
  let recordCount = 0;

  if (template === 'coach-digest') {
    const appliedThisWeek = apps.filter((a) => a.status !== 'wishlist' && a.dateApplied >= weekAgo && a.dateApplied <= today).length;
    const active = apps
      .filter((a) => a.status === 'phone_screen' || a.status === 'interview' || a.status === 'offer')
      .sort((a, b) => STAGE_RANK[a.status] - STAGE_RANK[b.status] || b.updatedAt.localeCompare(a.updatedAt));
    const upcoming = apps
      .filter((a) => (a.status === 'phone_screen' || a.status === 'interview') && a.followUpDate && a.followUpDate >= today && a.followUpDate <= weekAhead)
      .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));
    const due = apps
      .filter((a) => a.status !== 'rejected' && a.status !== 'offer' && a.followUpDate && a.followUpDate <= today)
      .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));

    digestStats = [
      { label: 'Applied this week', value: String(appliedThisWeek) },
      { label: 'Active processes', value: String(stats.active) },
      { label: 'Response rate', value: pct(stats.responseRate) },
      { label: 'Offers', value: String(stats.offers) },
    ];
    sections = [
      {
        id: 'active',
        title: 'Active pipeline',
        subtitle: 'Screens, interviews and offers in motion',
        empty: 'No active processes right now — focus is on new applications.',
        items: active.map((a) => ({ ...baseItem(a, redact), meta: `${STATUS_META[a.status].label} · ${sinceUpdate(a, now)}` })),
      },
      {
        id: 'upcoming',
        title: 'Upcoming interviews',
        subtitle: 'Interview-stage touchpoints in the next 7 days',
        empty: 'Nothing scheduled in the next 7 days.',
        items: upcoming.map((a) => ({
          ...baseItem(a, redact),
          meta: redact ? `${STATUS_META[a.status].label} · this week` : `${relativeDay(a.followUpDate)} · ${formatShortDate(a.followUpDate)}`,
          tone: 'success',
        })),
      },
      {
        id: 'due',
        title: 'Follow-ups due',
        subtitle: 'Overdue or due today',
        empty: 'All caught up — no follow-ups due.',
        items: due.map((a) => {
          const d = daysFromToday(a.followUpDate) ?? 0;
          return {
            ...baseItem(a, redact),
            meta: redact ? (d < 0 ? 'Overdue' : 'Due today') : d < 0 ? `Overdue by ${-d} day${d === -1 ? '' : 's'}` : 'Due today',
            tone: d < 0 ? 'danger' : 'warning',
          } satisfies DigestItem;
        }),
      },
    ];
    recordCount = new Set([...active, ...upcoming, ...due].map((a) => a.id)).size;
    subject = `${who ? `${who}'s` : 'Weekly'} job search digest — ${stats.active} active, ${due.length} follow-up${due.length === 1 ? '' : 's'} due`;
    intro = `Here's where ${who || 'the'} search stands this week: ${appliedThisWeek} new application${appliedThisWeek === 1 ? '' : 's'}, ${stats.active} active process${stats.active === 1 ? '' : 'es'} and ${stats.offers} offer${stats.offers === 1 ? '' : 's'} on the table.`;
  } else if (template === 'mentor-share') {
    const pick = (statuses: Status[]) =>
      apps
        .filter((a) => statuses.includes(a.status))
        .sort((a, b) => STAGE_RANK[a.status] - STAGE_RANK[b.status] || a.company.localeCompare(b.company))
        .map((a) => baseItem(a, redact));
    sections = [
      { id: 'interviewing', title: 'Currently interviewing', empty: 'No interviews in progress yet.', items: pick(['offer', 'interview', 'phone_screen']) },
      { id: 'applied', title: 'Applied — awaiting response', subtitle: 'Know someone here? A referral helps.', empty: 'No pending applications.', items: pick(['applied']) },
      { id: 'radar', title: 'On my radar', subtitle: 'Roles I plan to apply for', empty: 'Wishlist is empty.', items: pick(['wishlist']) },
    ];
    recordCount = sections.reduce((n, s) => n + s.items.length, 0);
    digestStats = [
      { label: 'Companies', value: String(recordCount) },
      { label: 'Interviewing', value: String(sections[0].items.length) },
      { label: 'Remote-friendly', value: String(apps.filter((a) => a.status !== 'rejected' && a.workMode !== 'onsite').length) },
    ];
    subject = `${who ? `${who}'s` : 'My'} job search — where I'm applying`;
    intro = `Thanks for helping with ${who ? `${who}'s` : 'my'} search! Below are the companies and roles in play. If you know anyone at these teams, an introduction would mean a lot.`;
  } else {
    const order: Status[] = ['offer', 'interview', 'phone_screen', 'applied', 'wishlist', 'rejected'];
    sections = order.map((s) => ({
      id: s,
      title: STATUS_META[s].label,
      empty: 'None',
      items: apps
        .filter((a) => a.status === s)
        .sort((a, b) => b.dateApplied.localeCompare(a.dateApplied))
        .map((a) => {
          const item = baseItem(a, redact);
          item.meta = [item.meta, `applied ${formatShortDate(a.dateApplied)}`].filter(Boolean).join(' · ');
          if (!redact) {
            const notes = [a.notes, ...a.interviewNotes.map((n) => `${n.date}: ${n.content}`)].filter(Boolean);
            if (notes.length) item.note = notes.join('\n');
          }
          return item;
        }),
    }));
    recordCount = apps.length;
    digestStats = [
      { label: 'Applications', value: String(stats.applied) },
      { label: 'Response rate', value: pct(stats.responseRate) },
      { label: 'Interview rate', value: pct(stats.interviewRate) },
      { label: 'Offers', value: String(stats.offers) },
    ];
    subject = `Job hunt archive — ${apps.length} applications as of ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    intro = `A complete snapshot of ${who ? `${who}'s` : 'the'} job search across every stage${redact ? ', with private details redacted' : ', including notes'}.`;
  }

  return {
    template,
    title: meta.name,
    subject,
    preheader: digestStats.map((s) => `${s.label}: ${s.value}`).join(' · '),
    intro,
    note: opts.note?.trim() || undefined,
    owner,
    stats: digestStats,
    sections,
    recordCount,
    redacted: redact,
    generatedAt: now.toISOString(),
  };
}

export function digestToPlainText(d: DigestContent): string {
  const lines: string[] = [d.subject, ''];
  if (d.note) lines.push(d.note, '');
  lines.push(d.intro, '', d.stats.map((s) => `${s.label}: ${s.value}`).join('  |  '), '');
  for (const s of d.sections) {
    lines.push(`== ${s.title} (${s.items.length}) ==`);
    if (!s.items.length) lines.push(`  ${s.empty}`);
    for (const i of s.items) lines.push(`  • ${i.company} — ${i.role}${i.meta ? ` (${i.meta})` : ''}`);
    lines.push('');
  }
  lines.push(`— Sent from JobTrack by ${d.owner}`);
  return lines.join('\n');
}

/** mailto: links have practical length limits (~2,000 chars in many clients). */
export function mailtoUrl(recipients: string[], subject: string, body: string): string {
  const max = 1800;
  const trimmed = body.length > max ? `${body.slice(0, max)}\n\n[…truncated — open the full digest in JobTrack]` : body;
  return `mailto:${recipients.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(trimmed)}`;
}
