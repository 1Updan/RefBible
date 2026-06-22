import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'fs'
import { gzipSync } from 'zlib'
import { DatabaseSync } from 'node:sqlite'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const OUT_DIR = join(ROOT, 'src-tauri', 'bundled')

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2)
}

const gzPath = join(OUT_DIR, 'refbible.db.gz')

const sourceFiles = [
  join(PUBLIC, 'kjv.json'),
  join(PUBLIC, 'nasb.json'),
  join(PUBLIC, 'crossrefs.json'),
  join(PUBLIC, 'interlinear-data', 'interlinear-ot.json'),
  join(PUBLIC, 'interlinear-data', 'interlinear-nt.json'),
  join(PUBLIC, 'interlinear-data', 'strongs.json'),
]

const sourceMtime = Math.max(...sourceFiles.map(f => statSync(f).mtimeMs))
const gzMtime = existsSync(gzPath) ? statSync(gzPath).mtimeMs : 0

if (gzMtime > sourceMtime) {
  console.log('  Pre-seeded DB is up to date, skipping')
  process.exit(0)
}

console.log('=== Building pre-seeded database ===')

const dbPath = join(OUT_DIR, 'refbible.db')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

// Remove old DB if exists
try { rmSync(dbPath) } catch {}

const db = new DatabaseSync(dbPath)

// Create tables
db.exec(`
  CREATE TABLE verses (
    id TEXT PRIMARY KEY,
    book_id INTEGER NOT NULL,
    chapter_num INTEGER NOT NULL,
    verse_num INTEGER NOT NULL
  );

  CREATE TABLE content_text (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse_id TEXT NOT NULL,
    translation_code TEXT NOT NULL,
    text_data TEXT NOT NULL,
    UNIQUE(verse_id, translation_code)
  );

  CREATE TABLE cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_verse_id TEXT NOT NULL,
    target_verse_id TEXT NOT NULL,
    thematic_weight INTEGER DEFAULT 0,
    UNIQUE(origin_verse_id, target_verse_id)
  );

  CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse_id TEXT NOT NULL REFERENCES verses(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse_id TEXT NOT NULL REFERENCES verses(id),
    text_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE ai_commentary_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse_id TEXT NOT NULL,
    query_mode TEXT NOT NULL,
    cached_response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE interlinear_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse_id TEXT NOT NULL,
    word_index INTEGER NOT NULL,
    language TEXT NOT NULL,
    original_text TEXT NOT NULL,
    transliteration TEXT,
    strongs_number TEXT,
    lemma TEXT,
    gloss TEXT,
    morphology TEXT,
    UNIQUE(verse_id, word_index)
  );

  CREATE TABLE strongs_definitions (
    number TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    transliteration TEXT,
    definition TEXT,
    pronunciation TEXT,
    word_count INTEGER
  );
`)

console.log('  Tables created')

// Seed verses + KJV text
console.log('  Seeding KJV...')
const kjv = loadJson(join(PUBLIC, 'kjv.json'))
const insertVerse = db.prepare('INSERT OR IGNORE INTO verses (id, book_id, chapter_num, verse_num) VALUES (?, ?, ?, ?)')
const insertKjv = db.prepare('INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES (?, \'KJV\', ?)')

db.exec('BEGIN')
for (const book of kjv.books) {
  for (const ch of book.ch) {
    for (const v of ch.v) {
      const verseId = `${kjvAbbr(book.b)}.${ch.c}.${v.n}`
      insertVerse.run(verseId, book.i, ch.c, v.n)
      insertKjv.run(verseId, v.t)
    }
  }
}
db.exec('COMMIT')
console.log(`  Verses + KJV: ${kjv.books.reduce((s, b) => s + b.ch.reduce((s2, c) => s2 + c.v.length, 0), 0)} rows`)

function kjvAbbr(abbr) {
  const map = {
    'Gen': 'GEN', 'Exod': 'EXO', 'Lev': 'LEV', 'Num': 'NUM', 'Deut': 'DEU',
    'Josh': 'JOS', 'Judg': 'JDG', 'Ruth': 'RUT', '1Sam': '1SA', '2Sam': '2SA',
    '1Kgs': '1KI', '2Kgs': '2KI', '1Chr': '1CH', '2Chr': '2CH', 'Ezra': 'EZR',
    'Neh': 'NEH', 'Esth': 'EST', 'Job': 'JOB', 'Ps': 'PSA', 'Prov': 'PRO',
    'Eccl': 'ECC', 'Song': 'SNG', 'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM',
    'Ezek': 'EZK', 'Dan': 'DAN', 'Hos': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO',
    'Obad': 'OBA', 'Jonah': 'JON', 'Mic': 'MIC', 'Nah': 'NAM', 'Hab': 'HAB',
    'Zeph': 'ZEP', 'Hag': 'HAG', 'Zech': 'ZEC', 'Mal': 'MAL',
    'Matt': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
    'Rom': 'ROM', '1Cor': '1CO', '2Cor': '2CO', 'Gal': 'GAL', 'Eph': 'EPH',
    'Phil': 'PHP', 'Col': 'COL', '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI',
    '2Tim': '2TI', 'Titus': 'TIT', 'Phlm': 'PHM', 'Heb': 'HEB', 'Jas': 'JAS',
    '1Pet': '1PE', '2Pet': '2PE', '1John': '1JN', '2John': '2JN', '3John': '3JN',
    'Jude': 'JUD', 'Rev': 'REV'
  }
  return map[abbr] || abbr
}

// Seed NASB
console.log('  Seeding NASB...')
const nasb = loadJson(join(PUBLIC, 'nasb.json'))
const insertNasb = db.prepare('INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES (?, \'NASB\', ?)')

