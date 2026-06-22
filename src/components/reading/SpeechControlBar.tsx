import { ChevronLeft, ChevronRight, Play, Pause, Square, BookOpen } from 'lucide-react'

interface SpeechControlBarProps {
  speaking: boolean
  paused: boolean
  bookName: string
  chapter: number
  onPlayPause: () => void
  onStop: () => void
  onPrevChapter: () => void
  onNextChapter: () => void
  hasPrev: boolean
  hasNext: boolean
}

export function SpeechControlBar({
  speaking,
  paused,
  bookName,
  chapter,
  onPlayPause,
  onStop,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
}: SpeechControlBarProps) {
  if (!speaking && !paused) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface/95 backdrop-blur-sm shrink-0 animate-[fadeIn_150ms_ease-out]">
      <div className="flex items-center gap-1.5 min-w-0 mr-auto">
        <BookOpen size={14} className="text-accent shrink-0" />
        <span className="text-xs font-semibold text-text-primary truncate">{bookName} {chapter}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrevChapter}
          disabled={!hasPrev}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          aria-label="Previous chapter"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white hover:bg-accent-hover transition-all duration-150 cursor-pointer"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={14} className="ml-0.5" /> : <Pause size={14} />}
        </button>

        <button
          type="button"
          onClick={onStop}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all duration-150 cursor-pointer"
          aria-label="Stop"
        >
          <Square size={14} />
        </button>

        <button
          type="button"
          onClick={onNextChapter}
          disabled={!hasNext}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          aria-label="Next chapter"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
