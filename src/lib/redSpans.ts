import webSpans from '../data/redSpans.web.json' with { type: 'json' };
import asvSpans from '../data/redSpans.asv.json' with { type: 'json' };
import draSpans from '../data/redSpans.dra.json' with { type: 'json' };
import genevaSpans from '../data/redSpans.geneva1599.json' with { type: 'json' };

export interface RedSpan {
  start: number;
  end: number;
}

interface SpanRow {
  spans: number[][];
  hash: string;
  conf: number;
  method: string;
}

type SpanTable = Record<string, Record<string, SpanRow>>;

// Compact sync SHA-1 (render path can't await WebCrypto). Standard
// implementation; verified against the NIST "abc" vector in tests.
export function sha1Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 2 ** 32), false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;

  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const tmp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, '0')).join('');
}

export function createSpanLookup(
  tables: SpanTable,
): (code: string, verseId: string, liveText: string) => RedSpan[] | null {
  return (code, verseId, liveText) => {
    // KJV uses the quote-substring path; NASB is excluded entirely.
    if (code === 'KJV' || code === 'NASB') return null;
    const row = tables[code]?.[verseId];
    if (!row) return null;
    // Text-drift guardrail: hashes are 12-hex-char prefixes.
    if (sha1Hex(liveText).slice(0, 12) !== row.hash) return null;
    const spans: RedSpan[] = [];
    for (const pair of row.spans) {
      const s = pair[0];
      const e = pair[1];
      if (typeof s !== 'number' || typeof e !== 'number') return null;
      if (s < 0 || e <= s || e > liveText.length) return null;
      if (!liveText.slice(s, e).trim()) return null;
      spans.push({ start: s, end: e });
    }
    return spans.length > 0 ? spans : null;
  };
}

const tables: SpanTable = {
  WEB: (webSpans as { verses: Record<string, SpanRow> }).verses,
  ASV: (asvSpans as { verses: Record<string, SpanRow> }).verses,
  DRA: (draSpans as { verses: Record<string, SpanRow> }).verses,
  GENEVA1599: (genevaSpans as { verses: Record<string, SpanRow> }).verses,
};

export function getRedSpans(code: string, verseId: string, liveText: string): RedSpan[] | null {
  return createSpanLookup(tables)(code, verseId, liveText);
}
