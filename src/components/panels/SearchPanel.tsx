import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { searchVerses } from '@/lib/db'
import type { SearchResult } from '@/lib/db'
import { getBook } from '@/data/books'
import { highlightText, parseReference } from '@/lib/utils'

interface SearchPanelProps {
  onNavigate?: (bookId: number, chapter: number, range?: { verseStart: number; verseEnd: number }) => void
  initialQuery?: string
  visibleVersions?: string[]
}

export function SearchPanel({ onNavigate, initialQuery, visibleVersions }: SearchPanelProps) {
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">Search</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
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
            <div className="mt-3 space-y-1">
              <p className="text-[10px] text-text-tertiary font-medium px-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
              {results.map((r) => {
                const book = getBook(r.book_id)
                return (
                  <button
                    key={`${r.verse_id}-${r.translation_code}`}
                    type="button"
                    onClick={() => {
                      const rangeRef = parseReference(query.trim())
                      const range = rangeRef?.verse && rangeRef?.verseEnd ? { verseStart: rangeRef.verse, verseEnd: rangeRef.verseEnd } : undefined
                      onNavigate?.(r.book_id, r.chapter_num, range)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle hover:bg-surface-hover transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-accent">
                        {book?.name ?? 'Unknown'} {r.chapter_num}:{r.verse_num}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase text-text-tertiary bg-surface rounded border border-border-subtle">
                        {r.translation_code}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: highlightText(r.text_data, query) }} />
                  </button>
                )
              })}
            </div>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-8">No results found</p>
          )}

          {!searching && query.trim().length < 2 && (
            <p className="text-xs text-text-tertiary text-center py-8">Type at least 2 characters to search</p>
          )}
        </section>
      </div>
    </div>
  )
}
