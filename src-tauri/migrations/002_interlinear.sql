CREATE TABLE IF NOT EXISTS interlinear_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL,
  word_index INTEGER NOT NULL,
  language TEXT NOT NULL,
  original_text TEXT NOT NULL,
  transliteration TEXT,
  strongs_number TEXT,
  lemma TEXT,
  gloss TEXT,
  morphology TEXT,
  UNIQUE(verse_id, word_index)
);

CREATE TABLE IF NOT EXISTS strongs_definitions (
  number TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  transliteration TEXT,
  definition TEXT,
  pronunciation TEXT,
  word_count INTEGER
);
