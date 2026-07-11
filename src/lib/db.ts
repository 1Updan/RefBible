import { invoke } from '@tauri-apps/api/core'
import type { Verse, ContentText, CrossReference, Bookmark, Note, InterlinearWord, StrongsEntry, Highlight } from '@/types/db'
import { parseReference } from './utils'

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return invoke<T[]>('db_query', { sql, params })
}

export async function exec(sql: string, params: unknown[] = []): Promise<void> {
  await invoke<number>('db_execute', { sql, params })
}

export async function getVerses(bookId: number, chapter: number): Promise<Verse[]> {
  return query<Verse>(
    'SELECT id, book_id, chapter_num, verse_num FROM verses WHERE book_id = $1 AND chapter_num = $2 ORDER BY verse_num',
    [bookId, chapter],
  )
}

export async function getTranslations(verseId: string): Promise<ContentText[]> {
  return query<ContentText>(
    'SELECT id, verse_id, translation_code, text_data FROM content_text WHERE verse_id = $1',
    [verseId],
  )
}

export async function getCrossReferences(verseId: string): Promise<CrossReference[]> {
  return query<CrossReference>(
    'SELECT id, origin_verse_id, target_verse_id, thematic_weight FROM cross_references WHERE origin_verse_id = $1 ORDER BY thematic_weight DESC',
    [verseId],
  )
}

export async function getBookmarks(): Promise<Bookmark[]> {
  return query<Bookmark>('SELECT id, verse_id, created_at FROM bookmarks ORDER BY created_at DESC')
}

export async function saveBookmark(verseId: string): Promise<void> {
  await exec('INSERT OR IGNORE INTO bookmarks (verse_id) VALUES ($1)', [verseId])
}

export async function removeBookmark(verseId: string): Promise<void> {
  await exec('DELETE FROM bookmarks WHERE verse_id = $1', [verseId])
}

export async function getNotes(verseId: string): Promise<Note[]> {
  return query<Note>(
    'SELECT id, verse_id, text_content, created_at FROM notes WHERE verse_id = $1 ORDER BY created_at DESC',
    [verseId],
  )
}

export async function saveNote(verseId: string, text: string): Promise<Note> {
  const existing = await query<Note>(
    'SELECT id, verse_id, text_content, created_at FROM notes WHERE verse_id = $1 ORDER BY created_at DESC LIMIT 1',
    [verseId],
  )
  if (existing.length > 0) {
    await exec('UPDATE notes SET text_content = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2', [text, existing[0].id])
    return { ...existing[0], text_content: text, created_at: new Date().toISOString() }
  }
  await exec('INSERT INTO notes (verse_id, text_content) VALUES ($1, $2)', [verseId, text])
  const rows = await query<Note>(
    'SELECT id, verse_id, text_content, created_at FROM notes WHERE verse_id = $1 ORDER BY created_at DESC LIMIT 1',
    [verseId],
  )
  return rows[0]
}

export async function deleteNote(verseId: string): Promise<void> {
  await exec('DELETE FROM notes WHERE verse_id = $1', [verseId])
}

export async function getAllNotes(): Promise<Note[]> {
  return query<Note>('SELECT id, verse_id, text_content, created_at FROM notes ORDER BY created_at DESC')
}

export async function getNotesForChapter(bookId: number, chapter: number): Promise<Set<string>> {
  const rows = await query<{ verse_id: string }>(
    `SELECT DISTINCT n.verse_id FROM notes n
     JOIN verses v ON v.id = n.verse_id
     WHERE v.book_id = $1 AND v.chapter_num = $2`,
    [bookId, chapter],
  )
  return new Set(rows.map((r) => r.verse_id))
}

export async function checkCache(verseId: string, mode: string): Promise<string | null> {
  const rows = await query<{ cached_response: string }>(
    'SELECT cached_response FROM ai_commentary_cache WHERE verse_id = $1 AND query_mode = $2 ORDER BY timestamp DESC LIMIT 1',
    [verseId, mode],
  )
  return rows.length > 0 ? rows[0].cached_response : null
}

