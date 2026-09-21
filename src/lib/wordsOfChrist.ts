import redLetterData from '../data/redLetterVerses.json' with { type: 'json' };

export function createChristWordsLookup(
  verses: Record<string, string>,
): (reference: string) => string | undefined {
  return (reference: string) => verses[reference];
}

const verses = (redLetterData as { verses: Record<string, string> }).verses;

export function getChristWords(reference: string): string | undefined {
  return verses[reference];
}
