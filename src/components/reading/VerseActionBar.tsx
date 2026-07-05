import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Crosshair, MessageSquareMore, Sparkles, X, List, XCircle, GripVertical, BookText, Share2, Highlighter, Eraser } from 'lucide-react'
import { HIGHLIGHT_COLORS } from '@/lib/highlights'
import type { HighlightColorId } from '@/lib/highlights'
import clsx from 'clsx'

interface VerseActionBarProps {
  selectedCount: number
  isDesktop: boolean
  isOnline: boolean
  allBookmarked: boolean
  interlinearEnabled: boolean
  onToggleInterlinear: () => void
  onToggleBookmark: () => void
  onAddNote: () => void
  onCrossReferences: () => void
  onAiCommentary: () => void
  onClearSelection: () => void
  onRangeSelect?: () => void
  isRangeMode?: boolean
  onShare?: () => void
  highlightActive?: boolean
  activeHighlightColor?: HighlightColorId | null
  onToggleHighlight?: () => void
  onHighlightColorSelect?: (color: HighlightColorId | null) => void
  onEraseSelection?: () => void
}

export function VerseActionBar({
  selectedCount,
  isDesktop,
  isOnline,
  allBookmarked,
  interlinearEnabled,
  onToggleInterlinear,
  onToggleBookmark,
  onAddNote,
  onCrossReferences,
  onAiCommentary,
  onClearSelection,
  onRangeSelect,
  isRangeMode,
  onShare,
  highlightActive,
  activeHighlightColor,
  onToggleHighlight,
  onHighlightColorSelect,
  onEraseSelection,
}: VerseActionBarProps) {
  if (isDesktop) {
    return (
      <DesktopActionBar
        selectedCount={selectedCount}
        allBookmarked={allBookmarked}
        isOnline={isOnline}
        interlinearEnabled={interlinearEnabled}
        onToggleInterlinear={onToggleInterlinear}
        onToggleBookmark={onToggleBookmark}
        onAddNote={onAddNote}
        onCrossReferences={onCrossReferences}
        onAiCommentary={onAiCommentary}
        onClearSelection={onClearSelection}
        onRangeSelect={onRangeSelect}
        isRangeMode={isRangeMode}
        onShare={onShare}
        highlightActive={highlightActive}
        activeHighlightColor={activeHighlightColor}
        onToggleHighlight={onToggleHighlight}
        onHighlightColorSelect={onHighlightColorSelect}
        onEraseSelection={onEraseSelection}
      />
    )
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 flex flex-col items-center px-2 animate-[slideUp_150ms_ease-out] pointer-events-none">
      <div className="w-fit max-w-[96vw] flex items-center gap-0.5 px-1.5 py-1 bg-action-bar shadow-2xl rounded-2xl overflow-x-auto scrollbar-none pointer-events-auto">
        <span className="text-[10px] sm:text-xs text-white/80 font-medium shrink-0 pl-0.5">
          {selectedCount}
          <span className="hidden sm:inline">v</span>
        </span>
        <span className="w-px h-4 sm:h-5 bg-white/20 shrink-0 mx-0.5" />
        <button
          type="button"
          onClick={onToggleBookmark}
          className={clsx(
            'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-150 cursor-pointer',
            allBookmarked ? 'text-white' : 'text-white/80 hover:text-white',
          )}
        >
          {allBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          <span className="text-[7px] sm:text-[9px] leading-none">Mark</span>
        </button>
        {onRangeSelect && selectedCount === 1 && (
          <button
            type="button"
            onClick={onRangeSelect}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-150 cursor-pointer',
              isRangeMode ? 'text-accent bg-white/15' : 'text-white/80 hover:text-white',
            )}
          >
            {isRangeMode ? <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span className="text-[7px] sm:text-[9px] leading-none">{isRangeMode ? 'Cancel' : 'Range'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onAddNote}
          className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <MessageSquareMore className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[9px] leading-none">Note</span>
        </button>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[7px] sm:text-[9px] leading-none">Share</span>
          </button>
        )}
        {onToggleHighlight && (
          <button
            type="button"
            onClick={onToggleHighlight}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-150 cursor-pointer',
              highlightActive
                ? 'text-accent bg-white/15'
                : 'text-white/80 hover:text-white',
            )}
          >
            <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[7px] sm:text-[9px] leading-none">Mark</span>
          </button>
        )}
        <button
          type="button"
          onClick={onCrossReferences}
          className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[9px] leading-none">Refs</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isOnline) { alert('You are offline — AI features require an internet connection.'); return }
            onAiCommentary()
          }}
          disabled={!isOnline}
          className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white/80 hover:text-white"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[9px] leading-none">AI</span>
        </button>
        <button
          type="button"
          onClick={onToggleInterlinear}
          className={clsx(
            'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg transition-all duration-150 cursor-pointer',
            interlinearEnabled ? 'text-accent bg-white/15' : 'text-white/80 hover:text-white',
          )}
        >
          <BookText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[9px] leading-none">Inter</span>
        </button>
        <span className="w-px h-4 sm:h-5 bg-white/20 shrink-0 mx-0.5" />
        <button
          type="button"
          onClick={onClearSelection}
          className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 sm:px-2.5 sm:py-2 rounded-lg text-white/60 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[7px] sm:text-[9px] leading-none">Done</span>
        </button>
      </div>

      {highlightActive && onHighlightColorSelect && (
        <div className="mt-1.5 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-action-bar shadow-xl rounded-full pointer-events-auto animate-[fadeIn_100ms_ease-out]">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onHighlightColorSelect(activeHighlightColor === c.id ? null : c.id)}
              className={clsx(
                'w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-100 cursor-pointer ring-1 ring-white/20 hover:scale-110',
                activeHighlightColor === c.id ? 'ring-2 ring-white scale-110' : '',
              )}
              style={{ backgroundColor: c.bg }}
              aria-label={c.label}
            />
          ))}
          <span className="w-px h-3.5 sm:h-4 bg-white/20 shrink-0" />
          <button
            type="button"
            onClick={onEraseSelection}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-100 cursor-pointer ring-1 ring-white/20 hover:scale-110 bg-white/10"
            aria-label="Remove highlights"
            title="Remove highlights"
          >
            <Eraser className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/70" />
          </button>
        </div>
      )}
    </div>
  )
}

