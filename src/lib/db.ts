import Database from '@tauri-apps/plugin-sql'
import type { Verse, ContentText, CrossReference, Bookmark, Note } from '@/types/db'
import { toOsis } from '@/data/osis'

let db: Database | null = null
let seeded = false

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
  }
  seeded = true
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

  const nasb: [number, string][] = [
    [1, 'In the beginning was the Word, and the Word was with God, and the Word was God.'],
    [2, 'He was in the beginning with God.'],
    [3, 'All things came into being through Him, and apart from Him not even one thing came into being that has come into being.'],
    [4, 'In Him was life, and the life was the Light of mankind.'],
    [5, 'And the Light shines in the darkness, and the darkness did not grasp it.'],
    [6, 'A man came, one sent from God, whose name was John.'],
    [7, 'He came as a witness, to testify about the Light, so that all might believe through him.'],
    [8, 'He was not the Light, but he came to testify about the Light.'],
    [9, 'This was the true Light which, coming into the world, enlightens every person.'],
    [10, 'He was in the world, and the world came into being through Him, and the world did not know Him.'],
    [11, 'He came to His own, and His own people did not accept Him.'],
    [12, 'But as many as received Him, to them He gave the right to become children of God, to those who believe in His name,'],
    [13, 'who were born, not of blood, nor of the will of the flesh, nor of the will of a husband, but of God.'],
    [14, 'And the Word became flesh, and dwelt among us; and we saw His glory, glory as of the only Son from the Father, full of grace and truth.'],
    [15, 'John testified about Him and called out, saying, "This was He of whom I said, \'He who is coming after me has proved to be superior to me, because He existed before me.\'"'],
    [16, 'For of His fullness we have all received, and grace upon grace.'],
    [17, 'For the Law was given through Moses; grace and truth were realized through Jesus Christ.'],
    [18, 'No one has seen God at any time; God the only Son, who is in the arms of the Father, He has explained Him.'],
    [19, 'This is the testimony of John, when the Jews sent priests and Levites to him from Jerusalem to ask him, "Who are you?"'],
    [20, 'And he confessed and did not deny, but confessed, "I am not the Christ."'],
    [21, 'And they asked him, "What then? Are you Elijah?" And he said, "I am not." "Are you the Prophet?" And he answered, "No."'],
    [22, 'Then they said to him, "Who are you? So that we may give an answer to those who sent us. What do you say about yourself?"'],
    [23, 'He said, "I am the voice of one calling out in the wilderness, \'Make the way of the Lord straight,\' as Isaiah the prophet said."'],
    [24, 'Now the messengers who had been sent were from the Pharisees.'],
    [25, 'And they asked him, and said to him, "Why then are you baptizing, if you are not the Christ, nor Elijah, nor the Prophet?"'],
    [26, 'John answered them, saying, "I baptize in water, but among you stands Him whom you do not know.'],
    [27, 'It is He who comes after me, of whom I am not worthy even to untie the strap of His sandal."'],
    [28, 'These things took place in Bethany beyond the Jordan, where John was baptizing.'],
    [29, 'The next day he saw Jesus coming to him and said, "Behold, the Lamb of God who takes away the sin of the world!'],
    [30, 'This is He on behalf of whom I said, \'After me is coming a Man who has proved to be superior to me, because He existed before me.\''],
    [31, 'And I did not recognize Him, but so that He would be revealed to Israel, I came baptizing in water."'],
    [32, 'And John testified, saying, "I have seen the Spirit descending from heaven like a dove, and He remained upon Him.'],
    [33, 'And I did not recognize Him, but He who sent me to baptize in water said to me, \'He upon whom you see the Spirit descending and remaining upon Him, this is the One who baptizes in the Holy Spirit.\''],
    [34, 'And I have seen and have testified that this is the Son of God."'],
    [35, 'Again the next day, John was standing with two of his disciples;'],
    [36, 'and he looked at Jesus as He walked, and said, "Behold, the Lamb of God!"'],
    [37, 'And the two disciples heard him speak, and they followed Jesus.'],
    [38, 'And Jesus turned and saw them following, and said to them, "What are you seeking?" They said to Him, "Rabbi (which translated means Teacher), where are You staying?"'],
    [39, 'He said to them, "Come, and you will see." So they came and saw where He was staying, and they stayed with Him that day, for it was about the tenth hour.'],
    [40, 'One of the two who heard John speak and followed Him was Andrew, Simon Peter\'s brother.'],
    [41, 'He first found his own brother Simon and said to him, "We have found the Messiah" (which translated means Christ).'],
    [42, 'He brought him to Jesus. Jesus looked at him and said, "You are Simon the son of John; you shall be called Cephas" (which means Peter).'],
    [43, 'The next day He intended to go to Galilee, and He found Philip. And Jesus said to him, "Follow Me."'],
    [44, 'Now Philip was from Bethsaida, the city of Andrew and Peter.'],
    [45, 'Philip found Nathanael and said to him, "We have found Him of whom Moses wrote in the Law, and the prophets wrote: Jesus the son of Joseph, from Nazareth."'],
    [46, 'And Nathanael said to him, "Can anything good come from Nazareth?" Philip said to him, "Come and see."'],
    [47, 'Jesus saw Nathanael coming to Him and said of him, "Truly, an Israelite indeed, in whom there is no deceit!"'],
    [48, 'Nathanael said to Him, "How do You know me?" Jesus answered and said to him, "Before Philip called you, when you were under the fig tree, I saw you."'],
    [49, 'Nathanael answered, "Rabbi, You are the Son of God; You are the King of Israel."'],
    [50, 'Jesus answered and said to him, "Because I said to you that I saw you under the fig tree, do you believe? You will see greater things than these."'],
    [51, 'And He said to him, "Truly, truly, I say to you, you will see heaven opened and the angels of God ascending and descending on the Son of Man."'],
  ]

  for (const [v, text] of nasb) {
    const verseId = `JHN.1.${v}`
    await conn.execute(
      'INSERT OR IGNORE INTO content_text (verse_id, translation_code, text_data) VALUES ($1, $2, $3)',
      [verseId, 'NASB', text],
    )
  }

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

export async function saveNote(verseId: string, text: string): Promise<void> {
  const conn = await getDb()
  await conn.execute('INSERT INTO notes (verse_id, text_content) VALUES ($1, $2)', [verseId, text])
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

export async function searchVerses(query: string): Promise<SearchResult[]> {
  const conn = await getDb()
  return conn.select<SearchResult[]>(
    `SELECT v.id as verse_id, v.book_id, v.chapter_num, v.verse_num, ct.translation_code, ct.text_data
     FROM content_text ct
     JOIN verses v ON v.id = ct.verse_id
     WHERE ct.text_data LIKE $1
     ORDER BY v.book_id, v.chapter_num, v.verse_num`,
    [`%${query}%`],
  )
}
