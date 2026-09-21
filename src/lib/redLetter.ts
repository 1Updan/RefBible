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
  if (idx === -1) return plainText;
  return `${plainText.slice(0, idx)}<WJ>${christWords}</WJ>${plainText.slice(idx + christWords.length)}`;
}
