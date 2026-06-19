import { ChevronLeft, ChevronRight, Bookmark, Sparkles, Settings, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'

interface ChapterHeaderProps {
  bookName: string
  chapter: number
  totalChapters: number
  canGoBack: boolean
  onGoBack: () => void
  onPrevChapter: () => void
  onNextChapter: () => void
  activePanel: string
  onTogglePanel: (panel: 'bookmarks' | 'ai' | 'settings') => void
  isDesktop: boolean
  visibleVersions: string[]
  installedVersions: string[]
  onToggleVersion: (code: string) => void
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
  onTogglePanel,
  isDesktop,
  visibleVersions,
  installedVersions,
  onToggleVersion,
}: ChapterHeaderProps) {
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

      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
        {installedVersions.map((code) => {
          const isOn = visibleVersions.includes(code)
          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggleVersion(code)}
              className={clsx(
                'px-2 py-1 text-[10px] font-semibold rounded-full border transition-all duration-150 cursor-pointer shrink-0',
                isOn
                  ? 'bg-accent text-white border-accent'
                  : 'bg-transparent text-text-tertiary border-border hover:text-text-secondary hover:border-text-tertiary',
              )}
            >
              {code}
            </button>
          )
        })}
        <span className="w-px h-5 bg-border mx-0.5" />
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
            activePanel === 'ai'
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
