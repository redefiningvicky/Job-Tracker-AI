'use client';

import { QrCode as QrIcon } from 'lucide-react';
import { forwardRef, useMemo } from 'react';
import { makeQr } from '@/lib/cloud-sync';

/** Client-side SVG QR code. */
export const QrCode = forwardRef<SVGSVGElement, { value: string; size?: number; label?: string }>(function QrCode({ value, size = 184, label = 'QR code' }, ref) {
  const qr = useMemo(() => makeQr(value), [value]);
  if (!qr) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 text-center ring-1 ring-inset ring-slate-200" style={{ width: size, height: size }}>
        <QrIcon className="h-6 w-6 text-slate-300" />
        <p className="text-xs text-slate-500">Snapshot too large for a QR code. Share the link, or turn on redaction to shrink it.</p>
      </div>
    );
  }
  const quiet = 4;
  const dim = qr.size + quiet * 2;
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${dim} ${dim}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges" className="rounded-xl bg-white">
      <rect width={dim} height={dim} fill="#ffffff" />
      <path d={qr.path} transform={`translate(${quiet} ${quiet})`} fill="#0f172a" />
    </svg>
  );
});
