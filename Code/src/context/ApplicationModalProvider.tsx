'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApplicationModal, type ModalState } from '@/components/applications/ApplicationModal';
import type { FormValues } from '@/lib/form';

interface ModalContextValue {
  isOpen: boolean;
  openCreate: (defaults?: Partial<FormValues>) => void;
  openEdit: (id: string) => void;
  close: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ApplicationModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ mode: 'closed' });
  // Bumped on every open so the form remounts with fresh initial values.
  const [session, setSession] = useState(0);

  const openCreate = useCallback((defaults?: Partial<FormValues>) => {
    setSession((s) => s + 1);
    setState({ mode: 'create', defaults });
  }, []);

  const openEdit = useCallback((id: string) => {
    setSession((s) => s + 1);
    setState({ mode: 'edit', id });
  }, []);

  const close = useCallback(() => setState({ mode: 'closed' }), []);

  const value = useMemo(
    () => ({ isOpen: state.mode !== 'closed', openCreate, openEdit, close }),
    [state.mode, openCreate, openEdit, close],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ApplicationModal state={state} session={session} onClose={close} />
    </ModalContext.Provider>
  );
}

export function useApplicationModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useApplicationModal must be used inside <ApplicationModalProvider>');
  return ctx;
}
