export function createChristWordsLookup(
  verses: Record<string, string>,
): (reference: string) => string | undefined {
  return (reference: string) => verses[reference];
}

let verses: Record<string, string> | undefined;
let inflight: Promise<void> | undefined;

export async function ensureChristWords(): Promise<void> {
  if (verses) return;
  inflight ??= import('../data/redLetterVerses.json', { with: { type: 'json' } }).then((m) => {
    verses = (m.default as { verses: Record<string, string> }).verses;
    inflight = undefined;
  });
  return inflight;
}

export function getChristWords(reference: string): string | undefined {
  return verses?.[reference];
}
