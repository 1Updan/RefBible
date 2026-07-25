import { exec } from './db'
import { getVersion } from './versions'
import { fetch } from '@tauri-apps/plugin-http'
import { KJV_BOOKS } from './utils'

// The bundled verses table stores verse IDs in KJV format (PSA.1.1, MAT.5.14,
// MRK.10.27, JHN.1.1...). Downloaded bible JSONs use whatever the upstream
// project chose — the midvash/bible-data repo uses SHORT book codes that
// *mostly* look KJV-compatible (Gen, Exod, Ps, Prov, Isa, Matt, Mark, Luke,
// John, 1John, 2John, 3John, Acts, Rev...) but with a few twists:
//   - "Gen" → KJV "GEN", "Exod" → "EXO", "Matt" → "MAT", "Mark" → "MRK"
//   - "John" → "JHN" (full name, NOT an abbreviation)
//   - "1John", "2John", "3John" → "1JHN", "2JHN", "3JHN"
//   - "Ps" → "PSA"
// We index by EVERY form we've ever seen so downloads never silently drop
// books because of a missing alias.
const BOOK_CODE_TO_KJV: Record<string, string> = {}

// 1) KJV code -> itself (identity)
// 2) OSIS code -> KJV
for (const [kjv, osis] of KJV_BOOKS) {
  BOOK_CODE_TO_KJV[kjv] = kjv
  BOOK_CODE_TO_KJV[osis] = kjv
}

// 3) Full / short human names (case-insensitive comparison done at lookup time
// via .toUpperCase(), so the keys here must be uppercase).
const FULL_NAME_ALIASES: Record<string, string> = {
  GENESIS: 'GEN', EXODUS: 'EXO', LEVITICUS: 'LEV', NUMBERS: 'NUM',
  DEUTERONOMY: 'DEU', JOSHUA: 'JOS', JUDGES: 'JDG', RUTH: 'RUT',
  '1SAMUEL': '1SA', '2SAMUEL': '2SA', '1KINGS': '1KI', '2KINGS': '2KI',
  '1CHRONICLES': '1CH', '2CHRONICLES': '2CH', EZRA: 'EZR', NEHEMIAH: 'NEH',
  ESTHER: 'EST', JOB: 'JOB', PSALMS: 'PSA', PSALM: 'PSA', PROVERBS: 'PRO',
  ECCLESIASTES: 'ECC', 'SONGOFSONGS': 'SNG', 'SONGOFSOLOMON': 'SNG',
  ISAIAH: 'ISA', JEREMIAH: 'JER', LAMENTATIONS: 'LAM', EZEKIEL: 'EZK',
  DANIEL: 'DAN', HOSEA: 'HOS', JOEL: 'JOL', AMOS: 'AMO', OBADIAH: 'OBA',
  JONAH: 'JON', MICAH: 'MIC', NAHUM: 'NAM', HABAKKUK: 'HAB',
  ZEPHANIAH: 'ZEP', HAGGAI: 'HAG', ZECHARIAH: 'ZEC', MALACHI: 'MAL',
  MATTHEW: 'MAT', MARK: 'MRK', LUKE: 'LUK', JOHN: 'JHN', ACTS: 'ACT',
  ROMANS: 'ROM', '1CORINTHIANS': '1CO', '2CORINTHIANS': '2CO',
  GALATIANS: 'GAL', EPHESIANS: 'EPH', PHILIPPIANS: 'PHP', COLOSSIANS: 'COL',
  '1THESSALONIANS': '1TH', '2THESSALONIANS': '2TH',
  '1TIMOTHY': '1TI', '2TIMOTHY': '2TI', TITUS: 'TIT', PHILEMON: 'PHM',
  HEBREWS: 'HEB', JAMES: 'JAS', '1PETER': '1PE', '2PETER': '2PE',
  '1JOHN': '1JN', '2JOHN': '2JN', '3JOHN': '3JN', JUDE: 'JUD',
  REVELATION: 'REV', 'REVELATIONS': 'REV',
}
for (const [alias, kjv] of Object.entries(FULL_NAME_ALIASES)) {
  BOOK_CODE_TO_KJV[alias] = kjv
}

interface DownloadedVerse {
  number: number
  text: string
}

interface DownloadedChapter {
  chapter: number
  verses: DownloadedVerse[]
}

interface DownloadedBook {
  book: string
  bookId?: number
  englishName?: string
  testament?: string
  chapters: DownloadedChapter[]
}

interface DownloadedBible {
  version: string
  name: string
  language: string
  license: string
  books: DownloadedBook[]
}

