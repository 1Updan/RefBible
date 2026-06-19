import { useEffect, useState } from 'react'
import { Bookmark, Trash2 } from 'lucide-react'
import { getBookmarks, removeBookmark } from '@/lib/db'
import { parseOsisId } from '@/lib/utils'
import { getBook } from '@/data/books'
import type { Bookmark as BookmarkType } from '@/types/db'

interface BookmarksPanelProps {
  refreshKey: number
  onNavigate: (verseId: string, bookId: number, chapter: number) => void
}

export function BookmarksPanel({ refreshKey, onNavigate }: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])

  useEffect(() => {
    getBookmarks().then(setBookmarks)
  }, [refreshKey])

  const handleRemove = async (verseId: string) => {
    await removeBookmark(verseId)
    setBookmarks((prev) => prev.filter((b) => b.verse_id !== verseId))
  }

  return (
    <div className="space-y-1">
      {bookmarks.length === 0 && (
        <p className="text-xs text-text-tertiary text-center py-8">
          No bookmarks yet. Tap the bookmark icon on any verse.
        </p>
      )}
      {bookmarks.map((b) => {
        const parsed = parseOsisId(b.verse_id)
        const book = parsed ? getBook(parsed.bookId) : null
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => parsed && onNavigate(b.verse_id, parsed.bookId, parsed.chapter)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors duration-150 cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bookmark size={12} className="text-accent shrink-0" />
              <span className="text-xs text-text-secondary truncate">
                {book ? `${book.name} ${parsed?.chapter}:${parsed?.verseNum}` : b.verse_id}
              </span>
            </div>
            <div onClick={(e) => { e.stopPropagation(); handleRemove(b.verse_id) }}>
              <Trash2 size={12} className="text-text-tertiary hover:text-danger transition-colors duration-150 cursor-pointer" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
