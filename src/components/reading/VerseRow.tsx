import { memo, useMemo, useRef } from 'react'
import { BookmarkCheck, MessageSquareMore } from 'lucide-react'
import { CrossReferenceChip } from './CrossReferenceChip'
import { InterlinearView } from './InterlinearView'
import { formatVerseId } from '@/lib/utils'
import { parseWordsOfChrist, applyChristWords } from '@/lib/redLetter'
import { getChristWords } from '@/lib/wordsOfChrist'
import { getRedSpans } from '@/lib/redSpans'
import { HIGHLIGHT_COLORS } from '@/lib/highlights'
import clsx from 'clsx'
import type { Verse, ContentText, CrossReference, InterlinearWord } from '@/types/db'
import type { HighlightColorId } from '@/lib/highlights'

interface VerseRowProps {
  verse: Verse
  translations: ContentText[]
  crossReferences: CrossReference[]
  interlinearWords?: InterlinearWord[]
  visibleVersions: string[]
  fontSize: number
  isSelected: boolean
  isBookmarked: boolean
  hasNote: boolean
  interlinearEnabled: boolean
  interlinearLanguages: readonly ('hebrew' | 'greek')[]
  isHighlighted?: boolean
  highlightColors?: string[]
  activeHighlightColor?: HighlightColorId | null
  onToggleSelect: (e: React.MouseEvent) => void
  onNavigateToRef: (verseId: string) => void
  onOpenCrossRefs: (verseId: string) => void
  onSelectWord: (word: InterlinearWord, verseId: string, reference: string) => void
  onHighlightVerse?: (verseId: string, color?: HighlightColorId) => void
}

