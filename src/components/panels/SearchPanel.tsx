import { useEffect, useState, useCallback, useRef, Fragment } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { searchVerses } from '@/lib/db'
import type { SearchResult } from '@/lib/db'
import { getBook } from '@/data/books'

interface SearchPanelProps {
  onNavigate?: (bookId: number, chapter: number, range?: { verseStart: number; verseEnd: number }) => void
  onAddCrossRef?: (result: SearchResult) => void
  initialQuery?: string
  visibleVersions?: string[]
}

export function SearchPanel({ onNavigate, onAddCrossRef, initialQuery, visibleVersions }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const r = await searchVerses(q.trim(), visibleVersions)
      setResults(r)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [visibleVersions])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  useEffect(() => {
    if (initialQuery) {
      const timer = setTimeout(() => doSearch(initialQuery), 0)
      return () => clearTimeout(timer)
    }
  }, [initialQuery, doSearch])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search verses…"
          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors duration-150 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {searching && (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!searching && results.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-text-tertiary font-medium px-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
                {(() => {
                  const otResults = results.filter(r => r.book_id <= 39)
                  const ntResults = results.filter(r => r.book_id >= 40)
                  return (
                    <>
                      {otResults.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Old Testament</span>
                            <span className="text-[9px] text-text-tertiary">({otResults.length})</span>
                            <span className="flex-1 h-px bg-border-subtle" />
                          </div>
                          {otResults.map((r) => {
                            const book = getBook(r.book_id)
                            return (
                              <SearchResultItem key={`${r.verse_id}-${r.translation_code}`} r={r} book={book} query={query} onNavigate={onNavigate} onAddCrossRef={onAddCrossRef} />
                            )
                          })}
                        </div>
                      )}
                      {ntResults.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">New Testament</span>
                            <span className="text-[9px] text-text-tertiary">({ntResults.length})</span>
                            <span className="flex-1 h-px bg-border-subtle" />
                          </div>
                          {ntResults.map((r) => {
                            const book = getBook(r.book_id)
                            return (
                              <SearchResultItem key={`${r.verse_id}-${r.translation_code}`} r={r} book={book} query={query} onNavigate={onNavigate} onAddCrossRef={onAddCrossRef} />
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-text-tertiary text-center py-8">No results found</p>
      )}

      {!searching && query.trim().length < 2 && (
        <p className="text-xs text-text-tertiary text-center py-8">Type at least 2 characters to search</p>
      )}
    </div>
  )
}

function SearchResultItem({ r, book, query, onNavigate, onAddCrossRef }: {
  r: SearchResult
  book: { name: string } | undefined
  query: string
  onNavigate?: (bookId: number, chapter: number, range?: { verseStart: number; verseEnd: number }) => void
  onAddCrossRef?: (result: SearchResult) => void
}) {
  return (
    <div
      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle hover:bg-surface-hover transition-all duration-150 flex items-center gap-2"
    >
      <button
        type="button"
        onClick={() => {
          onNavigate?.(r.book_id, r.chapter_num, { verseStart: r.verse_num, verseEnd: r.verse_num })
        }}
        className="flex-1 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-accent">
            {book?.name ?? 'Unknown'} {r.chapter_num}:{r.verse_num}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase text-text-tertiary bg-surface rounded border border-border-subtle">
            {r.translation_code}
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{renderHighlightedTextStatic(r.text_data, query)}</p>
      </button>
      {onAddCrossRef && (
        <button
          type="button"
          onClick={() => onAddCrossRef(r)}
          className="flex-shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-surface transition-colors duration-150"
          aria-label="Add as cross-reference"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function renderHighlightedTextStatic(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-accent/30 text-text-primary rounded-sm px-0.5">{part}</mark>
      : <Fragment key={i}>{part}</Fragment>
  )
}
