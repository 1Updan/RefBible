import { exec } from './db'
import { getVersion } from './versions'
import { fetch } from '@tauri-apps/plugin-http'
import { KJV_BOOKS } from './utils'

const OSIS_TO_KJV: Record<string, string> = {}
for (const [kjv, osis] of KJV_BOOKS) {
  OSIS_TO_KJV[osis] = kjv
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

export interface DownloadProgress {
  phase: 'downloading' | 'installing'
  current: number
  total: number
}

export async function downloadAndInstall(
  code: string,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const meta = getVersion(code)
  if (!meta || !meta.url) throw new Error(`No download URL for ${code}`)
  if (meta.builtIn) throw new Error(`${meta.name} is built in and cannot be downloaded`)

  onProgress?.({ phase: 'downloading', current: 0, total: 1 })

  let text: string;
  try {
    const resp = await fetch(meta.url, { method: 'GET', connectTimeout: 30000 });
    text = await resp.text();
  } catch (e) {
    throw new Error(`Download failed: ${e instanceof Error ? e.message : String(e)}`);
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

  for (const book of bible.books) {
    const osis = book.book.toUpperCase()
    const kjvCode = OSIS_TO_KJV[osis]
    if (!kjvCode) {
      console.warn(`Unknown book code "${book.book}" — skipping`)
      continue
    }
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        const verseId = `${kjvCode}.${ch.chapter}.${v.number}`
        allTexts.push({ id: verseId, code, text: v.text })
      }
    }
  }

  // Clear any stale data for this version (e.g. from old downloads with wrong verse IDs)
  await exec('DELETE FROM content_text WHERE translation_code = $1', [code])

  const CHUNK = 200
  const total = allTexts.length

  onProgress?.({ phase: 'installing', current: 0, total })

  for (let i = 0; i < total; i += CHUNK) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const chunk = allTexts.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',')
    const binds: unknown[] = []
    for (const r of chunk) binds.push(r.id, r.code, r.text)

    await exec(
      `INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ${placeholders}`,
      binds,
    )

    onProgress?.({ phase: 'installing', current: Math.min(i + CHUNK, total), total })
  }
}