export const VerseRow = memo(function VerseRow({
  verse,
  translations,
  crossReferences,
  interlinearWords,
  visibleVersions,
  fontSize,
  isSelected,
  isBookmarked,
  hasNote,
  interlinearEnabled,
  interlinearLanguages,
  isHighlighted,
  highlightColors,
  activeHighlightColor,
  onToggleSelect,
  onNavigateToRef,
  onOpenCrossRefs,
  onSelectWord,
  onHighlightVerse,
}: VerseRowProps) {
  const guardRef = useRef(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    guardRef.current = true
    if (activeHighlightColor && onHighlightVerse) {
      onHighlightVerse(verse.id)
    } else {
      onToggleSelect(e)
    }
    setTimeout(() => { guardRef.current = false }, 300)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (guardRef.current) return
    if (activeHighlightColor && onHighlightVerse) {
      onHighlightVerse(verse.id)
    } else {
      onToggleSelect(e)
    }
  }

  const hasHiddenUserXrefs = useMemo(() => {
    return crossReferences.slice(3).some((x) => x.user_created)
  }, [crossReferences])

  const showMoreThanOne = visibleVersions.length > 1

  const versionTexts = visibleVersions
    .map((code) => translations.find((t) => t.translation_code === code))
    .filter(Boolean) as ContentText[]

  const getBookName = () => {
    const parts = verse.id.split('.')
    return parts[0] || ''
  }

  const reference = `${getBookName()} ${verse.chapter_num}:${verse.verse_num}`

  const highlightBg = useMemo(() => {
    if (!highlightColors || highlightColors.length === 0) return undefined
    const c = HIGHLIGHT_COLORS.find((h) => h.id === highlightColors[0])
    return c ? c.bg + '33' : undefined
  }, [highlightColors])

  return (
    <div
      id={`verse-${verse.id}`}
      className={clsx(
        'group flex gap-3 py-2.5 px-4 rounded-lg transition-colors duration-150 touch-manipulation cursor-pointer',
        isHighlighted || isSelected ? 'bg-accent/20 ring-2 ring-accent/50' : 'hover:bg-surface/50 active:bg-surface/70 active:scale-[0.99]',
        isHighlighted && 'animate-[highlightPulse_2s_ease-out]',
      )}
      style={highlightBg ? { backgroundColor: highlightBg } : undefined}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <span
        className={clsx(
          'shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150',
          isHighlighted || isSelected
            ? 'bg-accent text-white'
            : 'bg-badge-bg text-badge-text group-hover:bg-accent group-hover:text-white',
        )}
      >
        {verse.verse_num}
      </span>

      <div className="flex-1 min-w-0 space-y-1">
        {interlinearEnabled && interlinearWords && interlinearWords.length > 0 ? (
          <InterlinearView
            verseId={verse.id}
            words={interlinearWords}
            reference={reference}
            fontSize={fontSize}
            interlinearLanguages={interlinearLanguages}
            onSelectWord={onSelectWord}
          />
        ) : (
          versionTexts.map((vt, i) => {
            const size = i === 0 ? fontSize : Math.max(fontSize - 2, 14)
            const colorClass = i === 0 ? 'text-text-primary' : 'text-text-secondary'
            // Red letters: KJV via bundled quotes, WEB/ASV/DRA/GENEVA1599 via
            // bundled sidecar spans (hash-verified). NASB renders plain by
            // decision. Interlinear branch above is untouched by design.
            const sidecar =
              vt.translation_code === 'KJV'
                ? null
                : getRedSpans(vt.translation_code, verse.id, vt.text_data)
            const displayText =
              vt.translation_code === 'KJV'
                ? applyChristWords(vt.text_data, getChristWords(formatVerseId(verse.id)))
                : vt.text_data
            const segments: { text: string; red: boolean }[] = []
            if (sidecar) {
              let last = 0
              for (const sp of sidecar) {
                if (sp.start > last) segments.push({ text: vt.text_data.slice(last, sp.start), red: false })
                segments.push({ text: vt.text_data.slice(sp.start, sp.end), red: true })
                last = sp.end
              }
              if (last < vt.text_data.length) segments.push({ text: vt.text_data.slice(last), red: false })
            } else {
              for (const seg of parseWordsOfChrist(displayText)) {
                segments.push({ text: seg.text, red: seg.isWordOfChrist })
              }
            }
            return (
              <div key={vt.translation_code} className="flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  {showMoreThanOne && (
                    <span className="text-[10px] font-semibold text-accent uppercase tracking-wider mr-1.5 align-baseline">
                      {vt.translation_code}
                    </span>
                  )}
                    <div
                      className={clsx('block font-serif leading-[1.65] tracking-[0.01em] text-left', colorClass)}
                      style={{ fontSize: `${size}px` }}
                    >
                    {segments.map((seg, j) =>
                      seg.red ? (
                        <span key={j} className="text-danger">{seg.text}</span>
                      ) : (
                        <span key={j}>{seg.text}</span>
                      ),
                    )}
                  </div>
                </div>
                {i === 0 && (
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {isBookmarked && <BookmarkCheck size={14} className="text-accent" />}
                    {hasNote && <MessageSquareMore size={14} className="text-text-tertiary" />}
                  </div>
                )}
              </div>
            )
          })
        )}

        {crossReferences.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {crossReferences.slice(0, 3).map((xref) => (
              <CrossReferenceChip
                key={xref.id}
                reference={formatVerseId(xref.target_verse_id)}
                onClick={() => onNavigateToRef(xref.target_verse_id)}
                isUserAdded={!!xref.user_created}
              />
            ))}
            {crossReferences.length > 3 && (
              <span className="inline-flex items-baseline gap-0.5">
                {hasHiddenUserXrefs ? (
                  <button
                    type="button"
                    onClick={() => onOpenCrossRefs(verse.id)}
                    className="text-xs font-medium px-1 cursor-pointer transition-colors duration-150 text-accent hover:text-accent-hover"
                  >
                    <span className="text-danger font-bold">+{crossReferences.length - 3} more</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenCrossRefs(verse.id)}
                    className="text-xs text-accent hover:text-accent-hover font-medium px-1 cursor-pointer"
                  >
                    +{crossReferences.length - 3} more
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
