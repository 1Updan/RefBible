import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWordsOfChrist, stripRedLetterTags, applyChristWords } from './redLetter.ts';

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

  it('treats unclosed WJ as plain text', () => {
    const out = parseWordsOfChrist('Say <WJ>hello');
    assert.deepEqual(out, [{ text: 'Say <WJ>hello', isWordOfChrist: false }]);
  });

  it('strips tags for speech/search/share', () => {
    assert.equal(stripRedLetterTags('For <WJ>come</WJ> all'), 'For come all');
  });

  it('wraps full verse when christWords is full', () => {
    assert.equal(
      applyChristWords('Blessed are the meek.', 'full'),
      '<WJ>Blessed are the meek.</WJ>',
    );
  });

  it('wraps only the quoted substring for partial verses', () => {
    assert.equal(
      applyChristWords(
        'Suffer it to be so now: for thus it becometh us.',
        'Suffer it to be so now:',
      ),
      '<WJ>Suffer it to be so now:</WJ> for thus it becometh us.',
    );
  });

  it('returns plain text when quote not found', () => {
    assert.equal(applyChristWords('In the beginning.', 'come unto me'), 'In the beginning.');
  });
});
