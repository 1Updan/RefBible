import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Bookmark, Settings, ArrowLeft, Check, Search, Crosshair, BookOpen, Menu, X } from 'lucide-react'
import clsx from 'clsx'

import { parseReference } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'

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
  onTogglePanel: (panel: 'bookmarks' | 'settings' | 'search' | 'crossrefs') => void
  isDesktop: boolean
  visibleVersions: string[]
  installedVersions: string[]
  onToggleVersion: (code: string) => void
  onSearch: (query: string) => void
  onNavigateToRef?: (bookId: number, chapter: number, range?: { verseStart: number; verseEnd: number }) => void
  onOpenNav?: () => void
  interlinearEnabled?: boolean
  onToggleInterlinear?: () => void
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
  onOpenNav,
  interlinearEnabled,
  onToggleInterlinear,
}: ChapterHeaderProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="flex items-center justify-between px-3 py-1.5 bg-bg shrink-0 gap-1 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.35)] relative z-10">
      <div className="flex items-center gap-1 min-w-0">
        {canGoBack && (
          <Tooltip label="Go back">
            <button
              type="button"
              onClick={onGoBack}
              className="p-1 rounded-md text-accent hover:bg-accent-light transition-all duration-150 cursor-pointer shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
          </Tooltip>
        )}
        {isDesktop && (
          <Tooltip label="Previous chapter">
            <button
              type="button"
              onClick={onPrevChapter}
              disabled={chapter <= 1}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer shrink-0"
              aria-label="Previous chapter"
            >
              <ChevronLeft size={16} />
            </button>
          </Tooltip>
        )}
        {onOpenNav ? (
          <button
            type="button"
            onClick={onOpenNav}
            className="flex items-center gap-1 text-lg font-extrabold text-text-primary truncate shrink-0 hover:text-accent transition-colors duration-150 cursor-pointer tracking-tight"
          >
            {bookName} {chapter}
            <ChevronDown size={14} className="text-text-tertiary" />
          </button>
        ) : (
          <span className="text-lg font-extrabold text-text-primary truncate shrink-0 tracking-tight">
            {bookName} {chapter}
          </span>
        )}
        {isDesktop && (
          <Tooltip label="Next chapter">
            <button
              type="button"
              onClick={onNextChapter}
              disabled={chapter >= totalChapters}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer shrink-0"
              aria-label="Next chapter"
            >
              <ChevronRight size={16} />
            </button>
          </Tooltip>
        )}
      </div>

      {isDesktop && (
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
      )}

      {isDesktop ? (
        <div className="flex items-center gap-0.5" ref={dropdownRef}>
          <div className="relative">
            <Tooltip label="Translations">
              <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border border-accent text-accent hover:bg-accent/10 transition-all duration-150 cursor-pointer shrink-0"
              >
                <BookOpen size={13} />
                <span className="text-[9px] font-bold leading-none">{visibleVersions.length}</span>
                <ChevronDown size={11} className={clsx('transition-transform duration-150', open && 'rotate-180')} />
              </button>
            </Tooltip>

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

          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          <Tooltip label="Cross References">
            <button
              type="button"
              onClick={() => onTogglePanel('crossrefs')}
              className={clsx(
                'p-1 rounded-md transition-all duration-150 cursor-pointer',
                activePanel === 'study' && studyTab === 'crossrefs'
                  ? 'bg-accent-light text-accent'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
              )}
              aria-label="Cross References"
            >
              <Crosshair size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Bookmarks">
            <button
              type="button"
              onClick={() => onTogglePanel('bookmarks')}
              className={clsx(
                'p-1 rounded-md transition-all duration-150 cursor-pointer',
                activePanel === 'bookmarks'
                  ? 'bg-accent-light text-accent'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
              )}
              aria-label="Bookmarks"
            >
              <Bookmark size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Settings">
            <button
              type="button"
              onClick={() => onTogglePanel('settings')}
              className={clsx(
                'p-1 rounded-md transition-all duration-150 cursor-pointer',
                activePanel === 'settings'
                  ? 'bg-accent-light text-accent'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
              )}
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center gap-0.5" ref={mobileMenuRef}>
          <Tooltip label="Search">
            <button
              type="button"
              onClick={() => onTogglePanel('search')}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface transition-all duration-150 cursor-pointer"
              aria-label="Search"
            >
              <Search size={15} />
            </button>
          </Tooltip>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              className={clsx(
                'p-1 rounded-md transition-all duration-150 cursor-pointer',
                mobileMenuOpen
                  ? 'bg-accent-light text-accent'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface',
              )}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-surface-elevated rounded-xl shadow-xl border border-border py-1 animate-[scaleIn_100ms_ease-out] origin-top-right">
                <div className="space-y-0.5 py-1">
                  <button
                    type="button"
                    onClick={() => { onTogglePanel('crossrefs'); setMobileMenuOpen(false) }}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 cursor-pointer text-left',
                      activePanel === 'study' && studyTab === 'crossrefs' ? 'text-accent bg-accent/10' : 'text-text-primary hover:bg-surface',
                    )}
                  >
                    <Crosshair size={14} />
                    Cross References
                  </button>
                  <button
                    type="button"
                    onClick={() => { onTogglePanel('bookmarks'); setMobileMenuOpen(false) }}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 cursor-pointer text-left',
                      activePanel === 'bookmarks' ? 'text-accent bg-accent/10' : 'text-text-primary hover:bg-surface',
                    )}
                  >
                    <Bookmark size={14} />
                    Bookmarks
                  </button>
                  <button
                    type="button"
                    onClick={() => { onToggleInterlinear?.(); setMobileMenuOpen(false) }}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 cursor-pointer text-left',
                      interlinearEnabled ? 'text-accent bg-accent/10' : 'text-text-primary hover:bg-surface',
                    )}
                  >
                    <BookOpen size={14} />
                    Interlinear
                    {interlinearEnabled && <Check size={12} className="ml-auto text-accent" />}
                  </button>
                </div>

                <div className="border-t border-border px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Translations</p>
                  <div className="space-y-0.5">
                    {installedVersions.map((code) => {
                      const isOn = visibleVersions.includes(code)
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => { onToggleVersion(code); setMobileMenuOpen(false) }}
                          className="flex items-center gap-2 px-1 py-1 text-xs text-text-primary hover:text-accent transition-colors duration-100 cursor-pointer w-full text-left"
                        >
                          <span className={clsx(
                            'w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0',
                            isOn ? 'bg-accent border-accent' : 'border-border',
                          )}>
                            {isOn && <Check size={9} className="text-white" />}
                          </span>
                          {code}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
