import qrcode from 'qrcode-generator';

export interface QrMatrix {
  size: number;
  /** One SVG path for every dark module — compact and crisp at any scale. */
  path: string;
}

/**
 * Encodes text as a QR matrix. Uses error-correction level L — screens don't get
 * scratched, and it keeps long snapshot links at the lowest density.
 * Returns null when the text exceeds QR capacity.
 */
export function makeQr(text: string): QrMatrix | null {
  for (const level of ['L'] as const) {
    try {
      const qr = qrcode(0, level);
      qr.addData(text, 'Byte');
      qr.make();
      const size = qr.getModuleCount();
      let path = '';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!qr.isDark(r, c)) continue;
          // Merge horizontal runs into one rect.
          let run = 1;
          while (c + run < size && qr.isDark(r, c + run)) run++;
          path += `M${c} ${r}h${run}v1h-${run}z`;
          c += run - 1;
        }
      }
      return { size, path };
    } catch {
      /* too long for this level — try the next */
    }
  }
  return null;
}
