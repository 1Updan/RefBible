import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const NT_PATH = join('C:\\Users\\user\\refbible', 'public', 'interlinear-data', 'interlinear-nt.json')

const grkTrans = {
  '\u03B1': 'a', '\u03B2': 'b', '\u03B3': 'g', '\u03B4': 'd',
  '\u03B5': 'e', '\u03B6': 'z', '\u03B7': 'e', '\u03B8': 'th',
  '\u03B9': 'i', '\u03BA': 'k', '\u03BB': 'l', '\u03BC': 'm',
  '\u03BD': 'n', '\u03BE': 'x', '\u03BF': 'o', '\u03C0': 'p',
  '\u03C1': 'r', '\u03C2': 's', '\u03C3': 's', '\u03C4': 't',
  '\u03C5': 'u', '\u03C6': 'ph', '\u03C7': 'ch', '\u03C8': 'ps', '\u03C9': 'o',
}

function transliterateGreek(text) {
  let normalized = text.normalize('NFD').replace(/[\u0300-\u036F]/g, '')
  return [...normalized].map(ch => grkTrans[ch] || ch).join('').replace(/[^a-zA-Z]/g, '').toLowerCase()
}

// ROM.16.27 (Textus Receptus): μόνῳ σοφῷ Θεῷ, διὰ Ἰησοῦ Χριστοῦ, ᾧ ἡ δόξα εἰς τοὺς αἰῶνας. ἀμήν.
const words = [
  { original: 'μόνῳ', strongs: 'G3441' },
  { original: 'σοφῷ', strongs: 'G4680' },
  { original: 'Θεῷ', strongs: 'G2316' },
  { original: 'διὰ', strongs: 'G1223' },
  { original: 'Ἰησοῦ', strongs: 'G2424' },
  { original: 'Χριστοῦ', strongs: 'G5547' },
  { original: 'ᾧ', strongs: 'G3739' },
  { original: 'ἡ', strongs: 'G3588' },
  { original: 'δόξα', strongs: 'G1391' },
  { original: 'εἰς', strongs: 'G1519' },
  { original: 'τοὺς', strongs: 'G3588' },
  { original: 'αἰῶνας', strongs: 'G165' },
  { original: 'ἀμήν.', strongs: 'G281' },
]

const interlinearWords = words.map((w, idx) => ({
  word_index: idx,
  language: 'greek',
  original_text: w.original,
  transliteration: transliterateGreek(w.original.replace(/[.,;·]/g, '')),
  strongs_number: w.strongs,
  lemma: null,
  gloss: null,
  morphology: null,
}))

const ntData = JSON.parse(readFileSync(NT_PATH, 'utf-8'))
ntData.push({ verse_id: 'ROM.16.27', words: interlinearWords })
writeFileSync(NT_PATH, JSON.stringify(ntData))
console.log('Added ROM.16.27 with', words.length, 'words')
console.log('Total NT verses:', ntData.length)