function validateDownloadedBible(data: unknown): DownloadedBible {
  if (!data || typeof data !== 'object') throw new Error('Invalid format: expected an object')
  const obj = data as Record<string, unknown>
  if (typeof obj.version !== 'string') throw new Error('Invalid format: missing version')
  if (typeof obj.name !== 'string') throw new Error('Invalid format: missing name')
  if (!Array.isArray(obj.books)) throw new Error('Invalid format: missing books array')
  for (const book of obj.books) {
    if (!book || typeof book !== 'object') throw new Error('Invalid format: book entry is not an object')
    const b = book as Record<string, unknown>
    if (typeof b.book !== 'string') throw new Error('Invalid format: book missing book code')
    if (!Array.isArray(b.chapters)) throw new Error('Invalid format: book missing chapters')
    for (const ch of b.chapters) {
      if (!ch || typeof ch !== 'object') throw new Error('Invalid format: chapter entry is not an object')
      const c = ch as Record<string, unknown>
      if (typeof c.chapter !== 'number') throw new Error('Invalid format: chapter missing chapter number')
      if (!Array.isArray(c.verses)) throw new Error('Invalid format: chapter missing verses')
      for (const v of c.verses) {
        if (!v || typeof v !== 'object') throw new Error('Invalid format: verse entry is not an object')
        const ve = v as Record<string, unknown>
        if (typeof ve.number !== 'number') throw new Error('Invalid format: verse missing number')
        if (typeof ve.text !== 'string') throw new Error('Invalid format: verse missing text')
      }
    }
  }
  return data as DownloadedBible
}

export interface DownloadProgress {
  phase: 'downloading' | 'installing'
  current: number
  total: number
}

// Install a downloaded translation into content_text. We map the JSON's
// book code (which can be KJV/OSIS/full-name form) to the KJV code our DB
// uses, then build verse IDs as `${kjvCode}.${chapter}.${verse}` directly —
// we do NOT depend on a verses-table lookup, so this works even before the
// verse rows exist or in any DB state. INSERT OR IGNORE so re-installs are
// safe and partial downloads don't poison the table.
export async function downloadAndInstall(
  code: string,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const meta = getVersion(code)
  if (!meta || !meta.url) throw new Error(`No download URL for ${code}`)
  if (meta.builtIn) throw new Error(`${meta.name} is built in and cannot be downloaded`)

  onProgress?.({ phase: 'downloading', current: 0, total: 1 })

  let text: string
  try {
    // Tauri plugin-http's fetch — required on Android where the WebView's
    // global fetch is blocked by CSP. connectTimeout is the plugin's option
    // (NOT the standard AbortSignal.timeout, which the plugin doesn't support).
    const resp = await fetch(meta.url, { method: 'GET', connectTimeout: 30000 })
    text = await resp.text()
  } catch (e) {
    throw new Error(`Download failed: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (text.length > 50_000_000) throw new Error(`Download too large (${Math.round(text.length / 1_000_000)}MB)`)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON in downloaded translation')
  }

  const bible = validateDownloadedBible(parsed)

  const allTexts: { id: string; code: string; text: string }[] = []
  let skippedBooks = 0

  for (const book of bible.books) {
    const rawCode = String(book.book ?? '').toUpperCase()
    const kjvCode = BOOK_CODE_TO_KJV[rawCode]
    if (!kjvCode) {
      console.warn(`[downloader] Unknown book code "${book.book}" — skipping`)
      skippedBooks++
      continue
    }
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        const verseId = `${kjvCode}.${ch.chapter}.${v.number}`
        allTexts.push({ id: verseId, code, text: v.text })
      }
    }
  }

  if (allTexts.length === 0) {
    throw new Error(
      `Downloaded ${code} produced 0 verse rows${skippedBooks > 0 ? ` (skipped ${skippedBooks} unknown book codes)` : ''}. The JSON shape may not match the expected format.`,
    )
  }

  // Clear any stale data for this version (so re-installs replace, not append-duplicate).
  await exec('DELETE FROM content_text WHERE translation_code = $1', [code])

  const CHUNK = 200
  const total = allTexts.length
  onProgress?.({ phase: 'installing', current: 0, total })

  for (let i = 0; i < total; i += CHUNK) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const chunk = allTexts.slice(i, i + CHUNK)
    const placeholders = chunk
      .map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`)
      .join(',')
    const binds: unknown[] = []
    for (const r of chunk) binds.push(r.id, r.code, r.text)

    await exec(
      `INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ${placeholders}`,
      binds,
    )

    onProgress?.({ phase: 'installing', current: Math.min(i + CHUNK, total), total })
  }
}