export async function writeCache(verseId: string, mode: string, response: string): Promise<void> {
  await exec(
    'INSERT INTO ai_commentary_cache (verse_id, query_mode, cached_response) VALUES ($1, $2, $3)',
    [verseId, mode, response],
  )
}

export async function getInstalledTranslations(): Promise<string[]> {
  const rows = await query<{ translation_code: string }>(
    'SELECT DISTINCT translation_code FROM content_text ORDER BY translation_code',
  )
  return rows.map((r) => r.translation_code)
}

export async function removeTranslation(code: string): Promise<void> {
  await exec('DELETE FROM content_text WHERE translation_code = $1', [code])
}

export interface SearchResult {
  verse_id: string
  book_id: number
  chapter_num: number
  verse_num: number
  translation_code: string
  text_data: string
}

export async function searchVerses(search: string, versions?: string[]): Promise<SearchResult[]> {
  const ref = parseReference(search)

  function withVersionFilter(startParam: number): string {
    if (!versions || versions.length === 0) return ''
    return ` AND ct.translation_code IN (${versions.map((_, i) => `$${startParam + i}`).join(',')})`
  }

  if (ref) {
    if (ref.verse) {
      if (ref.verseEnd) {
        const binds: unknown[] = [ref.bookId, ref.chapter, ref.verse, ref.verseEnd]
        if (versions) binds.push(...versions)
        return query<SearchResult>(
          `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE v.book_id = $1 AND v.chapter_num = $2 AND v.verse_num BETWEEN $3 AND $4${withVersionFilter( 5)}
ORDER BY v.verse_num, ct.translation_code`,
          binds,
        )
      }
      const binds: unknown[] = [ref.bookId, ref.chapter, ref.verse]
      if (versions) binds.push(...versions)
      return query<SearchResult>(
        `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE v.book_id = $1 AND v.chapter_num = $2 AND v.verse_num = $3${withVersionFilter( 4)}
ORDER BY ct.translation_code`,
        binds,
      )
    }
    const binds: unknown[] = [ref.bookId, ref.chapter]
    if (versions) binds.push(...versions)
    return query<SearchResult>(
      `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE v.book_id = $1 AND v.chapter_num = $2${withVersionFilter( 3)}
ORDER BY v.verse_num, ct.translation_code`,
      binds,
    )
  }

  const binds: unknown[] = [`%${search}%`]
  if (versions) binds.push(...versions)
  const verParam = versions && versions.length > 0 ? 2 : 0
  return query<SearchResult>(
    `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
FROM content_text ct JOIN verses v ON v.id = ct.verse_id
WHERE ct.text_data LIKE $1${verParam > 0 ? ` AND ct.translation_code IN (${versions!.map((_, i) => `$${verParam + i}`).join(',')})` : ''}
ORDER BY v.book_id, v.chapter_num, v.verse_num
LIMIT 100`,
    binds,
  )
}

export async function getInterlinearWords(verseId: string): Promise<InterlinearWord[]> {
  return query<InterlinearWord>(
    'SELECT id, verse_id, word_index, language, original_text, transliteration, strongs_number, lemma, gloss, morphology FROM interlinear_words WHERE verse_id = $1 ORDER BY word_index',
    [verseId],
  )
}

export async function getStrongsEntry(number: string): Promise<StrongsEntry | null> {
  const rows = await query<StrongsEntry>(
    'SELECT number, language, transliteration, definition, pronunciation, word_count FROM strongs_definitions WHERE number = $1',
    [number],
  )
  return rows.length > 0 ? rows[0] : null
}

export async function getHighlights(): Promise<Map<string, string[]>> {
  const rows = await query<Highlight>(
    'SELECT id, verse_id, color, created_at FROM highlights ORDER BY created_at',
  )
  const map = new Map<string, string[]>()
  for (const r of rows) {
    const colors = map.get(r.verse_id) ?? []
    colors.push(r.color)
    map.set(r.verse_id, colors)
  }
  return map
}

