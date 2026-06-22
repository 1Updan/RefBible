import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Crosshair, MessageSquareMore, Sparkles, X, List, XCircle, GripVertical, BookText } from 'lucide-react'
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
}: VerseActionBarProps) {
  if (isDesktop) {
    return <DesktopActionBar
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
    />
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center px-4 animate-[slideUp_150ms_ease-out] pointer-events-none">
      <div className="w-fit max-w-full flex items-center gap-1 px-2.5 py-1 bg-action-bar shadow-2xl rounded-2xl overflow-hidden pointer-events-auto">
        <span className="text-xs text-white/80 font-medium shrink-0 pl-0.5">
          {selectedCount}
          <span className="hidden sm:inline">v</span>
        </span>
        <span className="w-px h-5 bg-white/20 shrink-0" />
        <button
          type="button"
          onClick={onToggleBookmark}
          className={clsx(
            'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer',
            allBookmarked ? 'text-white' : 'text-white/80 hover:text-white',
          )}
        >
          {allBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          <span className="text-[9px] leading-none">Save</span>
        </button>
        {onRangeSelect && selectedCount === 1 && (
          <button
            type="button"
            onClick={onRangeSelect}
            className={clsx(
              'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer',
              isRangeMode ? 'text-accent bg-white/15' : 'text-white/80 hover:text-white',
            )}
          >
            {isRangeMode ? <XCircle size={15} /> : <List size={15} />}
            <span className="text-[9px] leading-none">{isRangeMode ? 'Cancel' : 'Range'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onAddNote}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <MessageSquareMore size={15} />
          <span className="text-[9px] leading-none">Note</span>
        </button>
        <button
          type="button"
          onClick={onCrossReferences}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <Crosshair size={15} />
          <span className="text-[9px] leading-none">Refs</span>
        </button>
        <button
          type="button"
          onClick={onAiCommentary}
          disabled={!isOnline}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white/80 hover:text-white"
        >
          <Sparkles size={15} />
          <span className="text-[9px] leading-none">AI</span>
        </button>
        <button
          type="button"
          onClick={onToggleInterlinear}
          className={clsx(
            'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer',
            interlinearEnabled ? 'text-accent bg-white/15' : 'text-white/80 hover:text-white',
          )}
        >
          <BookText size={15} />
          <span className="text-[9px] leading-none">IL</span>
        </button>
        <span className="w-px h-5 bg-white/20 shrink-0" />
        <button
          type="button"
          onClick={onClearSelection}
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg text-white/60 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <X size={15} />
          <span className="text-[9px] leading-none">Done</span>
        </button>
      </div>
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

  // Clamp on mount and resize — useLayoutEffect avoids an off-screen flash before paint
  useLayoutEffect(() => {
    const onResize = () => setOffset((prev) => clampOffset(prev.x, prev.y))
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [clampOffset])

  return (
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
