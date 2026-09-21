import data from '../../data/redLetterVerses.json' with { type: 'json' };

export const verses = (data as { verses: Record<string, string> }).verses;
