import { exec, query } from './db'
import { getVersion } from './versions'

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
  bookId: number
  englishName: string
  testament: string
  chapters: DownloadedChapter[]
}

interface DownloadedBible {
  version: string
  name: string
  language: string
  license: string
  books: DownloadedBook[]
}

interface VerseRow {
  id: string
  book_id: number
  chapter_num: number
  verse_num: number
}

async function buildVerseLookup(): Promise<Map<number, Map<number, Map<number, string>>>> {
  const rows = await query<VerseRow>(
    'SELECT id, book_id, chapter_num, verse_num FROM verses'
  )
  const map = new Map<number, Map<number, Map<number, string>>>()
  for (const row of rows) {
    let bookMap = map.get(row.book_id)
    if (!bookMap) {
      bookMap = new Map()
      map.set(row.book_id, bookMap)
    }
    let chapterMap = bookMap.get(row.chapter_num)
    if (!chapterMap) {
      chapterMap = new Map()
      bookMap.set(row.chapter_num, chapterMap)
    }
    chapterMap.set(row.verse_num, row.id)
  }
  return map
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

export async function downloadAndInstall(code: string): Promise<void> {
  const meta = getVersion(code)
  if (!meta || !meta.url) throw new Error(`No download URL for ${code}`)
  if (meta.builtIn) throw new Error(`${meta.name} is built in and cannot be downloaded`)

  let text: string;
  try {
    const resp = await fetch(meta.url, { signal: AbortSignal.timeout(30_000) });
    text = await resp.text();
  } catch (e) {
    throw new Error(`Download failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (text.length > 50_000_000) throw new Error(`Download too large (${Math.round(text.length / 1_000_000)}MB)`)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON in downloaded translation')
  }

  const bible = validateDownloadedBible(parsed)

  await exec('DELETE FROM content_text WHERE translation_code = $1', [code])

  const verseLookup = await buildVerseLookup()
  const allTexts: { id: string; code: string; text: string }[] = []

  for (const book of bible.books) {
    const bookMap = verseLookup.get(book.bookId)
    if (!bookMap) throw new Error(`Unknown bookId ${book.bookId} (${book.book})`)
    for (const ch of book.chapters) {
      const chapterMap = bookMap.get(ch.chapter)
      if (!chapterMap) throw new Error(`Missing chapter ${ch.chapter} for bookId ${book.bookId}`)
      for (const v of ch.verses) {
        const verseId = chapterMap.get(v.number)
        if (!verseId) throw new Error(`Missing verse ${v.number} in ${book.bookId}.${ch.chapter}`)
        allTexts.push({ id: verseId, code, text: v.text })
      }
    }
  }

  const CHUNK = 200

  for (let i = 0; i < allTexts.length; i += CHUNK) {
    const chunk = allTexts.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',')
    const binds: unknown[] = []
    for (const r of chunk) binds.push(r.id, r.code, r.text)

    await exec(
      `INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ${placeholders}`,
      binds,
    )
  }
}


