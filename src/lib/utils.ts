import { BOOKS } from '@/data/books'
import { toOsis } from '@/data/osis'

const OSIS_TO_BOOK: Record<string, string> = {}
const OSIS_TO_BOOK_ID: Record<string, number> = {}
const BOOK_MAP: Record<string, number> = {}
for (const book of BOOKS) {
  const osis = toOsis(book.abbreviation)
  OSIS_TO_BOOK[osis] = book.name
  OSIS_TO_BOOK_ID[osis] = book.id
  const nameKey = book.name.toLowerCase().replace(/\s+/g, '')
  const abbrKey = book.abbreviation.toLowerCase()
  BOOK_MAP[nameKey] = book.id
  BOOK_MAP[abbrKey] = book.id
  BOOK_MAP[osis.toLowerCase()] = book.id
}
// Common aliases
const aliasList: [string, string][] = [
  ['mat', 'Matt'], ['mt', 'Matt'],
  ['mk', 'Mark'], ['mr', 'Mark'],
  ['lk', 'Luke'], ['luke', 'Luke'],
  ['jn', 'John'], ['jhn', 'John'],
  ['acts', 'Acts'],
  ['rom', 'Rom'], ['ro', 'Rom'],
  ['1cor', '1Cor'], ['1co', '1Cor'],
  ['2cor', '2Cor'], ['2co', '2Cor'],
  ['gal', 'Gal'], ['ga', 'Gal'],
  ['eph', 'Eph'],
  ['phil', 'Phil'], ['phi', 'Phil'],
  ['col', 'Col'],
  ['1thes', '1Thess'], ['1thess', '1Thess'],
  ['2thes', '2Thess'], ['2thess', '2Thess'],
  ['1tim', '1Tim'],
  ['2tim', '2Tim'],
  ['titus', 'Titus'],
  ['philem', 'Phlm'], ['philemon', 'Phlm'],
  ['heb', 'Heb'],
  ['jas', 'Jas'], ['jam', 'Jas'], ['james', 'Jas'],
  ['1pet', '1Pet'], ['1pe', '1Pet'],
  ['2pet', '2Pet'], ['2pe', '2Pet'],
  ['1jn', '1John'], ['1john', '1John'],
  ['2jn', '2John'], ['2john', '2John'],
  ['3jn', '3John'], ['3john', '3John'],
  ['jude', 'Jude'],
  ['rev', 'Rev'],
  ['ps', 'Ps'], ['psa', 'Ps'], ['psalm', 'Ps'],
  ['prov', 'Prov'], ['pro', 'Prov'],
  ['ecc', 'Eccl'], ['ecclesiastes', 'Eccl'],
  ['song', 'Song'], ['sos', 'Song'],
  ['isa', 'Isa'], ['is', 'Isa'],
  ['jer', 'Jer'], ['je', 'Jer'],
  ['lam', 'Lam'],
  ['ezek', 'Ezek'], ['eze', 'Ezek'],
  ['dan', 'Dan'], ['dn', 'Dan'],
  ['hos', 'Hos'],
  ['joel', 'Joel'],
  ['amos', 'Amos'],
  ['obad', 'Obad'],
  ['jonah', 'Jonah'], ['jon', 'Jonah'],
  ['mic', 'Mic'],
  ['nah', 'Nah'],
  ['hab', 'Hab'],
  ['zeph', 'Zeph'], ['zep', 'Zeph'],
  ['hag', 'Hag'],
  ['zech', 'Zech'], ['zec', 'Zech'],
  ['mal', 'Mal'],
  ['gen', 'Gen'], ['gn', 'Gen'],
  ['ex', 'Exod'], ['exo', 'Exod'], ['exodus', 'Exod'],
  ['lev', 'Lev'], ['lv', 'Lev'],
  ['num', 'Num'], ['nm', 'Num'], ['numbers', 'Num'],
  ['deut', 'Deut'], ['dt', 'Deut'],
  ['josh', 'Josh'], ['jos', 'Josh'],
  ['judg', 'Judg'], ['jdg', 'Judg'],
  ['ruth', 'Ruth'], ['ru', 'Ruth'],
  ['1sam', '1Sam'], ['1sa', '1Sam'],
  ['2sam', '2Sam'], ['2sa', '2Sam'],
  ['1kgs', '1Kgs'], ['1ki', '1Kgs'], ['1kings', '1Kgs'],
  ['2kgs', '2Kgs'], ['2ki', '2Kgs'], ['2kings', '2Kgs'],
  ['1chr', '1Chr'], ['1ch', '1Chr'],
  ['2chr', '2Chr'], ['2ch', '2Chr'],
  ['ezra', 'Ezra'], ['ez', 'Ezra'],
  ['neh', 'Neh'], ['ne', 'Neh'],
  ['est', 'Esth'], ['esther', 'Esth'],
  ['job', 'Job'], ['jb', 'Job'],
]
for (const [alias, abbr] of aliasList) {
  const id = BOOK_MAP[abbr.toLowerCase()]
  if (id) BOOK_MAP[alias] = id
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

export function parseReference(input: string): { bookId: number; chapter: number; verse?: number; verseEnd?: number } | null {
  const trimmed = input.trim().replace(/\s+/g, ' ')
  const rangeMatch = trimmed.match(/^(.+?)\s*(\d+)[;:](\d+)\s*[-–]\s*(\d+)$/)
  if (rangeMatch) {
    const [, bookName, chStr, vStr, vEndStr] = rangeMatch
    const bookId = BOOK_MAP[bookName.toLowerCase().replace(/\s+/g, '')]
    if (!bookId) return null
    const chapter = Number(chStr)
    const verse = Number(vStr)
    const verseEnd = Number(vEndStr)
    if (isNaN(chapter) || chapter < 1 || isNaN(verse) || verse < 1 || isNaN(verseEnd) || verseEnd < 1) return null
    return { bookId, chapter, verse: Math.min(verse, verseEnd), verseEnd: Math.max(verse, verseEnd) }
  }
  const match = trimmed.match(/^(.+?)\s*(\d+)(?:[;:](\d+))?$/)
  if (!match) return null
  const [, bookName, chStr, vStr] = match
  const bookId = BOOK_MAP[bookName.toLowerCase().replace(/\s+/g, '')]
  if (!bookId) return null
  const chapter = Number(chStr)
  if (isNaN(chapter) || chapter < 1) return null
  return { bookId, chapter, verse: vStr ? Number(vStr) : undefined }
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text
  const safe = text.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  )
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return safe.replace(regex, '<mark class="bg-accent/30 text-text-primary rounded-sm px-0.5">$1</mark>')
}