export async function getHighlightsForChapter(bookId: number, chapter: number): Promise<Map<string, string[]>> {
  const rows = await query<{ verse_id: string; color: string }>(
    `SELECT h.verse_id, h.color FROM highlights h
     JOIN verses v ON v.id = h.verse_id
     WHERE v.book_id = $1 AND v.chapter_num = $2`,
    [bookId, chapter],
  )
  const map = new Map<string, string[]>()
  for (const r of rows) {
    const colors = map.get(r.verse_id) ?? []
    colors.push(r.color)
    map.set(r.verse_id, colors)
  }
  return map
}

export async function toggleHighlight(verseId: string, color: string): Promise<void> {
  await exec(
    'INSERT OR IGNORE INTO highlights (verse_id, color) VALUES ($1, $2)',
    [verseId, color],
  )
}

export async function removeHighlight(verseId: string, color: string): Promise<void> {
  await exec(
    'DELETE FROM highlights WHERE verse_id = $1 AND color = $2',
    [verseId, color],
  )
}

export async function getUserCrossReferences(verseId: string): Promise<(CrossReference & { user_created: boolean })[]> {
  const rows = await query<(CrossReference & { user_created: boolean })>(
    `SELECT id, origin_verse_id, target_verse_id, created_at, 1 as user_created
     FROM user_custom_cross_references
     WHERE origin_verse_id = $1
     ORDER BY created_at DESC`,
    [verseId],
  )
  return rows
}

export async function addCustomCrossReference(originVerseId: string, targetVerseId: string): Promise<void> {
  await exec(
    'INSERT OR IGNORE INTO user_custom_cross_references (origin_verse_id, target_verse_id) VALUES ($1, $2)',
    [originVerseId, targetVerseId],
  )
}

export async function removeCustomCrossReference(id: number): Promise<void> {
  await exec(
    'DELETE FROM user_custom_cross_references WHERE id = $1',
    [id],
  )
}

export interface BackupData {
  bookmarks: { verse_id: string; created_at: string }[]
  notes: { verse_id: string; text_content: string; created_at: string }[]
  highlights: { verse_id: string; color: string; created_at: string }[]
  user_cross_references: { origin_verse_id: string; target_verse_id: string; created_at: string }[]
}

export async function exportBackupData(): Promise<BackupData> {
  const [bookmarks, notes, highlights, user_cross_references] = await Promise.all([
    query<{ verse_id: string; created_at: string }>('SELECT verse_id, created_at FROM bookmarks ORDER BY created_at'),
    query<{ verse_id: string; text_content: string; created_at: string }>('SELECT verse_id, text_content, created_at FROM notes ORDER BY created_at'),
    query<{ verse_id: string; color: string; created_at: string }>('SELECT verse_id, color, created_at FROM highlights ORDER BY created_at'),
    query<{ origin_verse_id: string; target_verse_id: string; created_at: string }>('SELECT origin_verse_id, target_verse_id, created_at FROM user_custom_cross_references ORDER BY created_at'),
  ])
  return { bookmarks, notes, highlights, user_cross_references }
}

export async function importBackupData(data: BackupData): Promise<void> {
  await exec('DELETE FROM bookmarks')
  await exec('DELETE FROM notes')
  await exec('DELETE FROM highlights')
  await exec('DELETE FROM user_custom_cross_references')

  const CHUNK = 200

  async function batchInsert<T>(table: string, columns: string[], rows: T[], extract: (row: T) => unknown[]) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const placeholders = chunk.map((_, j) => {
        const base = j * columns.length + 1
        return `($${[...Array(columns.length)].map((_, k) => base + k).join(', $')})`
      }).join(', ')
      const binds: unknown[] = []
      for (const r of chunk) binds.push(...extract(r))
      await exec(
        `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
        binds,
      )
    }
  }

  await batchInsert('bookmarks', ['verse_id', 'created_at'], data.bookmarks, (b) => [b.verse_id, b.created_at])
  await batchInsert('notes', ['verse_id', 'text_content', 'created_at'], data.notes, (n) => [n.verse_id, n.text_content, n.created_at])
  await batchInsert('highlights', ['verse_id', 'color', 'created_at'], data.highlights, (h) => [h.verse_id, h.color, h.created_at])
  await batchInsert('user_custom_cross_references', ['origin_verse_id', 'target_verse_id', 'created_at'], data.user_cross_references, (x) => [x.origin_verse_id, x.target_verse_id, x.created_at])
}


