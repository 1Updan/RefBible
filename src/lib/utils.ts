import { BOOKS } from '@/data/books'
import { toOsis } from '@/data/osis'

const OSIS_TO_BOOK: Record<string, string> = {}
const OSIS_TO_BOOK_ID: Record<string, number> = {}
for (const book of BOOKS) {
  const osis = toOsis(book.abbreviation)
  OSIS_TO_BOOK[osis] = book.name
  OSIS_TO_BOOK_ID[osis] = book.id
}

export function formatVerseId(verseId: string): string {
  const parts = verseId.split('.')
  if (parts.length < 3) return verseId
  const [osis, ch, v] = parts
  const bookName = OSIS_TO_BOOK[osis] ?? osis
  return `${bookName} ${ch}:${v}`
}

export function parseOsisId(verseId: string): { bookId: number; chapter: number; verseNum: number } | null {
  const parts = verseId.split('.')
  if (parts.length < 3) return null
  const [osis, ch, v] = parts
  const bookId = OSIS_TO_BOOK_ID[osis]
  if (!bookId) return null
  return { bookId, chapter: Number(ch), verseNum: Number(v) }
}
