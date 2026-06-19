import { useState } from 'react'
import { Book, ChevronRight, ChevronDown } from 'lucide-react'
import { BOOKS } from '@/data/books'
import clsx from 'clsx'

interface BookChapterNavProps {
  selectedBook: number
  selectedChapter: number
  onSelect: (bookId: number, chapter: number) => void
}

const OT_BOOKS = BOOKS.filter((b) => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter((b) => b.testament === 'NT')

export function BookChapterNav({ selectedBook, selectedChapter, onSelect }: BookChapterNavProps) {
  const [expandedBook, setExpandedBook] = useState<number>(selectedBook)
  const [showOT, setShowOT] = useState(true)
  const [showNT, setShowNT] = useState(true)

  const handleBookClick = (bookId: number) => {
    setExpandedBook((prev) => (prev === bookId ? -1 : bookId))
  }

  const renderSection = (title: string, books: typeof OT_BOOKS, expanded: boolean, onToggle: () => void) => (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-accent uppercase tracking-widest hover:text-accent-hover transition-colors duration-150 cursor-pointer border-b border-border-subtle mb-1"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {expanded && books.map((book) => {
        const isOpen = expandedBook === book.id
        return (
          <div key={book.id}>
            <button
              type="button"
              onClick={() => handleBookClick(book.id)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer text-left',
                isOpen
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
            >
              <ChevronRight
                size={14}
                className={clsx('shrink-0 transition-transform duration-200', isOpen && 'rotate-90')}
              />
              <span>{book.name}</span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-5 gap-1 px-3 pb-2 pt-1">
                {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => onSelect(book.id, ch)}
                    className={clsx(
                      'text-xs rounded-lg px-1 py-1.5 font-medium transition-all duration-150 cursor-pointer',
                      selectedBook === book.id && selectedChapter === ch
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <nav className="flex flex-col h-full select-none">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Book size={16} className="text-accent shrink-0" />
        <span className="text-sm font-semibold text-text-primary">Library</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {renderSection('Old Testament', OT_BOOKS, showOT, () => setShowOT((p) => !p))}
        {renderSection('New Testament', NT_BOOKS, showNT, () => setShowNT((p) => !p))}
      </div>
    </nav>
  )
}
