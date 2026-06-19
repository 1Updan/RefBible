import { useEffect, useState } from 'react'
import { Bookmark, Trash2 } from 'lucide-react'
import { getBookmarks, removeBookmark } from '@/lib/db'
import type { Bookmark as BookmarkType } from '@/types/db'

interface BookmarksPanelProps {
  refreshKey: number
}

export function BookmarksPanel({ refreshKey }: BookmarksPanelProps) {
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
      {bookmarks.map((b) => (
        <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors duration-150">
          <div className="flex items-center gap-2">
            <Bookmark size={12} className="text-accent" />
            <span className="text-xs text-text-secondary font-mono">{b.verse_id}</span>
          </div>
          <button
            type="button"
            onClick={() => handleRemove(b.verse_id)}
            className="p-1 rounded-md text-text-tertiary hover:text-danger hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
            aria-label="Remove bookmark"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
