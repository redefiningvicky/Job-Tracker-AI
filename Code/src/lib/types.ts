export const STATUSES = [
  'wishlist',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'rejected',
] as const;
export type Status = (typeof STATUSES)[number];

export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export interface InterviewNote {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  stage: Status | '';
  content: string;
}

export interface StatusChange {
  status: Status;
  /** ISO timestamp */
  date: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: Status;
  workMode: WorkMode;
  /** YYYY-MM-DD */
  dateApplied: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  url?: string;
  notes?: string;
  /** YYYY-MM-DD */
  followUpDate?: string;
  interviewNotes: InterviewNote[];
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export type ApplicationInput = Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>;

export interface Filters {
  search: string;
  statuses: Status[];
  workModes: WorkMode[];
  /** YYYY-MM-DD, inclusive */
  dateFrom: string;
  /** YYYY-MM-DD, inclusive */
  dateTo: string;
}
