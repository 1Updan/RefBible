import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')

// ========== Missing verses (71 total) ==========
const MISSING_DB_VERSES = [
  "1KI.22.1","1KI.22.10","1KI.22.11","1KI.22.12","1KI.22.13","1KI.22.14","1KI.22.15","1KI.22.16","1KI.22.17","1KI.22.18",
  "1KI.22.19","1KI.22.2","1KI.22.20","1KI.22.21","1KI.22.22","1KI.22.23","1KI.22.24","1KI.22.25","1KI.22.26","1KI.22.27",
  "1KI.22.28","1KI.22.29","1KI.22.3","1KI.22.30","1KI.22.31","1KI.22.32","1KI.22.33","1KI.22.34","1KI.22.35","1KI.22.36",
  "1KI.22.37","1KI.22.38","1KI.22.39","1KI.22.4","1KI.22.40","1KI.22.41","1KI.22.42","1KI.22.43","1KI.22.44","1KI.22.45",
  "1KI.22.46","1KI.22.47","1KI.22.48","1KI.22.49","1KI.22.5","1KI.22.50","1KI.22.51","1KI.22.52","1KI.22.53","1KI.22.6",
  "1KI.22.7","1KI.22.8","1KI.22.9","PSA.119.176",
  "MAT.12.50","MAT.17.27","MAT.18.35","MAT.23.39",
  "MRK.7.37","MRK.9.49","MRK.9.50","MRK.11.33","MRK.15.47",
  "LUK.17.37","LUK.23.56",
  "JHN.5.47",
  "ACT.8.40","ACT.15.41","ACT.24.27","ACT.28.31",
  "ROM.16.27",
]

// Reverse of osisToAbbr: KJV abbreviation -> OSIS abbreviation
const KJV_TO_OSIS = {
  'GEN': 'GEN', 'EXO': 'EXOD', 'LEV': 'LEV', 'NUM': 'NUM', 'DEU': 'DEUT',
  'JOS': 'JOSH', 'JDG': 'JUDG', 'RUT': 'RUTH', '1SA': '1SAM', '2SA': '2SAM',
  '1KI': '1KGS', '2KI': '2KGS', '1CH': '1CHR', '2CH': '2CHR', 'EZR': 'EZRA',
  'NEH': 'NEH', 'EST': 'ESTH', 'JOB': 'JOB', 'PSA': 'PS', 'PRO': 'PROV',
  'ECC': 'ECCL', 'SNG': 'SONG', 'ISA': 'ISA', 'JER': 'JER', 'LAM': 'LAM',
  'EZK': 'EZEK', 'DAN': 'DAN', 'HOS': 'HOS', 'JOL': 'JOEL', 'AMO': 'AMOS',
  'OBA': 'OBAD', 'JON': 'JONAH', 'MIC': 'MIC', 'NAM': 'NAH', 'HAB': 'HAB',
  'ZEP': 'ZEPH', 'HAG': 'HAG', 'ZEC': 'ZECH', 'MAL': 'MAL',
  'MAT': 'MATT', 'MRK': 'MARK', 'LUK': 'LUKE', 'JHN': 'JOHN', 'ACT': 'ACTS',
  'ROM': 'ROM', '1CO': '1COR', '2CO': '2COR', 'GAL': 'GAL', 'EPH': 'EPH',
  'PHP': 'PHIL', 'COL': 'COL', '1TH': '1THESS', '2TH': '2THESS', '1TI': '1TIM',
  '2TI': '2TIM', 'TIT': 'TITUS', 'PHM': 'PHLM', 'HEB': 'HEB', 'JAS': 'JAS',
  '1PE': '1PET', '2PE': '2PET', '1JN': '1JOHN', '2JN': '2JOHN', '3JN': '3JOHN',
  'JUD': 'JUDE', 'REV': 'REV',
}

function kvToOsis(verseId) {
  const parts = verseId.split('.')
  const osisBook = KJV_TO_OSIS[parts[0]]
  if (!osisBook) return verseId
  return `${osisBook}.${parts[1]}.${parts[2]}`
}

const MISSING_VERSES = MISSING_DB_VERSES.map(kvToOsis)