function DesktopActionBar({
  selectedCount,
  allBookmarked,
  isOnline,
  interlinearEnabled,
  onToggleInterlinear,
  onToggleBookmark,
  onAddNote,
  onCrossReferences,
  onAiCommentary,
  onClearSelection,
  onRangeSelect,
  isRangeMode,
  onShare,
  highlightActive,
  activeHighlightColor,
  onToggleHighlight,
  onHighlightColorSelect,
  onEraseSelection,
}: {
  selectedCount: number
  allBookmarked: boolean
  isOnline: boolean
  interlinearEnabled: boolean
  onToggleInterlinear: () => void
  onToggleBookmark: () => void
  onAddNote: () => void
  onCrossReferences: () => void
  onAiCommentary: () => void
  onClearSelection: () => void
  onRangeSelect?: () => void
  isRangeMode?: boolean
  onShare?: () => void
  highlightActive?: boolean
  activeHighlightColor?: HighlightColorId | null
  onToggleHighlight?: () => void
  onHighlightColorSelect?: (color: HighlightColorId | null) => void
  onEraseSelection?: () => void
}) {
  const [offset, setOffset] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('refbible-action-bar-offset')
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return { x: 0, y: 0 }
  })
  const drag = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 })
  const handleRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const clampOffset = useCallback((x: number, y: number) => {
    const el = barRef.current
    if (!el) return { x, y }
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const m = 8
    return {
      x: Math.max(m - vw / 2 + w / 2, Math.min(vw / 2 - w / 2 - m, x)),
      y: Math.max(m - vh + 24 + h, Math.min(24 - m, y)),
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
    if (handleRef.current) {
      handleRef.current.setPointerCapture(e.pointerId)
    }
  }, [offset])

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!drag.current.active) return
      const rawX = drag.current.origX + (e.clientX - drag.current.startX)
      const rawY = drag.current.origY + (e.clientY - drag.current.startY)
      setOffset(clampOffset(rawX, rawY))
    }
    const handleUp = () => {
      if (drag.current.active) {
        drag.current.active = false
        setOffset((prev) => clampOffset(prev.x, prev.y))
      }
    }
    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [clampOffset])

  useEffect(() => {
    localStorage.setItem('refbible-action-bar-offset', JSON.stringify(offset))
  }, [offset])

  useLayoutEffect(() => {
    const onResize = () => setOffset((prev) => clampOffset(prev.x, prev.y))
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [clampOffset])

  return (
    <div className="flex flex-col items-center">
      <div
        ref={barRef}
        className="fixed bottom-6 left-1/2 z-40 flex items-center gap-px rounded-xl bg-action-bar shadow-2xl px-1 py-1.5 animate-[fadeIn_150ms_ease-out] select-none touch-none"
        style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }}
      >
        <span
          ref={handleRef}
          className="flex items-center gap-0.5 text-[11px] text-white/80 font-medium px-1 py-1 whitespace-nowrap rounded-lg cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
          onPointerDown={handlePointerDown}
        >
          <GripVertical size={11} className="text-white/50 shrink-0" />
          {selectedCount}
        </span>
        <span className="w-px h-4 bg-white/20" />
        <ActionButton icon={allBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />} label={allBookmarked ? 'Unbookmark' : 'Bookmark'} onClick={onToggleBookmark} />
        {onRangeSelect && selectedCount === 1 && (
          <ActionButton
            icon={isRangeMode ? <XCircle size={13} /> : <List size={13} />}
            label={isRangeMode ? 'Cancel' : 'Range'}
            onClick={onRangeSelect}
            highlighted={isRangeMode}
          />
        )}
        <ActionButton icon={<MessageSquareMore size={13} />} label="Note" onClick={onAddNote} />
        {onShare && <ActionButton icon={<Share2 size={13} />} label="Share" onClick={onShare} />}
        {onToggleHighlight && (
          <ActionButton
            icon={<Highlighter size={13} />}
            label={highlightActive ? 'HL On' : 'HL'}
            onClick={onToggleHighlight}
            highlighted={highlightActive}
          />
        )}
        <ActionButton icon={<Crosshair size={13} />} label="Refs" onClick={onCrossReferences} />
        <ActionButton icon={<Sparkles size={13} />} label="AI" onClick={onAiCommentary} disabled={!isOnline} />
        <ActionButton icon={<BookText size={13} />} label="IL" onClick={onToggleInterlinear} highlighted={interlinearEnabled} />
        <span className="w-px h-4 bg-white/20" />
        <button
          type="button"
          onClick={onClearSelection}
          className="p-0.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
          aria-label="Clear selection"
        >
          <X size={13} />
        </button>
      </div>

      {highlightActive && onHighlightColorSelect && (
        <div
          className="fixed bottom-[88px] left-1/2 z-40 flex items-center gap-1.5 px-2.5 py-1.5 bg-action-bar shadow-xl rounded-full animate-[fadeIn_100ms_ease-out]"
          style={{ transform: 'translateX(-50%)' }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onHighlightColorSelect(activeHighlightColor === c.id ? null : c.id)}
              className={clsx(
                'w-5 h-5 rounded-full transition-all duration-100 cursor-pointer ring-1 ring-white/20 hover:scale-110',
                activeHighlightColor === c.id ? 'ring-2 ring-white scale-110' : '',
              )}
              style={{ backgroundColor: c.bg }}
              aria-label={c.label}
            />
          ))}
          <span className="w-px h-4 bg-white/20 shrink-0" />
          <button
            type="button"
            onClick={onEraseSelection}
            className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-100 cursor-pointer ring-1 ring-white/20 hover:scale-110 bg-white/10"
            aria-label="Remove highlights"
            title="Remove highlights"
          >
            <Eraser size={10} className="text-white/70" />
          </button>
        </div>
      )}
    </div>
  )
}

function ActionButton({ icon, label, onClick, disabled, highlighted }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; highlighted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        highlighted ? 'text-accent bg-white/15' : 'text-white/80 hover:text-white hover:bg-white/10',
      )}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}
