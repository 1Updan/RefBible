import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createChristWordsLookup, getChristWords, ensureChristWords } from './wordsOfChrist.ts';

const lookup = createChristWordsLookup({
  'Matthew 5:3': 'full',
  'Matthew 3:15':
    'Suffer it to be so now: for thus it becometh us to fulfil all righteousness.',
});

describe('getChristWords (KJV-only)', () => {
  it('returns full for entire-verse sayings', () => {
    assert.equal(lookup('Matthew 5:3'), 'full');
  });

  it('returns the quoted substring for partial verses', () => {
    assert.equal(
      lookup('Matthew 3:15'),
      'Suffer it to be so now: for thus it becometh us to fulfil all righteousness.',
    );
  });

  it('returns undefined outside the Gospels/Acts/Revelation sayings', () => {
    assert.equal(lookup('Genesis 1:1'), undefined);
  });
});

describe('lazy quote table', () => {
  it('returns undefined before the table is loaded', () => {
    assert.equal(getChristWords('John 3:16'), undefined);
  });

  it('returns quotes after ensureChristWords', async () => {
    await ensureChristWords();
    assert.equal(getChristWords('John 3:16'), 'full');
    assert.equal(getChristWords('Genesis 1:1'), undefined);
  });
});
