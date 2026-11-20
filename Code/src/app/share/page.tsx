import type { Metadata } from 'next';
import { SnapshotViewer } from '@/components/cloud-hub/SnapshotViewer';

export const metadata: Metadata = {
  title: 'Shared snapshot',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function SharePage() {
  return <SnapshotViewer />;
}
