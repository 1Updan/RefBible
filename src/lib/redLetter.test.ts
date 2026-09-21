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

  it('tolerates trailing-punctuation drift (Talitha cumi. vs cumi;)', () => {
    const text = 'And he took the damsel by the hand, and said unto her, Talitha cumi; which is, being interpreted.';
    assert.equal(
      applyChristWords(text, 'Talitha cumi.'),
      'And he took the damsel by the hand, and said unto her, <WJ>Talitha cumi</WJ>; which is, being interpreted.',
    );
  });

  it('tolerates case drift (Son vs son of David)', () => {
    const text = 'How say the scribes that Christ is the son of David?';
    assert.equal(
      applyChristWords(text, 'How say the scribes that Christ is the Son of David?'),
      '<WJ>How say the scribes that Christ is the son of David</WJ>?',
    );
  });

  it('stays plain when words are hyphen-merged (Bar-jona vs Barjona)', () => {
    const text = 'Blessed art thou, Simon Barjona: for flesh and blood.';
    assert.equal(applyChristWords(text, 'Blessed art thou, Simon Bar-jona: for flesh and blood.'), text);
  });
});
