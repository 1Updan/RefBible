CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,
  book_id INTEGER NOT NULL,
  chapter_num INTEGER NOT NULL,
  verse_num INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content_text (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL,
  translation_code TEXT NOT NULL,
  text_data TEXT NOT NULL,
  UNIQUE(verse_id, translation_code)
);

CREATE TABLE IF NOT EXISTS cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_verse_id TEXT NOT NULL,
  target_verse_id TEXT NOT NULL,
  thematic_weight INTEGER DEFAULT 0,
  UNIQUE(origin_verse_id, target_verse_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  text_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_commentary_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL,
  query_mode TEXT NOT NULL,
  cached_response TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