// OSIS -> OSHB book name mapping
const OSIS_TO_OSHB = {
  'GEN': 'Genesis', 'EXOD': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers',
  'DEUT': 'Deuteronomy', 'JOSH': 'Joshua', 'JUDG': 'Judges', 'RUTH': 'Ruth',
  '1SAM': 'I Samuel', '2SAM': 'II Samuel', '1KGS': 'I Kings', '2KGS': 'II Kings',
  '1CHR': 'I Chronicles', '2CHR': 'II Chronicles', 'EZRA': 'Ezra', 'NEH': 'Nehemiah',
  'ESTH': 'Esther', 'JOB': 'Job', 'PS': 'Psalms', 'PROV': 'Proverbs',
  'ECCL': 'Ecclesiastes', 'SONG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah',
  'LAM': 'Lamentations', 'EZEK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea',
  'JOEL': 'Joel', 'AMOS': 'Amos', 'OBAD': 'Obadiah', 'JONAH': 'Jonah',
  'MIC': 'Micah', 'NAH': 'Nahum', 'HAB': 'Habakkuk', 'ZEPH': 'Zephaniah',
  'HAG': 'Haggai', 'ZECH': 'Zechariah', 'MAL': 'Malachi',
}

// MorphGNT book number -> OSIS abbreviation
const MORPHGNT_BOOKS = {
  '01': 'MATT', '02': 'MARK', '03': 'LUKE', '04': 'JOHN', '05': 'ACTS',
  '06': 'ROM', '07': '1COR', '08': '2COR', '09': 'GAL', '10': 'EPH',
  '11': 'PHIL', '12': 'COL', '13': '1THESS', '14': '2THESS', '15': '1TIM',
  '16': '2TIM', '17': 'TITUS', '18': 'PHLM', '19': 'HEB', '20': 'JAS',
  '21': '1PET', '22': '2PET', '23': '1JOHN', '24': '2JOHN', '25': '3JOHN',
  '26': 'JUDE', '27': 'REV',
}

const MORPHGNT_URLS = {
  '01': 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/61-Mt-morphgnt.txt',
  '02': 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/62-Mk-morphgnt.txt',
  '03': 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/63-Lk-morphgnt.txt',
  '04': 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/64-Jn-morphgnt.txt',
  '05': 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/65-Ac-morphgnt.txt',
  '06': 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/66-Ro-morphgnt.txt',
}

// needs morphgnt data for these books
const NT_BOOKS_NEEDED = new Set(['MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM'])

// ========== Transliteration ==========
const HEB_TRANS = {
  '\u05D0': '\u02BE', '\u05D1': 'v', '\u05D2': 'g', '\u05D3': 'd',
  '\u05D4': 'h', '\u05D5': 'w', '\u05D6': 'z', '\u05D7': 'h',
  '\u05D8': 't', '\u05D9': 'y', '\u05DB': 'k', '\u05DC': 'l',
  '\u05DE': 'm', '\u05E0': 'n', '\u05E1': 's', '\u05E2': '\u02BF',
  '\u05E4': 'p', '\u05E6': 'ts', '\u05E7': 'q', '\u05E8': 'r',
  '\u05E9': 'sh', '\u05EA': 't',
  '\u05DA': 'kh', '\u05DD': 'm', '\u05DF': 'n', '\u05E3': 'f', '\u05E5': 'ts',
}

const GRK_TRANS = {
  '\u03B1': 'a', '\u03B2': 'b', '\u03B3': 'g', '\u03B4': 'd',
  '\u03B5': 'e', '\u03B6': 'z', '\u03B7': 'e', '\u03B8': 'th',
  '\u03B9': 'i', '\u03BA': 'k', '\u03BB': 'l', '\u03BC': 'm',
  '\u03BD': 'n', '\u03BE': 'x', '\u03BF': 'o', '\u03C0': 'p',
  '\u03C1': 'r', '\u03C2': 's', '\u03C3': 's', '\u03C4': 't',
  '\u03C5': 'u', '\u03C6': 'ph', '\u03C7': 'ch', '\u03C8': 'ps', '\u03C9': 'o',
}

function transliterateHebrew(text) {
  let result = ''
  for (const ch of text) {
    result += HEB_TRANS[ch] || ch
  }
  return result
}

function transliterateGreek(text) {
  let normalized = text.normalize('NFD').replace(/[\u0300-\u036F]/g, '')
  let result = ''
  for (const ch of normalized) {
    result += GRK_TRANS[ch] || ch
  }
  return result.replace(/[^a-zA-Z\u02BE\u02BF]/g, '').toLowerCase()
}

