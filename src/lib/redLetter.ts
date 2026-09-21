export interface RedLetterSegment {
  text: string;
  isWordOfChrist: boolean;
}

export function parseWordsOfChrist(text: string): RedLetterSegment[] {
  if (!text.includes('<WJ>') || !text.includes('</WJ>')) return [{ text, isWordOfChrist: false }];
  const out: RedLetterSegment[] = [];
  const re = /<WJ>([\s\S]*?)<\/WJ>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), isWordOfChrist: false });
    out.push({ text: m[1], isWordOfChrist: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), isWordOfChrist: false });
  return out.filter((s) => s.text.length > 0);
}

export function stripRedLetterTags(text: string): string {
  return text.replace(/<\/?WJ>/g, '');
}

export function applyChristWords(plainText: string, christWords: string | null | undefined): string {
  if (!christWords) return plainText;
  if (christWords === 'full') return `<WJ>${plainText}</WJ>`;
  const idx = plainText.indexOf(christWords);
  if (idx !== -1) {
    return `${plainText.slice(0, idx)}<WJ>${christWords}</WJ>${plainText.slice(idx + christWords.length)}`;
  }
  // Tolerant chain for edition drift (case, punctuation, quote spacing):
  // normalized substring first, then unique token-run mapping.
  const nText = normQuotes(plainText);
  const nQuote = normQuotes(christWords);
  const nIdx = nText.indexOf(nQuote);
  if (nIdx !== -1) {
    return `${plainText.slice(0, nIdx)}<WJ>${plainText.slice(nIdx, nIdx + nQuote.length)}</WJ>${plainText.slice(nIdx + nQuote.length)}`;
  }
  const mapped = mapTokenSpan(christWords, plainText);
  if (mapped) {
    return `${plainText.slice(0, mapped[0])}<WJ>${plainText.slice(mapped[0], mapped[1])}</WJ>${plainText.slice(mapped[1])}`;
  }
  return plainText;
}

const QUOTE_MAP: Record<string, string> = {
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '—': '-',
  '–': '-',
  ' ': ' ',
};

export function normQuotes(s: string): string {
  return s.replace(/[\u201C\u201D\u2018\u2019\u2014\u2013\u00A0]/g, (c) => QUOTE_MAP[c] ?? c);
}

const ARCHAIC: Record<string, string> = {
  thou: 'you',
  thee: 'you',
  thy: 'your',
  thine: 'your',
  ye: 'you',
  hath: 'has',
  doth: 'does',
  hast: 'have',
  dost: 'do',
  saith: 'says',
  spake: 'spoke',
  unto: 'to',
  verily: 'truly',
};

function tokenizeWords(text: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  const re = /[A-Za-z0-9']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

const normWord = (w: string): string => ARCHAIC[w.toLowerCase()] ?? w.toLowerCase();

export function mapTokenSpan(spanText: string, targetText: string): [number, number] | null {
  const q = tokenizeWords(spanText).map((t) => normWord(t.word));
  if (q.length === 0) return null;
  const t = tokenizeWords(targetText);
  const tn = t.map((x) => normWord(x.word));
  const hits: number[] = [];
  for (let i = 0; i + q.length <= tn.length; i++) {
    let ok = true;
    for (let j = 0; j < q.length; j++) {
      if (tn[i + j] !== q[j]) {
        ok = false;
        break;
      }
    }
    if (ok) hits.push(i);
  }
  if (hits.length !== 1) return null;
  return [t[hits[0]].start, t[hits[0] + q.length - 1].end];
}
