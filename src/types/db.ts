export interface Verse {
  id: string
  book_id: number
  chapter_num: number
  verse_num: number
}

export interface ContentText {
  id: number
  verse_id: string
  translation_code: string
  text_data: string
}

export interface CrossReference {
  id: number
  origin_verse_id: string
  target_verse_id: string
  reference?: string
  thematic_weight: number
}

export interface Bookmark {
  id: number
  verse_id: string
  created_at: string
}

export interface Note {
  id: number
  verse_id: string
  text_content: string
  created_at: string
}

export interface AiCache {
  id: number
  verse_id: string
  query_mode: 'strict' | 'research'
  cached_response: string
  timestamp: string
}

export interface InterlinearWord {
  id: number
  verse_id: string
  word_index: number
  language: 'hebrew' | 'greek'
  original_text: string
  transliteration: string | null
  strongs_number: string | null
  lemma: string | null
  gloss: string | null
  morphology: string | null
}

export interface StrongsEntry {
  number: string
  language: 'hebrew' | 'greek'
  transliteration: string | null
  definition: string | null
  pronunciation: string | null
  word_count: number | null
}

export interface Highlight {
  id: number
  verse_id: string
  color: string
  created_at: string
}

export interface UserCrossReference {
  id: number
  origin_verse_id: string
  target_verse_id: string
  created_at: string
}
