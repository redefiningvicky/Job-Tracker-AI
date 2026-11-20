import type { Metadata } from 'next';
import { ListView } from '@/components/views/ListView';

export const metadata: Metadata = { title: 'Applications' };

export default function ListPage() {
  return <ListView />;
}
