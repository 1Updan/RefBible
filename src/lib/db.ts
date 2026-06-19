import Database from '@tauri-apps/plugin-sql'
import type { Verse, ContentText, CrossReference, Bookmark, Note } from '@/types/db'
import { toOsis } from '@/data/osis'
import { parseReference } from './utils'

let db: Database | null = null
let seeded = false

function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

interface KjvVerse {
  n: number
  t: string
}

interface KjvChapter {
  c: number
  v: KjvVerse[]
}

interface KjvBook {
  b: string
  i: number
  n: string
  t: string
  ch: KjvChapter[]
}

interface KjvData {
  books: KjvBook[]
}

export async function getDb(): Promise<Database> {
  if (!isTauriContext()) {
    throw new Error('This app requires a Tauri shell. Run "pnpm tauri dev" instead of "pnpm dev".')
  }
  if (!db) {
    db = await Database.load('sqlite:refbible.db')
  }
  return db
}

export async function ensureSeeded(): Promise<void> {
  if (seeded) return
  const conn = await getDb()
  const rows = await conn.select<{ count: number }[]>('SELECT COUNT(*) as count FROM verses')
  if (rows[0].count === 0) {
    await seedAll(conn)
  } else {
    const nasbCount = await conn.select<{ count: number }[]>("SELECT COUNT(*) as count FROM content_text WHERE translation_code = 'NASB'")
    if (nasbCount[0].count < 30000) {
      await conn.execute("DELETE FROM content_text WHERE translation_code = 'NASB'")
      await seedNasbOnly(conn)
    }
  }
  seeded = true
}

async function seedNasbOnly(conn: Database): Promise<void> {
  const resp = await fetch('/nasb.json')
  const data: KjvData = await resp.json()

  const allTexts: { id: string; text: string }[] = []

  for (const book of data.books) {
    const osis = toOsis(book.b)
    for (const ch of book.ch) {
      for (const v of ch.v) {
        allTexts.push({ id: `${osis}.${ch.c}.${v.n}`, text: v.t })
      }
    }
  }

  const CHUNK = 200
  for (let i = 0; i < allTexts.length; i += CHUNK) {
    const chunk = allTexts.slice(i, i + CHUNK)
    const binds: unknown[] = []
    for (const r of chunk) binds.push(r.id, 'NASB', r.text)
    const phs = chunk.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',')
    await conn.execute(`INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ${phs}`, binds)
  }
}

