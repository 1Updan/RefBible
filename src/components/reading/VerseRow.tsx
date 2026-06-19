import { useRef, useCallback } from 'react'
import { BookmarkCheck } from 'lucide-react'
import { CrossReferenceChip } from './CrossReferenceChip'
import { formatVerseId } from '@/lib/utils'
import clsx from 'clsx'
import type { Verse, ContentText, CrossReference } from '@/types/db'

interface VerseRowProps {
  verse: Verse
  translations: ContentText[]
  crossReferences: CrossReference[]
  visibleVersions: string[]
  fontSize: number
  isSelected: boolean
  isBookmarked: boolean
  isDesktop: boolean
  onToggleSelect: () => void
  onNavigateToRef: (verseId: string) => void
  onOpenCrossRefs: (verseId: string) => void
}

export function VerseRow({
  verse,
  translations,
  crossReferences,
  visibleVersions,
  fontSize,
  isSelected,
  isBookmarked,
  isDesktop,
  onToggleSelect,
  onNavigateToRef,
  onOpenCrossRefs,
}: VerseRowProps) {
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const handleTouchStart = useCallback(() => {
    longPressFired.current = false
    longPressRef.current = setTimeout(() => {
      longPressFired.current = true
      onToggleSelect()
    }, 500)
  }, [onToggleSelect])

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    if (!longPressFired.current) onToggleSelect()
  }, [onToggleSelect])

  const handleTouchMove = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }, [])

  const showMoreThanOne = visibleVersions.length > 1

  const versionTexts = visibleVersions
    .map((code) => translations.find((t) => t.translation_code === code))
    .filter(Boolean) as ContentText[]

  return (
    <div
      className={clsx(
        'group flex gap-3 py-2.5 px-4 rounded-lg transition-colors duration-150',
        isSelected ? 'bg-accent/8 ring-1 ring-accent/30' : 'hover:bg-surface/50',
      )}
      onClick={isDesktop ? onToggleSelect : undefined}
      onTouchStart={isDesktop ? undefined : handleTouchStart}
      onTouchEnd={isDesktop ? undefined : handleTouchEnd}
      onTouchMove={isDesktop ? undefined : handleTouchMove}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <span
        className={clsx(
          'shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150',
          isSelected
            ? 'bg-accent text-white'
            : 'bg-badge-bg text-badge-text group-hover:bg-accent group-hover:text-white',
        )}
      >
        {verse.verse_num}
      </span>

      <div className="flex-1 min-w-0 space-y-1">
        {versionTexts.map((vt, i) => {
          const size = i === 0 ? fontSize : Math.max(fontSize - 2, 14)
          const colorClass = i === 0 ? 'text-text-primary' : 'text-text-secondary'
          return (
            <div key={vt.translation_code} className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                {showMoreThanOne && (
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wider mr-1.5 align-baseline">
                    {vt.translation_code}
                  </span>
                )}
                <div
                  className={clsx('inline font-serif leading-[1.65] tracking-[0.01em]', colorClass)}
                  style={{ fontSize: `${size}px` }}
                >
                  {vt.text_data}
                </div>
              </div>
              {i === 0 && isBookmarked && (
                <BookmarkCheck size={14} className="text-accent shrink-0 mt-0.5" />
              )}
            </div>
          )
        })}

        {crossReferences.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {crossReferences.slice(0, 3).map((xref) => (
              <CrossReferenceChip
                key={xref.id}
                reference={formatVerseId(xref.target_verse_id)}
                onClick={() => onNavigateToRef(xref.target_verse_id)}
              />
            ))}
            {crossReferences.length > 3 && (
              <button
                type="button"
                onClick={() => onOpenCrossRefs(verse.id)}
                className="text-xs text-accent hover:text-accent-hover font-medium px-1 cursor-pointer"
              >
                +{crossReferences.length - 3} more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
