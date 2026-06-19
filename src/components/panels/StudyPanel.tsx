import { useCallback, useEffect, useState } from 'react'
import { Bookmark, Crosshair, MessageSquareMore, Sparkles, Trash2 } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { getCrossReferences, getTranslations, saveNote, getNotes, getBookmarks, removeBookmark } from '@/lib/db'
import { formatVerseId, parseOsisId } from '@/lib/utils'
import { getBook } from '@/data/books'
import type { CrossReference, Bookmark as BookmarkType } from '@/types/db'
import type { ActiveTab } from '@/contexts/NavigationContext'

const TABS: { id: ActiveTab; label: string; icon: typeof Crosshair }[] = [
  { id: 'crossrefs', label: 'Cross-Refs', icon: Crosshair },
  { id: 'notes', label: 'Notes', icon: MessageSquareMore },
  { id: 'ai', label: 'AI', icon: Sparkles },
]

function CrossRefsTab() {
  const { crossRefTarget, navigateTo, bookId } = useNavigation()
  const [xrefs, setXrefs] = useState<CrossReference[]>([])
  const [previews, setPreviews] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const target = crossRefTarget?.verseId
    let cancelled = false
    async function load() {
      if (!target) return
      const refs = await getCrossReferences(target)
      if (cancelled) return
      setXrefs(refs)
      const map = new Map<string, string>()
      const batch = refs.map(async (x) => {
        const texts = await getTranslations(x.target_verse_id)
        const first = texts.find((t) => t.translation_code === 'KJV') ?? texts[0]
        if (first) {
          map.set(x.target_verse_id, first.text_data.slice(0, 100) + (first.text_data.length > 100 ? '…' : ''))
        }
      })
      await Promise.all(batch)
      if (!cancelled) setPreviews(map)
    }
    load()
    return () => { cancelled = true }
  }, [crossRefTarget])

  if (!crossRefTarget) {
    return <p className="text-xs text-text-tertiary px-1 py-4 text-center">Select a verse to see cross references</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-secondary px-1">
        For <span className="font-semibold text-text-primary">{crossRefTarget.reference}</span>
      </p>
      {xrefs.length === 0 && <p className="text-xs text-text-tertiary px-1">No cross references available.</p>}
      {xrefs.map((xref) => {
        const preview = previews.get(xref.target_verse_id)
        return (
          <button
            key={xref.id}
            type="button"
            onClick={() => {
              const parts = xref.target_verse_id.split('.')
              if (parts.length >= 3) navigateTo(bookId, Number(parts[1]), xref.target_verse_id)
            }}
            className="w-full text-left p-2.5 rounded-lg bg-surface-elevated border border-border-subtle hover:bg-surface-hover transition-all duration-150 cursor-pointer group"
          >
            <span className="text-xs font-semibold text-accent">{formatVerseId(xref.target_verse_id)}</span>
            {preview && (
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">{preview}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}

function NotesTab() {
  const { noteVerseId, closeNote, navigateTo } = useNavigation()
  const [text, setText] = useState('')
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])

  useEffect(() => {
    getBookmarks().then(setBookmarks)
  }, [noteVerseId])

  useEffect(() => {
    if (noteVerseId) {
      getNotes(noteVerseId).then((notes) => {
        setText(notes.length > 0 ? notes[0].text_content : '')
      })
    } else {
      setText('')
    }
  }, [noteVerseId])

  const handleSave = useCallback(async () => {
    if (noteVerseId && text.trim()) {
      await saveNote(noteVerseId, text.trim())
      closeNote()
    }
  }, [noteVerseId, text, closeNote])

  const handleRemoveBookmark = useCallback(async (verseId: string) => {
    await removeBookmark(verseId)
    setBookmarks((prev) => prev.filter((b) => b.verse_id !== verseId))
  }, [])

  if (noteVerseId) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-text-secondary font-mono">{noteVerseId}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your note…"
          rows={5}
          className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all duration-150"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            Save Note
          </button>
          <button
            type="button"
            onClick={closeNote}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
        </div>
        {bookmarks.length > 0 && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-xs font-medium text-text-secondary mb-2">Bookmarked Verses</h4>
            <BookmarkList bookmarks={bookmarks} onNavigate={navigateTo} onRemove={handleRemoveBookmark} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-tertiary px-1">
        Tap the note icon on any verse to write a note
      </p>
      {bookmarks.length > 0 && (
        <div className="pt-1">
          <h4 className="text-xs font-medium text-text-secondary mb-2 px-1">Bookmarked Verses</h4>
          <BookmarkList bookmarks={bookmarks} onNavigate={navigateTo} onRemove={handleRemoveBookmark} />
        </div>
      )}
    </div>
  )
}

function BookmarkList({ bookmarks, onNavigate, onRemove }: { bookmarks: BookmarkType[]; onNavigate: (bookId: number, chapter: number, verseId?: string) => void; onRemove: (verseId: string) => void }) {
  return (
    <div className="space-y-1">
      {bookmarks.map((b) => {
        const parsed = parseOsisId(b.verse_id)
        const book = parsed ? getBook(parsed.bookId) : null
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => parsed && onNavigate(parsed.bookId, parsed.chapter)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors duration-150 cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bookmark size={12} className="text-accent shrink-0" />
              <span className="text-xs text-text-secondary truncate">
                {book ? `${book.name} ${parsed?.chapter}:${parsed?.verseNum}` : b.verse_id}
              </span>
            </div>
            <div onClick={(e) => { e.stopPropagation(); onRemove(b.verse_id) }}>
              <Trash2 size={12} className="text-text-tertiary hover:text-danger transition-colors duration-150 cursor-pointer" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function AiTab() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('refbible-ai-key') ?? '')
  const saved = !!localStorage.getItem('refbible-ai-key')

  const handleSave = () => {
    localStorage.setItem('refbible-ai-key', apiKey)
    window.location.reload()
  }

  const handleClear = () => {
    localStorage.removeItem('refbible-ai-key')
    setApiKey('')
    window.location.reload()
  }

  if (!saved) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          Enter your Google AI Studio API key to enable AI-powered commentary.
          Your key stays on this device.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API key"
          className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
        >
          Activate AI
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-secondary">AI activated</span>
        <button type="button" onClick={handleClear} className="text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer">
          Revoke
        </button>
      </div>
      <p className="text-xs text-text-tertiary">
        Select a verse and use the context menu to get AI commentary.
      </p>
    </div>
  )
}

export function StudyPanel() {
  const { studyTab, setStudyTab } = useNavigation()

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStudyTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-all duration-150 cursor-pointer border-b-2 ${
              studyTab === id
                ? 'text-accent border-accent'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {studyTab === 'crossrefs' && <CrossRefsTab />}
        {studyTab === 'notes' && <NotesTab />}
        {studyTab === 'ai' && <AiTab />}
      </div>
    </div>
  )
}