function normalizeGreekWord(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036F.,;:·᾽'ʼ‿\[\]\(\)\u2019\s]/g, '').toLowerCase()
}

function extractStrongs(field) {
  const parts = field.split('/')
  const last = parts[parts.length - 1]
  if (/^H\d+$/.test(last)) return last
  if (/^G\d+$/.test(last)) return last
  return null
}

function parseMorphgntRef(ref) {
  const book = ref.slice(0, 2)
  const chapter = parseInt(ref.slice(2, 4), 10)
  const verse = parseInt(ref.slice(4, 6), 10)
  return { book, chapter, verse }
}

function formatVerseId(bookOsis, ch, vs) {
  return `${bookOsis}.${ch}.${vs}`
}

// ========== Fetch helper ==========
async function fetchText(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`)
  return resp.text()
}

// ========== Main ==========
async function main() {
  console.log('=== Patching interlinear data gaps ===\n')

  // Check which verses actually need patching
  const otPath = join(PUBLIC, 'interlinear-data', 'interlinear-ot.json')
  const ntPath = join(PUBLIC, 'interlinear-data', 'interlinear-nt.json')

  const otExisting = JSON.parse(readFileSync(otPath, 'utf-8'))
  const ntExisting = JSON.parse(readFileSync(ntPath, 'utf-8'))

  const otExistingSet = new Set(otExisting.map(v => v.verse_id))
  const ntExistingSet = new Set(ntExisting.map(v => v.verse_id))

  const needOt = MISSING_VERSES.filter(v => {
    const book = v.split('.')[0]
    return !['MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM'].includes(book)
  }).filter(v => !otExistingSet.has(v))

  const needNt = MISSING_VERSES.filter(v => {
    const book = v.split('.')[0]
    return ['MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM'].includes(book)
  }).filter(v => !ntExistingSet.has(v))

  console.log(`  OT verses to patch: ${needOt.length}`)
  console.log(`  NT verses to patch: ${needNt.length}`)

  let otPatched = 0
  let ntPatched = 0

  // ===== OT PATCH =====
  if (needOt.length > 0) {
    console.log('\n=== Patching OT verses ===')
    const morphhbTgt = join(ROOT, 'temp-morphhb.cjs')
    const morphhbFallback = join(process.env.TEMP, 'morphhb.js')
    if (!existsSync(morphhbTgt)) {
      copyFileSync(morphhbFallback, morphhbTgt)
      console.log('  Copied morphhb data to project')
    }
    const oshb = _require(morphhbTgt)
    console.log(`  OSHB loaded: ${Object.keys(oshb).length} books`)

    for (const verseId of needOt) {
      const parts = verseId.split('.')
      const bookOsis = parts[0]
      const ch = parseInt(parts[1], 10)
      const vs = parseInt(parts[2], 10)
      const oshbBook = OSIS_TO_OSHB[bookOsis]
      if (!oshbBook || !oshb[oshbBook]) {
        console.log(`  SKIP: no OSHB mapping for ${bookOsis} (${verseId})`)
        continue
      }
      const chapterArr = oshb[oshbBook][ch - 1]
      if (!chapterArr) {
        console.log(`  SKIP: no chapter ${ch} for ${oshbBook} (${verseId})`)
        continue
      }
      const verseArr = chapterArr[vs - 1]
      if (!verseArr) {
        console.log(`  SKIP: no verse ${vs} in ${oshbBook} ${ch} (${verseId})`)
        continue
      }

      const words = verseArr.map(([wordField, strongsField, morphField], idx) => {
        const wordText = wordField.replace(/\//g, '')
        const strongsNum = extractStrongs(strongsField) || 'H0'
        return {
          word_index: idx,
          language: 'hebrew',
          original_text: wordText,
          transliteration: transliterateHebrew(wordText),
          strongs_number: strongsNum,
          lemma: null,
          gloss: null,
          morphology: morphField,
        }
      })

      otExisting.push({ verse_id: verseId, words })
      otPatched++
    }
    console.log(`  Patched ${otPatched} OT verses`)
  }

  // ===== NT PATCH =====
  if (needNt.length > 0) {
    console.log('\n=== Patching NT verses ===')

    // Build Greek word -> Strong's mapping from existing data
    const greekWordMap = new Map()
    for (const verse of ntExisting) {
      for (const w of verse.words) {
        if (!w.strongs_number) continue
        if (w.strongs_number === 'G0') continue
        const key = normalizeGreekWord(w.original_text)
        if (!key) continue
        const existing = greekWordMap.get(key)
        if (!existing) {
          greekWordMap.set(key, {
            strongs_number: w.strongs_number,
            transliteration: w.transliteration,
            gloss: w.gloss,
            count: 1,
          })
        } else {
          existing.count++
          if (existing.strongs_number !== w.strongs_number && existing.count > 1) {
            // Keep the most common one
          }
        }
      }
    }
    console.log(`  Greek word map: ${greekWordMap.size} entries`)

    // Download and parse MorphGNT data
    const morphgntData = new Map() // bookNum -> array of { ref, words }

    for (const [bookNum, url] of Object.entries(MORPHGNT_URLS)) {
      const osis = MORPHGNT_BOOKS[bookNum]
      if (!NT_BOOKS_NEEDED.has(osis)) continue
      console.log(`  Downloading MorphGNT ${osis} (book ${bookNum})...`)
      const text = await fetchText(url)
      const lines = text.trim().split('\n')

      const verseMap = new Map()
      for (const line of lines) {
        const cols = line.split(/\s+/)
        if (cols.length < 7) continue
        const ref = cols[0]
        const wordText = cols[3]
        const strippedWord = cols[4]
        const normalizedWord = cols[5]
        const lemma = cols[6]

        if (!verseMap.has(ref)) verseMap.set(ref, [])
        verseMap.get(ref).push({ wordText, strippedWord, normalizedWord, lemma })
      }
      morphgntData.set(bookNum, verseMap)
      console.log(`    ${verseMap.size} verses`)
    }

    // Patch missing NT verses
    for (const verseId of needNt) {
      const parts = verseId.split('.')
      const bookOsis = parts[0]
      const ch = parseInt(parts[1], 10)
      const vs = parseInt(parts[2], 10)

      // Find book number
      let bookNum = null
      for (const [bn, os] of Object.entries(MORPHGNT_BOOKS)) {
        if (os === bookOsis) { bookNum = bn; break }
      }
      if (!bookNum) {
        console.log(`  SKIP: unknown book ${bookOsis}`)
        continue
      }

      const ref = `${bookNum}${String(ch).padStart(2, '0')}${String(vs).padStart(2, '0')}`
      const verseMap = morphgntData.get(bookNum)
      if (!verseMap) {
        console.log(`  SKIP: no MorphGNT data for book ${bookNum}`)
        continue
      }
      const words = verseMap.get(ref)
      if (!words) {
        console.log(`  SKIP: ${verseId} not in MorphGNT data`)
        continue
      }

      const interlinearWords = words.map((w, idx) => {
        const greekWord = w.strippedWord || w.wordText
        const normKey = normalizeGreekWord(greekWord)
        const lookup = greekWordMap.get(normKey)
        const strongsNum = lookup?.strongs_number || null
        const existingTrans = lookup?.transliteration || null
        // Try lemma lookup if word not found
        let trans = existingTrans
        if (!trans) {
          const lemmaKey = normalizeGreekWord(w.lemma)
          const lemmaLookup = greekWordMap.get(lemmaKey)
          if (lemmaLookup) {
            trans = lemmaLookup.transliteration || transliterateGreek(w.lemma)
          } else {
            trans = transliterateGreek(greekWord)
          }
        }

        return {
          word_index: idx,
          language: 'greek',
          original_text: w.wordText.trim(),
          transliteration: trans,
          strongs_number: strongsNum,
          lemma: w.lemma,
          gloss: lookup?.gloss || null,
          morphology: null,
        }
      })

      ntExisting.push({ verse_id: verseId, words: interlinearWords })
      ntPatched++
    }
    console.log(`  Patched ${ntPatched} NT verses`)
  }

  // ===== SAVE =====
  console.log('\n=== Saving ===')
  writeFileSync(otPath, JSON.stringify(otExisting))
  console.log(`  Saved interlinear-ot.json (${otExisting.length} verses)`)
  writeFileSync(ntPath, JSON.stringify(ntExisting))
  console.log(`  Saved interlinear-nt.json (${ntExisting.length} verses)`)

  console.log(`\n=== Done ===`)
  console.log(`  OT: +${otPatched}, NT: +${ntPatched}`)
  if (otPatched + ntPatched === 0) {
    console.log('  No patches needed.')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
