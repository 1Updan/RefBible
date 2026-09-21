export function createChristWordsLookup(
  verses: Record<string, string>,
): (reference: string) => string | undefined {
  return (reference: string) => verses[reference];
}

let verses: Record<string, string> | undefined;
let inflight: Promise<void> | undefined;

export async function ensureChristWords(): Promise<void> {
  if (verses) return;
  // NOTE: load via the wrapper module (static JSON import inlined into a
  // lazy chunk). Never dynamic-import raw JSON with import attributes:
  // bundlers may compile that to a runtime file fetch, and dist ships no
  // .json files, so verses would silently stay plain.
  inflight ??= import('./redTables/redKjv.ts').then((m) => {
    verses = m.verses;
    inflight = undefined;
  });
  return inflight;
}

export function getChristWords(reference: string): string | undefined {
  return verses?.[reference];
}
