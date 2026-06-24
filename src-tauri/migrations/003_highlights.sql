CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(verse_id, color)
);

CREATE INDEX IF NOT EXISTS idx_highlights_verse ON highlights(verse_id);
