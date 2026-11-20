'use client';

import { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApplications } from '@/context/ApplicationsProvider';
import { emptyForm, fromApplication, toInput, type FormValues } from '@/lib/form';
import { ApplicationForm } from './ApplicationForm';

export type ModalState =
  | { mode: 'closed' }
  | { mode: 'create'; defaults?: Partial<FormValues> }
  | { mode: 'edit'; id: string };

export function ApplicationModal({
  state,
  session,
  onClose,
}: {
  state: ModalState;
  session: number;
  onClose: () => void;
}) {
  const { getById, addApplication, updateApplication, deleteApplication } = useApplications();
  const app = state.mode === 'edit' ? getById(state.id) : undefined;

  // The record was deleted elsewhere (e.g. another tab) while open.
  useEffect(() => {
    if (state.mode === 'edit' && !app) onClose();
  }, [state.mode, app, onClose]);

  const isEdit = state.mode === 'edit' && !!app;
  const open = state.mode === 'create' || isEdit;
  const initial = isEdit ? fromApplication(app) : emptyForm(state.mode === 'create' ? state.defaults : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit application' : 'New application'}
      description={isEdit ? `${app.role} at ${app.company}` : 'Track a new opportunity in your pipeline.'}
    >
      <ApplicationForm
        key={session}
        initial={initial}
        isEdit={isEdit}
        meta={app ? { createdAt: app.createdAt, updatedAt: app.updatedAt, history: app.statusHistory } : undefined}
        onCancel={onClose}
        onSubmit={(values) => {
          const input = toInput(values);
          if (isEdit) updateApplication(app.id, input);
          else addApplication(input);
          onClose();
        }}
        onDelete={
          isEdit
            ? () => {
                deleteApplication(app.id);
                onClose();
              }
            : undefined
        }
      />
    </Modal>
  );
}
