'use client';

import { Check, Copy, Download, ExternalLink, Info, Link2, LoaderCircle, Maximize2, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCloudHub } from '@/context/CloudHubProvider';
import { useToast } from '@/context/ToastProvider';
import { downloadFile } from '@/lib/backup';
import {
  EXPIRY_LABELS,
  TEMPLATES,
  describeExpiry,
  encodeSnapshot,
  expiryDate,
  shareUrl,
  type DigestContent,
  type Expiry,
} from '@/lib/cloud-sync';
import { cn, timeAgo } from '@/lib/utils';
import { copyText } from './clipboard';
import { QrCode } from './QrCode';
import { Panel, Segmented, useNow } from './shared';

export function LinkComposer({ digest }: { digest: DigestContent }) {
  const { hub, addLink, removeLink, log } = useCloudHub();
  const { toast } = useToast();
  const [expiry, setExpiry] = useState<Expiry>('7d');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; key: string; expiresAt: string | null } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isLocal, setIsLocal] = useState(false);
  const [zoom, setZoom] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);
  const now = useNow();

  useEffect(() => setIsLocal(['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)), []);

  // A link is a frozen snapshot — flag when the settings drift from it.
  const settingsKey = JSON.stringify([digest.template, digest.redacted, digest.owner, digest.recordCount, digest.sections.map((s) => s.items.length), expiry]);
  const stale = !!result && result.key !== settingsKey;

  const create = async () => {
    setBusy(true);
    try {
      const expiresAt = expiryDate(expiry);
      // Email-only fields aren't shown on the snapshot page — drop them to keep the link (and QR) small.
      const token = await encodeSnapshot({ v: 1, digest: { ...digest, subject: '', preheader: '' }, expiresAt });
      const url = shareUrl(window.location.origin, token);
      await new Promise((r) => setTimeout(r, 450));
      setResult({ url, key: settingsKey, expiresAt });
      addLink({ url, title: digest.title, template: digest.template, createdAt: new Date().toISOString(), expiresAt, redacted: digest.redacted, recordCount: digest.recordCount });
      log({
        type: 'share',
        status: 'success',
        title: `Snapshot link created — ${TEMPLATES[digest.template].name}`,
        detail: `${EXPIRY_LABELS[expiry] === 'Never' ? 'No expiry' : `Expires in ${EXPIRY_LABELS[expiry]}`} · ${digest.redacted ? 'private details redacted' : 'includes private details'}`,
        destination: 'link',
        recordCount: digest.recordCount,
        template: digest.template,
        link: url,
        expiresAt,
      });
      toast({ title: 'Share link ready', description: 'Copy it or scan the QR code.' });
    } catch {
      toast({ type: 'error', title: 'Couldn’t create link', description: 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, id: string) => {
    if (await copyText(text)) {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
      toast({ title: 'Link copied to clipboard' });
    } else {
      toast({ type: 'error', title: 'Copy failed', description: 'Select the link and copy it manually.' });
    }
  };

  const downloadQr = () => {
    if (!qrRef.current) return;
    downloadFile('jobtrack-share-qr.svg', new XMLSerializer().serializeToString(qrRef.current), 'image/svg+xml');
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Link expires after</span>
            <Segmented
              label="Expiration"
              value={expiry}
              onChange={setExpiry}
              options={(Object.keys(EXPIRY_LABELS) as Expiry[]).map((e) => ({ value: e, label: EXPIRY_LABELS[e] }))}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={create} disabled={busy || digest.recordCount === 0}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {busy ? 'Creating…' : result ? 'Create new link' : 'Create share link'}
          </button>
        </div>
        {digest.recordCount === 0 && <p className="mt-2 text-xs text-amber-700">This template has no applications to share yet.</p>}

        {result && (
          <div className="mt-5 grid animate-fade-in gap-5 border-t border-slate-100 pt-5 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="group relative rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300"
                aria-label="Enlarge QR code for scanning"
              >
                <QrCode ref={qrRef} value={result.url} size={200} label="QR code for the share link" />
                <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </button>
              <button type="button" className="text-xs font-medium text-indigo-600 hover:underline" onClick={downloadQr}>
                <Download className="mr-1 inline h-3 w-3" />
                Save QR (SVG)
              </button>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex gap-2">
                <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" className="input min-w-0 flex-1 font-mono text-xs" />
                <button type="button" className={cn('btn shrink-0', copied === 'main' ? 'bg-emerald-600 text-white' : 'btn-primary')} onClick={() => copy(result.url, 'main')}>
                  {copied === 'main' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'main' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{describeExpiry(result.expiresAt, now).label}</span>
                <span>{digest.redacted ? 'Private details redacted' : 'Includes private details'}</span>
                <span>{Math.ceil(result.url.length / 102.4) / 10} KB link</span>
              </div>
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <ExternalLink className="h-4 w-4" />
                Open snapshot
              </a>
              {stale && <p className="text-xs font-medium text-amber-700">Settings changed since this link was made — create a new link to include them.</p>}
              <p className="flex gap-1.5 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  The snapshot lives inside the link itself (after the #), so nothing is uploaded. Anyone with the link can view it until it expires; it can’t be recalled once sent.
                  {isLocal && ' This link points to localhost, so it only opens on this computer until JobTrack is deployed.'}
                </span>
              </p>
            </div>
          </div>
        )}
      </Panel>

      {zoom && result && (
        <div
          data-nested-dialog
          role="dialog"
          aria-modal="true"
          aria-label="QR code"
          className="fixed inset-0 z-[70] flex animate-fade-in flex-col items-center justify-center gap-4 bg-slate-950/80 p-6"
          onClick={() => setZoom(false)}
          onKeyDown={(e) => e.key === 'Escape' && setZoom(false)}
        >
          <div className="rounded-3xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <QrCode value={result.url} size={Math.min(440, typeof window !== 'undefined' ? window.innerWidth - 80 : 440)} label="Enlarged QR code for the share link" />
          </div>
          <p className="text-center text-sm text-white/80">Point a phone camera at the code · {digest.title}</p>
          <button type="button" autoFocus className="btn bg-white/10 text-white hover:bg-white/20" onClick={() => setZoom(false)}>
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      )}

      {hub.links.length > 0 && (
        <Panel title="Your shared links" description="Links you’ve created from this browser">
          <ul className="divide-y divide-slate-100">
            {hub.links.slice(0, 8).map((l) => {
              const exp = describeExpiry(l.expiresAt, now);
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', exp.expired ? 'bg-slate-300' : 'bg-emerald-500')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{l.title}</p>
                    <p className="text-xs text-slate-500">
                      {timeAgo(l.createdAt)} · {l.recordCount} records · <span className={exp.expired ? 'text-rose-600' : ''}>{exp.label}</span>
                    </p>
                  </div>
                  {!exp.expired && (
                    <button type="button" className="btn-icon" onClick={() => copy(l.url, l.id)} aria-label="Copy link" title="Copy link">
                      {copied === l.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                  <button type="button" className="btn-icon hover:text-rose-600" onClick={() => removeLink(l.id)} aria-label="Remove from list" title="Remove from list">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
