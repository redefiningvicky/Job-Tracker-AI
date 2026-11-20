import type { Metadata } from 'next';
import { BoardView } from '@/components/views/BoardView';

export const metadata: Metadata = { title: 'Board' };

export default function BoardPage() {
  return <BoardView />;
}
