import { Bookmark, BookmarkCheck, Crosshair, MessageSquareMore, Sparkles, X } from 'lucide-react'
import clsx from 'clsx'

interface VerseActionBarProps {
  selectedCount: number
  isDesktop: boolean
  allBookmarked: boolean
  onToggleBookmark: () => void
  onAddNote: () => void
  onCrossReferences: () => void
  onAiCommentary: () => void
  onClearSelection: () => void
}

export function VerseActionBar({
  selectedCount,
  isDesktop,
  allBookmarked,
  onToggleBookmark,
  onAddNote,
  onCrossReferences,
  onAiCommentary,
  onClearSelection,
}: VerseActionBarProps) {
  if (isDesktop) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-xl bg-action-bar shadow-2xl px-2 py-1.5 animate-[fadeIn_150ms_ease-out]">
        <span className="text-xs text-white/80 font-medium px-2 whitespace-nowrap">
          {selectedCount} verse{selectedCount !== 1 ? 's' : ''}
        </span>
        <span className="w-px h-5 bg-white/20" />
        <ActionButton icon={allBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} label={allBookmarked ? 'Unbookmark' : 'Bookmark'} onClick={onToggleBookmark} />
        <ActionButton icon={<MessageSquareMore size={15} />} label="Note" onClick={onAddNote} />
        <ActionButton icon={<Crosshair size={15} />} label="Refs" onClick={onCrossReferences} />
        <ActionButton icon={<Sparkles size={15} />} label="AI" onClick={onAiCommentary} />
        <span className="w-px h-5 bg-white/20" />
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
          aria-label="Clear selection"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-action-bar shadow-2xl animate-[slideUp_150ms_ease-out]">
      <span className="text-sm text-white/80 font-medium">
        {selectedCount} verse{selectedCount !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleBookmark}
          className={clsx(
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer',
            allBookmarked ? 'text-white' : 'text-white/80 hover:text-white',
          )}
        >
          {allBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          <span className="text-[10px]">Save</span>
        </button>
        <button
          type="button"
          onClick={onAddNote}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <MessageSquareMore size={18} />
          <span className="text-[10px]">Note</span>
        </button>
        <button
          type="button"
          onClick={onCrossReferences}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <Crosshair size={18} />
          <span className="text-[10px]">Refs</span>
        </button>
        <button
          type="button"
          onClick={onAiCommentary}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <Sparkles size={18} />
          <span className="text-[10px]">AI</span>
        </button>
        <span className="w-px h-8 bg-white/20 mx-1" />
        <button
          type="button"
          onClick={onClearSelection}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-all duration-150 cursor-pointer"
        >
          <X size={18} />
          <span className="text-[10px]">Done</span>
        </button>
      </div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
