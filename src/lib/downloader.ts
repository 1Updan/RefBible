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

export async function downloadAndInstall(code: string): Promise<void> {
  const meta = getVersion(code)
  if (!meta || !meta.url) throw new Error(`No download URL for ${code}`)
  if (meta.builtIn) throw new Error(`${meta.name} is built in and cannot be downloaded`)

  const resp = await fetch(meta.url)
  if (!resp.ok) throw new Error(`Failed to fetch ${meta.name}: ${resp.status} ${resp.statusText}`)

  const bible: DownloadedBible = await resp.json()

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
  let imported = 0

  for (let i = 0; i < allTexts.length; i += CHUNK) {
    const chunk = allTexts.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',')
    const binds: unknown[] = []
    for (const r of chunk) binds.push(r.id, r.code, r.text)

    await conn.execute(
      `INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ${placeholders}`,
      binds,
    )

    imported += chunk.length
  }
}

export async function uninstallVersion(code: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('DELETE FROM content_text WHERE translation_code = $1', [code])
}
