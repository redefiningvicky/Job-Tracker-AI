'use client';

import { ExternalLink, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/Badges';
import { CURRENCIES, STATUS_META, WORK_MODE_META } from '@/lib/constants';
import { isValidUrl, normalizeUrl, validateForm, type FormValues, type NoteDraft } from '@/lib/form';
import { STATUSES, WORK_MODES, type InterviewNote, type Status, type StatusChange } from '@/lib/types';
import { addDays, cn, formatDate, timeAgo, todayISO, uid } from '@/lib/utils';

const FIELD_ORDER: (keyof FormValues)[] = [
  'company',
  'role',
  'status',
  'workMode',
  'dateApplied',
  'location',
  'salaryMin',
  'salaryMax',
  'url',
  'followUpDate',
  'notes',
];

interface Props {
  initial: FormValues;
  isEdit: boolean;
  meta?: { createdAt: string; updatedAt: string; history: StatusChange[] };
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const defaultStageFor = (s: Status): Status | '' =>
  s === 'phone_screen' || s === 'interview' || s === 'offer' ? s : '';

export function ApplicationForm({ initial, isEdit, meta, onSubmit, onCancel, onDelete }: Props) {
  const [values, setValues] = useState<FormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({
    date: todayISO(),
    stage: defaultStageFor(initial.status),
    content: '',
  });

  const errors = useMemo(() => validateForm(values), [values]);
  const errorFor = (k: keyof FormValues) => (submitted || touched[k] ? errors[k] : undefined);
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const touch = (key: keyof FormValues) => () => setTouched((t) => ({ ...t, [key]: true }));

  const inputProps = (key: keyof FormValues) => ({
    id: `field-${key}`,
    'aria-invalid': !!errorFor(key) || undefined,
    'aria-describedby': errorFor(key) ? `field-${key}-error` : undefined,
    onBlur: touch(key),
  });

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((k) => errors[k]);
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }
    // Don't silently drop a note the user typed but didn't add.
    const content = noteDraft.content.trim();
    const date = noteDraft.date || todayISO();
    let interviewNotes = values.interviewNotes;
    if (content && noteDraft.editingId) {
      interviewNotes = interviewNotes.map((n) =>
        n.id === noteDraft.editingId ? { ...n, date, stage: noteDraft.stage, content } : n,
      );
    } else if (content) {
      interviewNotes = [...interviewNotes, { id: uid(), date, stage: noteDraft.stage, content }];
    }
    onSubmit({ ...values, interviewNotes });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const normalizedUrl = normalizeUrl(values.url);
  const urlIsValid = !!values.url.trim() && isValidUrl(normalizedUrl);
  const cls = (key: keyof FormValues) => cn('input', errorFor(key) && 'input-error');

  return (
    <form onSubmit={handleSubmit} onKeyDown={onKeyDown} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6">
        <Section title="Role details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="field-company" label="Company" required error={errorFor('company')}>
              <input
                {...inputProps('company')}
                className={cls('company')}
                value={values.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="e.g. Northwind Labs"
                autoComplete="organization"
                autoFocus={!isEdit}
                maxLength={120}
              />
            </Field>
            <Field id="field-role" label="Role title" required error={errorFor('role')}>
              <input
                {...inputProps('role')}
                className={cls('role')}
                value={values.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                maxLength={140}
              />
            </Field>
            <Field id="field-status" label="Status" required error={errorFor('status')}>
              <select
                {...inputProps('status')}
                className={cls('status')}
                value={values.status}
                onChange={(e) => {
                  const status = e.target.value as Status;
                  set('status', status);
                  if (!noteDraft.content) setNoteDraft((d) => ({ ...d, stage: defaultStageFor(status) }));
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="field-dateApplied"
              label={values.status === 'wishlist' ? 'Date saved' : 'Date applied'}
              required
              error={errorFor('dateApplied')}
            >
              <input
                {...inputProps('dateApplied')}
                type="date"
                className={cls('dateApplied')}
                value={values.dateApplied}
                max={values.status === 'wishlist' ? undefined : todayISO()}
                onChange={(e) => set('dateApplied', e.target.value)}
              />
            </Field>
            <Field id="field-workMode" label="Work mode" error={errorFor('workMode')}>
              <div role="radiogroup" aria-label="Work mode" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {WORK_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    id={m === values.workMode ? 'field-workMode' : undefined}
                    aria-checked={values.workMode === m}
                    onClick={() => set('workMode', m)}
                    className={cn(
                      'rounded-md px-2 py-1.5 text-sm font-medium transition',
                      values.workMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {WORK_MODE_META[m].label}
                  </button>
                ))}
              </div>
            </Field>
            <Field id="field-location" label="Location" hint="Optional">
              <input
                {...inputProps('location')}
                className="input"
                value={values.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder={values.workMode === 'remote' ? 'e.g. US / Remote' : 'e.g. Austin, TX'}
              />
            </Field>
          </div>
        </Section>

        <Section title="Compensation" subtitle="Optional — annual range. Shorthand like 120k works.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_7rem]">
            <Field id="field-salaryMin" label="Minimum" error={errorFor('salaryMin')}>
              <input
                {...inputProps('salaryMin')}
                inputMode="decimal"
                className={cls('salaryMin')}
                value={values.salaryMin}
                onChange={(e) => set('salaryMin', e.target.value)}
                placeholder="90k"
              />
            </Field>
            <Field id="field-salaryMax" label="Maximum" error={errorFor('salaryMax')}>
              <input
                {...inputProps('salaryMax')}
                inputMode="decimal"
                className={cls('salaryMax')}
                value={values.salaryMax}
                onChange={(e) => set('salaryMax', e.target.value)}
                placeholder="120k"
              />
            </Field>
            <Field id="field-currency" label="Currency" className="col-span-2 sm:col-span-1">
              <select
                id="field-currency"
                className="input"
                value={values.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {(CURRENCIES.includes(values.currency) ? CURRENCIES : [values.currency, ...CURRENCIES]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Tracking">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="field-url" label="Job posting URL" error={errorFor('url')} className="sm:col-span-2">
              <div className="flex gap-2">
                <input
                  {...inputProps('url')}
                  type="url"
                  inputMode="url"
                  className={cls('url')}
                  value={values.url}
                  onChange={(e) => set('url', e.target.value)}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, url: true }));
                    if (values.url.trim()) set('url', normalizedUrl);
                  }}
                  placeholder="https://company.com/careers/role"
                />
                {urlIsValid && (
                  <a
                    href={normalizedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn shrink-0 px-3"
                    aria-label="Open job posting in a new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </Field>
            <Field id="field-followUpDate" label="Follow-up reminder" error={errorFor('followUpDate')} className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  {...inputProps('followUpDate')}
                  type="date"
                  className={cn(cls('followUpDate'), 'w-auto min-w-[10.5rem] flex-1 sm:flex-none')}
                  value={values.followUpDate}
                  onChange={(e) => set('followUpDate', e.target.value)}
                />
                {[
                  ['+3 days', 3],
                  ['+1 week', 7],
                  ['+2 weeks', 14],
                ].map(([label, days]) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    onClick={() => set('followUpDate', addDays(todayISO(), days as number))}
                  >
                    {label}
                  </button>
                ))}
                {values.followUpDate && (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                    onClick={() => set('followUpDate', '')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </Field>
            <Field
              id="field-notes"
              label="Notes"
              error={errorFor('notes')}
              hint={`${values.notes.length.toLocaleString()} / 5,000`}
              className="sm:col-span-2"
            >
              <textarea
                {...inputProps('notes')}
                rows={3}
                className={cn(cls('notes'), 'resize-y')}
                value={values.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Referral, recruiter contact, tech stack, why you're excited…"
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Interview notes"
          subtitle="Log each conversation — who you met, what was asked, next steps."
          icon={<MessageSquare className="h-4 w-4 text-slate-400" />}
        >
          <InterviewNotesEditor
            notes={values.interviewNotes}
            onChange={(notes) => set('interviewNotes', notes)}
            draft={noteDraft}
            onDraftChange={setNoteDraft}
            defaultStage={defaultStageFor(values.status)}
          />
        </Section>

        {meta && (
          <Section title="Status history">
            <ol className="space-y-2">
              {[...meta.history].reverse().map((h, i) => (
                <li key={`${h.date}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                  <StatusBadge status={h.status} />
                  <span className="text-xs text-slate-500">
                    {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-400">
              Created {timeAgo(meta.createdAt)} · Last updated {timeAgo(meta.updatedAt)}
            </p>
          </Section>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
        <div>
          {onDelete &&
            (confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-slate-600 sm:inline">Delete?</span>
                <button type="button" className="btn btn-danger" onClick={onDelete}>
                  Delete
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2 hidden text-xs text-slate-400 lg:inline">Ctrl + Enter to save</span>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save changes' : 'Add application'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function InterviewNotesEditor({
  notes,
  onChange,
  draft,
  onDraftChange,
  defaultStage,
}: {
  notes: InterviewNote[];
  onChange: (notes: InterviewNote[]) => void;
  draft: NoteDraft;
  onDraftChange: (draft: NoteDraft) => void;
  defaultStage: Status | '';
}) {
  const editingId = draft.editingId ?? null;
  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));

  const reset = () => {
    onDraftChange({ date: todayISO(), stage: defaultStage, content: '', editingId: null });
  };

  const save = () => {
    const content = draft.content.trim();
    if (!content) return;
    const date = draft.date || todayISO();
    if (editingId) {
      onChange(notes.map((n) => (n.id === editingId ? { ...n, date, stage: draft.stage, content } : n)));
    } else {
      onChange([...notes, { id: uid(), date, stage: draft.stage, content }]);
    }
    reset();
  };

  const stopEnter = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  return (
    <div className="space-y-3">
      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((n) => (
            <li
              key={n.id}
              className={cn(
                'group rounded-lg border border-slate-200 bg-slate-50/60 p-3',
                editingId === n.id && 'border-indigo-300 bg-indigo-50/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">{formatDate(n.date)}</span>
                  {n.stage && <StatusBadge status={n.stage} />}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-icon h-7 w-7"
                    aria-label="Edit note"
                    onClick={() => {
                      onDraftChange({ date: n.date, stage: n.stage, content: n.content, editingId: n.id });
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon h-7 w-7 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Delete note"
                    onClick={() => {
                      onChange(notes.filter((x) => x.id !== n.id));
                      if (editingId === n.id) reset();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{n.content}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-slate-300 p-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            aria-label="Note date"
            className="input"
            value={draft.date}
            onKeyDown={stopEnter}
            onChange={(e) => onDraftChange({ ...draft, date: e.target.value })}
          />
          <select
            aria-label="Interview stage"
            className="input"
            value={draft.stage}
            onKeyDown={stopEnter}
            onChange={(e) => onDraftChange({ ...draft, stage: e.target.value as Status | '' })}
          >
            <option value="">General note</option>
            {STATUSES.filter((s) => s !== 'wishlist').map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          aria-label="Interview note"
          rows={2}
          className="input mt-2 resize-y"
          placeholder="e.g. Met with the hiring manager — asked about system design. Next round Thursday."
          value={draft.content}
          onChange={(e) => onDraftChange({ ...draft, content: e.target.value })}
        />
        <div className="mt-2 flex justify-end gap-2">
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={save} disabled={!draft.content.trim()}>
            <Plus className="h-4 w-4" />
            {editingId ? 'Update note' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  );
}
