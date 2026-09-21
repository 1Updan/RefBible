import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sha1Hex, createSpanLookup } from './redSpans.ts';

describe('sha1Hex', () => {
  it('matches the NIST vector', () => {
    assert.equal(sha1Hex('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
  });
});

describe('createSpanLookup (non-KJV translations)', () => {
  const lookup = createSpanLookup({
    WEB: {
      'MAT.5.3': { spans: [[0, 7]], hash: sha1Hex('Blessed are the meek.').slice(0, 12), conf: 1, method: 'full' },
    },
  });

  it('returns spans when the live text hash matches', () => {
    assert.deepEqual(lookup('WEB', 'MAT.5.3', 'Blessed are the meek.'), [{ start: 0, end: 7 }]);
  });

  it('returns null when the text drifted (hash mismatch)', () => {
    assert.equal(lookup('WEB', 'MAT.5.3', 'Blessed are the meek!'), null);
  });

  it('returns null for unknown verses', () => {
    assert.equal(lookup('WEB', 'GEN.1.1', 'In the beginning.'), null);
  });

  it('returns null for NASB (excluded) and KJV (quote path owns it)', () => {
    assert.equal(lookup('NASB', 'MAT.5.3', 'Blessed are the meek.'), null);
    assert.equal(lookup('KJV', 'MAT.5.3', 'Blessed are the meek.'), null);
  });
});