db.exec('BEGIN')
for (const book of nasb.books) {
  for (const ch of book.ch) {
    for (const v of ch.v) {
      insertNasb.run(`${kjvAbbr(book.b)}.${ch.c}.${v.n}`, v.t)
    }
  }
}
db.exec('COMMIT')
console.log('  NASB done')

function normalizeVerseId(vid) {
  const parts = vid.split('.')
  const abbr = osisToAbbr(parts[0])
  return `${abbr}.${parts[1]}.${parts[2]}`
}

// Seed cross-references
console.log('  Seeding cross-references...')
const xrefs = loadJson(join(PUBLIC, 'crossrefs.json'))
const insertXref = db.prepare('INSERT OR IGNORE INTO cross_references (origin_verse_id, target_verse_id, thematic_weight) VALUES (?, ?, 0)')

db.exec('BEGIN')
for (const x of xrefs) {
  insertXref.run(normalizeVerseId(x.origin), normalizeVerseId(x.target))
}
db.exec('COMMIT')
console.log(`  ${xrefs.length} cross-references`)

// Seed interlinear words
console.log('  Seeding interlinear OT...')
const otWords = loadJson(join(PUBLIC, 'interlinear-data', 'interlinear-ot.json'))
const insertWord = db.prepare(`INSERT OR REPLACE INTO interlinear_words
  (verse_id, word_index, language, original_text, transliteration, strongs_number, lemma, gloss, morphology)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

let wordCount = 0
const CHUNK = 500

function osisToAbbr(osis) {
  const map = {
    'GEN': 'GEN', 'EXOD': 'EXO', 'LEV': 'LEV', 'NUM': 'NUM', 'DEUT': 'DEU',
    'JOSH': 'JOS', 'JUDG': 'JDG', 'RUTH': 'RUT', '1SAM': '1SA', '2SAM': '2SA',
    '1KGS': '1KI', '2KGS': '2KI', '1CHR': '1CH', '2CHR': '2CH', 'EZRA': 'EZR',
    'NEH': 'NEH', 'ESTH': 'EST', 'JOB': 'JOB', 'PS': 'PSA', 'PROV': 'PRO',
    'ECCL': 'ECC', 'SONG': 'SNG', 'ISA': 'ISA', 'JER': 'JER', 'LAM': 'LAM',
    'EZEK': 'EZK', 'DAN': 'DAN', 'HOS': 'HOS', 'JOEL': 'JOL', 'AMOS': 'AMO',
    'OBAD': 'OBA', 'JONAH': 'JON', 'MIC': 'MIC', 'NAH': 'NAM', 'HAB': 'HAB',
    'ZEPH': 'ZEP', 'HAG': 'HAG', 'ZECH': 'ZEC', 'MAL': 'MAL',
    'MATT': 'MAT', 'MARK': 'MRK', 'LUKE': 'LUK', 'JOHN': 'JHN', 'ACTS': 'ACT',
    'ROM': 'ROM', '1COR': '1CO', '2COR': '2CO', 'GAL': 'GAL', 'EPH': 'EPH',
    'PHIL': 'PHP', 'COL': 'COL', '1THESS': '1TH', '2THESS': '2TH', '1TIM': '1TI',
    '2TIM': '2TI', 'TITUS': 'TIT', 'PHLM': 'PHM', 'HEB': 'HEB', 'JAS': 'JAS',
    '1PET': '1PE', '2PET': '2PE', '1JOHN': '1JN', '2JOHN': '2JN', '3JOHN': '3JN',
    'JUDE': 'JUD', 'REV': 'REV',
  }
  return map[osis] || osis
}

function seedInterlinear(data) {
  db.exec('BEGIN')
  for (const verse of data) {
    const verseId = normalizeVerseId(verse.verse_id)
    for (const w of verse.words) {
      insertWord.run(
        verseId, w.word_index, w.language, w.original_text,
        w.transliteration ?? null, w.strongs_number ?? null,
        w.lemma ?? null, w.gloss ?? null, w.morphology ?? null
      )
      wordCount++
    }
  }
  db.exec('COMMIT')
}

seedInterlinear(otWords)
console.log(`  OT words: ${wordCount}`)

console.log('  Seeding interlinear NT...')
const ntWords = loadJson(join(PUBLIC, 'interlinear-data', 'interlinear-nt.json'))
seedInterlinear(ntWords)
console.log(`  Total words: ${wordCount}`)

// Seed Strong's definitions
console.log('  Seeding Strong\'s...')
const strongs = loadJson(join(PUBLIC, 'interlinear-data', 'strongs.json'))
const insertStrongs = db.prepare('INSERT OR REPLACE INTO strongs_definitions (number, language, transliteration, definition, pronunciation, word_count) VALUES (?, ?, ?, ?, ?, ?)')

db.exec('BEGIN')
for (const [num, entry] of Object.entries(strongs)) {
  insertStrongs.run(num, entry.language, entry.transliteration ?? null, entry.definition ?? null, entry.pronunciation ?? null, entry.word_count ?? null)
}
db.exec('COMMIT')
console.log(`  ${Object.keys(strongs).length} definitions`)

db.close()

// Gzip
const dbContent = readFileSync(dbPath)
const gzContent = gzipSync(dbContent, { level: 9 })
writeFileSync(gzPath, gzContent)

console.log(`\n=== Done ===`)
console.log(`  DB: ${fmtMB(dbContent.length)} MB`)
console.log(`  Gzip: ${fmtMB(gzContent.length)} MB (${((1 - gzContent.length / dbContent.length) * 100).toFixed(0)}% reduction)`)
console.log(`  Output: ${gzPath}`)
