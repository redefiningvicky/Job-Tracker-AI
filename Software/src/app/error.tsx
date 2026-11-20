'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
        <TriangleAlert className="h-6 w-6 text-rose-600" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-slate-500">
        An unexpected error occurred. Your saved applications are safe in browser storage.
      </p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
