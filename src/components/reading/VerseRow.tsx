import { useRef, useCallback } from 'react'
import { CrossReferenceChip } from './CrossReferenceChip'
import { formatVerseId } from '@/lib/utils'
import clsx from 'clsx'
import type { Verse, ContentText, CrossReference } from '@/types/db'

interface VerseRowProps {
  verse: Verse
  translations: ContentText[]
  crossReferences: CrossReference[]
  showKJV: boolean
  showNASB: boolean
  fontSize: number
  isSelected: boolean
  isDesktop: boolean
  onToggleSelect: () => void
  onNavigateToRef: (verseId: string) => void
  onOpenCrossRefs: (verseId: string) => void
}

export function VerseRow({
  verse,
  translations,
  crossReferences,
  showKJV,
  showNASB,
  fontSize,
  isSelected,
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

  const kvj = translations.find((t) => t.translation_code === 'KJV')
  const nasb = translations.find((t) => t.translation_code === 'NASB')

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
        {showKJV && kvj && (
          <div>
            {showNASB && (
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider mr-1.5 align-baseline">KJV</span>
            )}
            <p
              className="inline text-text-primary leading-[1.65] tracking-[0.01em] font-serif"
              style={{ fontSize: `${fontSize}px` }}
            >
              {kvj.text_data}
            </p>
          </div>
        )}
        {showNASB && nasb && (
          <div>
            {showKJV && (
              <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mr-1.5 align-baseline">NASB</span>
            )}
            <p
              className="inline text-text-secondary leading-[1.55] tracking-[0.01em] font-serif"
              style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
            >
              {nasb.text_data}
            </p>
          </div>
        )}

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
