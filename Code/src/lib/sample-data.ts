import type { Application, InterviewNote, Status, WorkMode } from './types';
import { toISODate, uid } from './utils';

interface Seed {
  company: string;
  role: string;
  path: Status[];
  workMode: WorkMode;
  appliedDaysAgo: number;
  location?: string;
  salary?: [number, number];
  followUpInDays?: number;
  notes?: string;
  interviewNotes?: Array<{ daysAgo: number; stage: Status | ''; content: string }>;
}

const SEEDS: Seed[] = [
  {
    company: 'Northwind Labs',
    role: 'Senior Frontend Engineer',
    path: ['applied', 'phone_screen', 'interview'],
    workMode: 'remote',
    appliedDaysAgo: 21,
    salary: [150000, 180000],
    followUpInDays: 2,
    notes: 'Design-system heavy role. Team uses React, TypeScript and Storybook.',
    interviewNotes: [
      { daysAgo: 14, stage: 'phone_screen', content: 'Recruiter call with Dana. Asked about team size and remote culture. Next: technical round.' },
      { daysAgo: 6, stage: 'interview', content: 'Live coding: built an accessible combobox. Went well; follow up on testing approach.' },
    ],
  },
  {
    company: 'Brightpath Health',
    role: 'Full Stack Developer',
    path: ['applied', 'phone_screen'],
    workMode: 'hybrid',
    appliedDaysAgo: 12,
    location: 'Boston, MA',
    salary: [120000, 140000],
    followUpInDays: 0,
    interviewNotes: [{ daysAgo: 3, stage: 'phone_screen', content: 'Intro call. They want Node + Postgres experience. Send portfolio link.' }],
  },
  {
    company: 'Lumen Analytics',
    role: 'Data Engineer',
    path: ['applied'],
    workMode: 'remote',
    appliedDaysAgo: 5,
    followUpInDays: 4,
  },
  {
    company: 'Cobalt Systems',
    role: 'Platform Engineer',
    path: ['applied', 'phone_screen', 'interview', 'offer'],
    workMode: 'onsite',
    appliedDaysAgo: 35,
    location: 'Austin, TX',
    salary: [165000, 185000],
    followUpInDays: 1,
    notes: 'Offer deadline is Friday. Negotiate sign-on bonus.',
    interviewNotes: [
      { daysAgo: 25, stage: 'phone_screen', content: 'Hiring manager screen — focus on Kubernetes and incident response.' },
      { daysAgo: 15, stage: 'interview', content: 'Onsite loop: system design (rate limiter), behavioral, pairing session.' },
      { daysAgo: 4, stage: 'offer', content: 'Verbal offer received. Written offer to follow.' },
    ],
  },
  {
    company: 'Fernhill Studio',
    role: 'UI Engineer',
    path: ['applied', 'phone_screen', 'rejected'],
    workMode: 'hybrid',
    appliedDaysAgo: 28,
    location: 'Portland, OR',
  },
  {
    company: 'Quantum Ledger',
    role: 'Software Engineer II',
    path: ['applied'],
    workMode: 'remote',
    appliedDaysAgo: 9,
    salary: [130000, 150000],
    followUpInDays: -2,
  },
  {
    company: 'Harbor & Pine',
    role: 'React Developer',
    path: ['wishlist'],
    workMode: 'remote',
    appliedDaysAgo: 1,
    notes: 'Referral possible through a former colleague.',
  },
  {
    company: 'Vertex Robotics',
    role: 'Frontend Engineer, Tooling',
    path: ['applied', 'interview'],
    workMode: 'onsite',
    appliedDaysAgo: 18,
    location: 'Pittsburgh, PA',
    salary: [140000, 160000],
  },
  {
    company: 'Bluebird Logistics',
    role: 'Software Engineer',
    path: ['applied', 'rejected'],
    workMode: 'hybrid',
    appliedDaysAgo: 40,
  },
  {
    company: 'Meridian Financial',
    role: 'Senior UI Developer',
    path: ['applied'],
    workMode: 'hybrid',
    appliedDaysAgo: 3,
    location: 'New York, NY',
    salary: [160000, 190000],
  },
  {
    company: 'Sola Energy',
    role: 'Web Platform Engineer',
    path: ['wishlist'],
    workMode: 'remote',
    appliedDaysAgo: 2,
  },
  {
    company: 'Pixelcraft Games',
    role: 'Tools Engineer',
    path: ['applied'],
    workMode: 'remote',
    appliedDaysAgo: 50,
  },
  {
    company: 'Atlas Cloudworks',
    role: 'Staff Frontend Engineer',
    path: ['applied', 'phone_screen'],
    workMode: 'remote',
    appliedDaysAgo: 7,
    salary: [190000, 220000],
    followUpInDays: 5,
  },
  {
    company: 'Greenleaf Commerce',
    role: 'Frontend Developer',
    path: ['applied'],
    workMode: 'onsite',
    appliedDaysAgo: 14,
    location: 'Chicago, IL',
  },
];

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

export function sampleApplications(): Application[] {
  return SEEDS.map((s) => {
    const steps = s.path.length;
    const span = Math.max(s.appliedDaysAgo - 1, 0);
    const statusHistory = s.path.map((status, i) => ({
      status,
      date: daysFromNow(-(s.appliedDaysAgo - Math.round((span * i) / Math.max(steps - 1, 1)))).toISOString(),
    }));
    const interviewNotes: InterviewNote[] = (s.interviewNotes ?? []).map((n) => ({
      id: uid(),
      date: toISODate(daysFromNow(-n.daysAgo)),
      stage: n.stage,
      content: n.content,
    }));
    const createdAt = statusHistory[0].date;
    return {
      id: uid(),
      company: s.company,
      role: s.role,
      status: s.path[s.path.length - 1],
      workMode: s.workMode,
      dateApplied: toISODate(daysFromNow(-s.appliedDaysAgo)),
      location: s.location,
      salaryMin: s.salary?.[0],
      salaryMax: s.salary?.[1],
      currency: 'USD',
      url: `https://example.com/careers/${s.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      notes: s.notes,
      followUpDate: s.followUpInDays != null ? toISODate(daysFromNow(s.followUpInDays)) : undefined,
      interviewNotes,
      statusHistory,
      createdAt,
      updatedAt: statusHistory[statusHistory.length - 1].date,
    };
  });
}
