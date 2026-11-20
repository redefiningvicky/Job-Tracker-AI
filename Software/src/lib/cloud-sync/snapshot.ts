import type { DigestContent } from './types';

/**
 * Share links are self-contained: the snapshot is compressed into the URL
 * fragment (#s=…). Fragments are never sent to a server, so nothing is
 * uploaded — whoever has the link can view it, and expiry is enforced by the
 * viewer page.
 */
export interface Snapshot {
  v: 1;
  digest: DigestContent;
  expiresAt: string | null;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

const canCompress = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function encodeSnapshot(snapshot: Snapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(snapshot));
  if (canCompress()) return `z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw' as CompressionFormat)))}`;
  return `j${toBase64Url(json)}`;
}

export async function decodeSnapshot(token: string): Promise<Snapshot> {
  const kind = token[0];
  const bytes = fromBase64Url(token.slice(1));
  let json: Uint8Array;
  if (kind === 'z') {
    if (!canCompress()) throw new Error('This browser can’t open compressed snapshots. Try a recent Chrome, Edge, Firefox or Safari.');
    json = await pipe(bytes, new DecompressionStream('deflate-raw' as CompressionFormat));
  } else if (kind === 'j') {
    json = bytes;
  } else {
    throw new Error('Unrecognised snapshot link.');
  }
  const parsed = JSON.parse(new TextDecoder().decode(json)) as Snapshot;
  if (parsed?.v !== 1 || !parsed.digest || !Array.isArray(parsed.digest.sections)) throw new Error('This snapshot link is incomplete or damaged.');
  return parsed;
}

export function shareUrl(origin: string, token: string): string {
  return `${origin}/share#s=${token}`;
}

export function tokenFromHash(hash: string): string | null {
  const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(hash);
  return m ? m[1] : null;
}

export type Expiry = '24h' | '7d' | '30d' | 'never';

export const EXPIRY_LABELS: Record<Expiry, string> = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', never: 'Never' };

export function expiryDate(expiry: Expiry, now = new Date()): string | null {
  const hours = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, never: 0 }[expiry];
  return hours ? new Date(now.getTime() + hours * 3_600_000).toISOString() : null;
}

export function describeExpiry(expiresAt: string | null, now = new Date()): { label: string; expired: boolean } {
  if (!expiresAt) return { label: 'Never expires', expired: false };
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return { label: 'Expired', expired: true };
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return { label: 'Expires in < 1 hour', expired: false };
  if (hours < 48) return { label: `Expires in ${hours} hour${hours === 1 ? '' : 's'}`, expired: false };
  return { label: `Expires in ${Math.round(hours / 24)} days`, expired: false };
}