async function seedAll(conn: Database): Promise<void> {
  const resp = await fetch('/kjv.json')
  const data: KjvData = await resp.json()

  const allVerses: { id: string; bookId: number; ch: number; vn: number }[] = []
  const allTexts: { id: string; code: string; text: string }[] = []

  for (const book of data.books) {
    const osis = toOsis(book.b)
    for (const ch of book.ch) {
      for (const v of ch.v) {
        const verseId = `${osis}.${ch.c}.${v.n}`
        allVerses.push({ id: verseId, bookId: book.i, ch: ch.c, vn: v.n })
        allTexts.push({ id: verseId, code: 'KJV', text: v.t })
      }
    }
  }

  const CHUNK = 200
  for (let i = 0; i < allVerses.length; i += CHUNK) {
    const chunk = allVerses.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(',')
    const binds: unknown[] = []
    for (const r of chunk) binds.push(r.id, r.bookId, r.ch, r.vn)
    await conn.execute(
      `INSERT OR IGNORE INTO verses (id, book_id, chapter_num, verse_num) VALUES ${placeholders}`,
      binds,
    )
  }

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

  await seedNasbOnly(conn)

  const xrefResp = await fetch('/crossrefs.json')
  const xrefs: { origin: string; target: string }[] = await xrefResp.json()

  const XREF_CHUNK = 500
  for (let i = 0; i < xrefs.length; i += XREF_CHUNK) {
    const chunk = xrefs.slice(i, i + XREF_CHUNK)
    const placeholders = chunk.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2}, 0)`).join(',')
    const binds: string[] = []
    for (const r of chunk) binds.push(r.origin, r.target)
    await conn.execute(
      `INSERT OR IGNORE INTO cross_references (origin_verse_id, target_verse_id, thematic_weight) VALUES ${placeholders}`,
      binds,
    )
  }
}

export async function getVerses(bookId: number, chapter: number): Promise<Verse[]> {
  const conn = await getDb()
  return conn.select<Verse[]>(
    'SELECT id, book_id, chapter_num, verse_num FROM verses WHERE book_id = $1 AND chapter_num = $2 ORDER BY verse_num',
    [bookId, chapter],
  )
}

export async function getTranslations(verseId: string): Promise<ContentText[]> {
  const conn = await getDb()
  return conn.select<ContentText[]>(
    'SELECT id, verse_id, translation_code, text_data FROM content_text WHERE verse_id = $1',
    [verseId],
  )
}

export async function getCrossReferences(verseId: string): Promise<CrossReference[]> {
  const conn = await getDb()
  return conn.select<CrossReference[]>(
    'SELECT id, origin_verse_id, target_verse_id, thematic_weight FROM cross_references WHERE origin_verse_id = $1 ORDER BY thematic_weight DESC',
    [verseId],
  )
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const conn = await getDb()
  return conn.select<Bookmark[]>('SELECT id, verse_id, created_at FROM bookmarks ORDER BY created_at DESC')
}

export async function saveBookmark(verseId: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('INSERT OR IGNORE INTO bookmarks (verse_id) VALUES ($1)', [verseId])
}

export async function removeBookmark(verseId: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('DELETE FROM bookmarks WHERE verse_id = $1', [verseId])
}

export async function getNotes(verseId: string): Promise<Note[]> {
  const conn = await getDb()
  return conn.select<Note[]>(
    'SELECT id, verse_id, text_content, created_at FROM notes WHERE verse_id = $1 ORDER BY created_at DESC',
    [verseId],
  )
}

export async function saveNote(verseId: string, text: string): Promise<Note> {
  const conn = await getDb()
  const existing = await conn.select<Note[]>(
    'SELECT id, verse_id, text_content, created_at FROM notes WHERE verse_id = $1 ORDER BY created_at DESC LIMIT 1',
    [verseId],
  )
  if (existing.length > 0) {
    await conn.execute('UPDATE notes SET text_content = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2', [text, existing[0].id])
    return { ...existing[0], text_content: text, created_at: new Date().toISOString() }
  }
  await conn.execute('INSERT INTO notes (verse_id, text_content) VALUES ($1, $2)', [verseId, text])
  const rows = await conn.select<Note[]>(
    'SELECT id, verse_id, text_content, created_at FROM notes WHERE verse_id = $1 ORDER BY created_at DESC LIMIT 1',
    [verseId],
  )
  return rows[0]
}

export async function deleteNote(verseId: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('DELETE FROM notes WHERE verse_id = $1', [verseId])
}

export async function getAllNotes(): Promise<Note[]> {
  const conn = await getDb()
  return conn.select<Note[]>('SELECT id, verse_id, text_content, created_at FROM notes ORDER BY created_at DESC')
}

export async function getNotesForChapter(bookId: number, chapter: number): Promise<Set<string>> {
  const conn = await getDb()
  const rows = await conn.select<{ verse_id: string }[]>(
    `SELECT DISTINCT n.verse_id FROM notes n
     JOIN verses v ON v.id = n.verse_id
     WHERE v.book_id = $1 AND v.chapter_num = $2`,
    [bookId, chapter],
  )
  return new Set(rows.map((r) => r.verse_id))
}

export async function checkCache(verseId: string, mode: string): Promise<string | null> {
  const conn = await getDb()
  const rows = await conn.select<{ cached_response: string }[]>(
    'SELECT cached_response FROM ai_commentary_cache WHERE verse_id = $1 AND query_mode = $2 ORDER BY timestamp DESC LIMIT 1',
    [verseId, mode],
  )
  return rows.length > 0 ? rows[0].cached_response : null
}

export async function writeCache(verseId: string, mode: string, response: string): Promise<void> {
  const conn = await getDb()
  await conn.execute(
    'INSERT INTO ai_commentary_cache (verse_id, query_mode, cached_response) VALUES ($1, $2, $3)',
    [verseId, mode, response],
  )
}

export async function getInstalledTranslations(): Promise<string[]> {
  const conn = await getDb()
  const rows = await conn.select<{ translation_code: string }[]>(
    'SELECT DISTINCT translation_code FROM content_text ORDER BY translation_code',
  )
  return rows.map((r) => r.translation_code)
}

export async function removeTranslation(code: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('DELETE FROM content_text WHERE translation_code = $1', [code])
}

export interface SearchResult {
  verse_id: string
  book_id: number
  chapter_num: number
  verse_num: number
  translation_code: string
  text_data: string
}

export async function searchVerses(query: string, versions?: string[]): Promise<SearchResult[]> {
  const conn = await getDb()
  const ref = parseReference(query)

  function withVersionFilter(startParam: number): string {
    if (!versions || versions.length === 0) return ''
    return ` AND ct.translation_code IN (${versions.map((_, i) => `$${startParam + i}`).join(',')})`
  }

  if (ref) {
    if (ref.verse) {
      if (ref.verseEnd) {
        const binds: unknown[] = [ref.bookId, ref.chapter, ref.verse, ref.verseEnd]
        if (versions) binds.push(...versions)
        return conn.select<SearchResult[]>(
          `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE v.book_id = $1 AND v.chapter_num = $2 AND v.verse_num BETWEEN $3 AND $4${withVersionFilter( 5)}
ORDER BY v.verse_num, ct.translation_code`,
          binds,
        )
      }
      const binds: unknown[] = [ref.bookId, ref.chapter, ref.verse]
      if (versions) binds.push(...versions)
      return conn.select<SearchResult[]>(
        `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE v.book_id = $1 AND v.chapter_num = $2 AND v.verse_num = $3${withVersionFilter( 4)}
ORDER BY ct.translation_code`,
        binds,
      )
    }
    const binds: unknown[] = [ref.bookId, ref.chapter]
    if (versions) binds.push(...versions)
    return conn.select<SearchResult[]>(
      `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE v.book_id = $1 AND v.chapter_num = $2${withVersionFilter( 3)}
ORDER BY v.verse_num, ct.translation_code`,
      binds,
    )
  }

  const binds: unknown[] = [`%${query}%`]
  if (versions) binds.push(...versions)
  const verParam = versions && versions.length > 0 ? 2 : 0
  return conn.select<SearchResult[]>(
    `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE ct.text_data LIKE $1${verParam > 0 ? ` AND ct.translation_code IN (${versions!.map((_, i) => `$${verParam + i}`).join(',')})` : ''}
ORDER BY v.book_id, v.chapter_num, v.verse_num
LIMIT 100`,
    binds,
  )
}
