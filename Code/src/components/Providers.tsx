'use client';

import type { ReactNode } from 'react';
import { ApplicationModalProvider } from '@/context/ApplicationModalProvider';
import { ApplicationsProvider } from '@/context/ApplicationsProvider';
import { CloudHubProvider } from '@/context/CloudHubProvider';
import { ToastProvider } from '@/context/ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ApplicationsProvider>
        <CloudHubProvider>
          <ApplicationModalProvider>{children}</ApplicationModalProvider>
        </CloudHubProvider>
      </ApplicationsProvider>
    </ToastProvider>
  );
}
