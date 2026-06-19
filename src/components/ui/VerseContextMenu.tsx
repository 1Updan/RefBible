import {
  Bookmark,
  BookmarkCheck,
  MessageSquareMore,
  Crosshair,
  Sparkles,
} from 'lucide-react'
import * as ContextMenu from '@radix-ui/react-context-menu'

interface VerseContextMenuProps {
  isBookmarked: boolean
  onToggleBookmark: () => void
  onAddNote: () => void
  onViewCrossReferences: () => void
  onAiCommentary: () => void
  children: React.ReactNode
}

export function VerseContextMenu({
  isBookmarked,
  onToggleBookmark,
  onAddNote,
  onViewCrossReferences,
  onAiCommentary,
  children,
}: VerseContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[180px] bg-surface-elevated rounded-xl shadow-xl border border-border py-1 animate-[scaleIn_100ms_ease-out] origin-top-left z-50">
          <ContextMenu.Item
            onSelect={onToggleBookmark}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface outline-none cursor-pointer transition-colors duration-100"
          >
            {isBookmarked ? <BookmarkCheck size={14} className="text-accent" /> : <Bookmark size={14} />}
            {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
          </ContextMenu.Item>
          <ContextMenu.Item
            onSelect={onAddNote}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface outline-none cursor-pointer transition-colors duration-100"
          >
            <MessageSquareMore size={14} />
            Add Note
          </ContextMenu.Item>
          <ContextMenu.Item
            onSelect={onViewCrossReferences}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface outline-none cursor-pointer transition-colors duration-100"
          >
            <Crosshair size={14} />
            Cross References
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-border my-1 mx-2" />
          <ContextMenu.Item
            onSelect={onAiCommentary}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface outline-none cursor-pointer transition-colors duration-100"
          >
            <Sparkles size={14} className="text-accent" />
            AI Commentary
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
