import data from '../../data/redSpans.web.json' with { type: 'json' };

export const verses = (data as { verses: Record<string, { s: number[][]; h: string }> }).verses;
