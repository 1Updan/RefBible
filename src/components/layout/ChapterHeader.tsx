import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Bookmark, Sparkles, Settings, ArrowLeft, Check, Search, Crosshair } from 'lucide-react'
import clsx from 'clsx'

import { parseReference } from '@/lib/utils'

interface ChapterHeaderProps {
  bookName: string
  chapter: number
  totalChapters: number
  canGoBack: boolean
  onGoBack: () => void
  onPrevChapter: () => void
  onNextChapter: () => void
  activePanel: string
  studyTab: string
  onTogglePanel: (panel: 'bookmarks' | 'ai' | 'settings' | 'search' | 'crossrefs') => void
  isDesktop: boolean
  visibleVersions: string[]
  installedVersions: string[]
  onToggleVersion: (code: string) => void
  onSearch: (query: string) => void
  onNavigateToRef?: (bookId: number, chapter: number, range?: { verseStart: number; verseEnd: number }) => void
}

export function ChapterHeader({
  bookName,
  chapter,
  totalChapters,
  canGoBack,
  onGoBack,
  onPrevChapter,
  onNextChapter,
  activePanel,
  studyTab,
  onTogglePanel,
  isDesktop,
  visibleVersions,
  installedVersions,
  onToggleVersion,
  onSearch,
  onNavigateToRef,
}: ChapterHeaderProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg shrink-0">
      <div className="flex items-center gap-2">
        {canGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="p-1 rounded-md text-accent hover:bg-accent-light transition-all duration-150 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={onPrevChapter}
          disabled={chapter <= 1}
          className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          aria-label="Previous chapter"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-text-primary min-w-[80px] text-center">
          {bookName} {chapter}
        </span>
        <button
          type="button"
          onClick={onNextChapter}
          disabled={chapter >= totalChapters}
          className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          aria-label="Next chapter"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => onTogglePanel('search')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchInput.trim()) {
                const ref = parseReference(searchInput.trim())
                if (ref && ref.verse && ref.verseEnd && onNavigateToRef) {
                  onNavigateToRef(ref.bookId, ref.chapter, { verseStart: ref.verse, verseEnd: ref.verseEnd })
                  setSearchInput('')
                  return
                }
                onSearch(searchInput.trim())
              }
            }}
            placeholder="Search verses…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5" ref={dropdownRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full border border-accent text-accent hover:bg-accent/10 transition-all duration-150 cursor-pointer shrink-0"
          >
            {visibleVersions[0]}{visibleVersions.length > 1 ? ` +${visibleVersions.length - 1}` : ''}
            <ChevronDown size={12} className={clsx('transition-transform duration-150', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-surface-elevated rounded-xl shadow-xl border border-border py-1 animate-[scaleIn_100ms_ease-out] origin-top-right">
              {installedVersions.map((code) => {
                const isOn = visibleVersions.includes(code)
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onToggleVersion(code)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface outline-none transition-colors duration-100 cursor-pointer text-left"
                  >
                    <span className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors duration-100 shrink-0',
                      isOn ? 'bg-accent border-accent' : 'border-border',
                    )}>
                      {isOn && <Check size={11} className="text-white" />}
                    </span>
                    {code}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <span className="w-px h-5 bg-border mx-0.5 shrink-0" />
        <button
          type="button"
          onClick={() => onTogglePanel('crossrefs')}
          className={clsx(
            'p-1.5 rounded-md transition-all duration-150 cursor-pointer',
            activePanel === 'study' && studyTab === 'crossrefs'
              ? 'bg-accent-light text-accent'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
          )}
          aria-label="Cross References"
        >
          <Crosshair size={16} />
        </button>
        <button
          type="button"
          onClick={() => onTogglePanel('bookmarks')}
          className={clsx(
            'p-1.5 rounded-md transition-all duration-150 cursor-pointer',
            activePanel === 'bookmarks'
              ? 'bg-accent-light text-accent'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
          )}
          aria-label="Bookmarks"
        >
          <Bookmark size={16} />
        </button>
        <button
          type="button"
          onClick={() => onTogglePanel('ai')}
          className={clsx(
            'p-1.5 rounded-md transition-all duration-150 cursor-pointer',
            activePanel === 'study' && studyTab === 'ai'
              ? 'bg-accent-light text-accent'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
          )}
          aria-label="AI Commentary"
        >
          <Sparkles size={16} />
        </button>
        {isDesktop && (
          <button
            type="button"
            onClick={() => onTogglePanel('settings')}
            className={clsx(
              'p-1.5 rounded-md transition-all duration-150 cursor-pointer',
              activePanel === 'settings'
                ? 'bg-accent-light text-accent'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
            )}
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </header>
  )
}
