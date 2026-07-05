CREATE TABLE IF NOT EXISTS user_custom_cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_verse_id TEXT NOT NULL,
  target_verse_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(origin_verse_id, target_verse_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cross_ref_origin ON user_custom_cross_references(origin_verse_id);
CREATE INDEX IF NOT EXISTS idx_user_cross_ref_target ON user_custom_cross_references(target_verse_id);

-- Performance indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_content_text_verse ON content_text(verse_id);
CREATE INDEX IF NOT EXISTS idx_content_text_translation ON content_text(translation_code);
CREATE INDEX IF NOT EXISTS idx_cross_refs_origin ON cross_references(origin_verse_id);
CREATE INDEX IF NOT EXISTS idx_notes_verse ON notes(verse_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_verse ON bookmarks(verse_id);
CREATE INDEX IF NOT EXISTS idx_verses_book_chapter ON verses(book_id, chapter_num);