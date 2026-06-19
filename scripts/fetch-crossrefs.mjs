import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const FULL_NAME_TO_OSIS = {
  'Genesis': 'GEN',
  'Exodus': 'EXOD',
  'Leviticus': 'LEV',
  'Numbers': 'NUM',
  'Deuteronomy': 'DEUT',
  'Joshua': 'JOSH',
  'Judges': 'JUDG',
  'Ruth': 'RUTH',
  '1 Samuel': '1SAM',
  '2 Samuel': '2SAM',
  '1 Kings': '1KGS',
  '2 Kings': '2KGS',
  '1 Chronicles': '1CHR',
  '2 Chronicles': '2CHR',
  'Ezra': 'EZRA',
  'Nehemiah': 'NEH',
  'Esther': 'ESTH',
  'Job': 'JOB',
  'Psalms': 'PS',
  'Proverbs': 'PROV',
  'Ecclesiastes': 'ECCL',
  'Song of Solomon': 'SONG',
  'Isaiah': 'ISA',
  'Jeremiah': 'JER',
  'Lamentations': 'LAM',
  'Ezekiel': 'EZEK',
  'Daniel': 'DAN',
  'Hosea': 'HOS',
  'Joel': 'JOEL',
  'Amos': 'AMOS',
  'Obadiah': 'OBAD',
  'Jonah': 'JONAH',
  'Micah': 'MIC',
  'Nahum': 'NAH',
  'Habakkuk': 'HAB',
  'Zephaniah': 'ZEPH',
  'Haggai': 'HAG',
  'Zechariah': 'ZECH',
  'Malachi': 'MAL',
  'Matthew': 'MATT',
  'Mark': 'MARK',
  'Luke': 'LUKE',
  'John': 'JHN',
  'Acts': 'ACTS',
  'Romans': 'ROM',
  '1 Corinthians': '1COR',
  '2 Corinthians': '2COR',
  'Galatians': 'GAL',
  'Ephesians': 'EPH',
  'Philippians': 'PHIL',
  'Colossians': 'COL',
  '1 Thessalonians': '1THESS',
  '2 Thessalonians': '2THESS',
  '1 Timothy': '1TIM',
  '2 Timothy': '2TIM',
  'Titus': 'TITUS',
  'Philemon': 'PHLM',
  'Hebrews': 'HEB',
  'James': 'JAS',
  '1 Peter': '1PET',
  '2 Peter': '2PET',
  '1 John': '1JHN',
  '2 John': '2JHN',
  '3 John': '3JHN',
  'Jude': 'JUDE',
  'Revelation': 'REV',
}

const BOOK_FILES = Object.keys(FULL_NAME_TO_OSIS)
  .map((name) => name.replace(/ /g, '_') + '.json')

const BASE_URL = 'https://raw.githubusercontent.com/kennethreitz/kjvstudy.org/main/kjvstudy_org/data/cross_references'

function toOsis(bookName, ch, v) {
  const osis = FULL_NAME_TO_OSIS[bookName]
  if (!osis) return null
  return `${osis}.${ch}.${v}`
}

function parseRef(ref) {
  // Match "Book Chapter:Verse" or "1 Book Chapter:Verse"
  const match = ref.match(/^(\d?\s?\w+(?:\s\w+)?)\s(\d+):(\d+)$/)
  if (!match) return null
  const [, bookName, ch, v] = match
  return { bookName: bookName.trim(), chapter: Number(ch), verse: Number(v) }
}

async function main() {
  const all = {}

  for (const fileName of BOOK_FILES) {
    const url = `${BASE_URL}/${fileName}`
    console.log(`Fetching ${fileName}...`)
    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        console.warn(`  FAILED (${resp.status})`)
        continue
      }
      const data = await resp.json()
      let count = 0
      for (const [key, refs] of Object.entries(data)) {
        const [bookName, ch, v] = key.split(':')
        const originOsis = toOsis(bookName, Number(ch), Number(v))
        if (!originOsis) continue

        for (const { ref } of refs) {
          const parsed = parseRef(ref)
          if (!parsed) continue
          const targetOsis = toOsis(parsed.bookName, parsed.chapter, parsed.verse)
          if (!targetOsis) continue

          all[`${originOsis}||${targetOsis}`] = {
            origin: originOsis,
            target: targetOsis,
          }
          count++
        }
      }
      console.log(`  -> ${count} cross-references`)
    } catch (e) {
      console.warn(`  ERROR: ${e.message}`)
    }
  }

  const entries = Object.values(all)
  console.log(`\nTotal unique cross-references: ${entries.length}`)
  console.log(`Total file size: ~${(JSON.stringify(entries).length / 1024 / 1024).toFixed(1)} MB`)

  const outPath = join(__dirname, '..', 'public', 'crossrefs.json')
  writeFileSync(outPath, JSON.stringify(entries))
  console.log(`Written to ${outPath}`)
}

main().catch(console.error)
