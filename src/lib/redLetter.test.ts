import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWordsOfChrist } from './redLetter.ts';

describe('parseWordsOfChrist', () => {
  it('marks WJ-tagged spans as words of Christ', () => {
    const out = parseWordsOfChrist('For <WJ>come unto me</WJ> all ye.');
    assert.deepEqual(out, [
      { text: 'For ', isWordOfChrist: false },
      { text: 'come unto me', isWordOfChrist: true },
      { text: ' all ye.', isWordOfChrist: false },
    ]);
  });

  it('returns plain text as single non-red segment', () => {
    const out = parseWordsOfChrist('In the beginning.');
    assert.deepEqual(out, [{ text: 'In the beginning.', isWordOfChrist: false }]);
  });
});
