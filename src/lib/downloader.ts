import { getDb } from './db'
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

  const resp = await fetch(meta.url)
  if (!resp.ok) throw new Error(`Failed to fetch ${meta.name}: ${resp.status} ${resp.statusText}`)

  const contentLength = resp.headers.get('Content-Length')
  if (contentLength && Number(contentLength) > 10_000_000) {
    throw new Error(`Download too large (${Math.round(Number(contentLength) / 1_000_000)}MB)`)
  }

  const text = await resp.text()
  if (text.length > 10_000_000) throw new Error(`Download too large (${Math.round(text.length / 1_000_000)}MB)`)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON in downloaded translation')
  }

  const bible = validateDownloadedBible(parsed)

  const conn = await getDb()

  const allTexts: { id: string; code: string; text: string }[] = []

  for (const book of bible.books) {
    const osis = book.book.toUpperCase()
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        const verseId = `${osis}.${ch.chapter}.${v.number}`
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

    await conn.execute(
      `INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ${placeholders}`,
      binds,
    )
  }
}

export async function uninstallVersion(code: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('DELETE FROM content_text WHERE translation_code = $1', [code])
}
