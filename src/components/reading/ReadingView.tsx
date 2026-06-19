import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VerseRow } from './VerseRow'
import { VerseActionBar } from './VerseActionBar'
import { getCrossReferences, getTranslations, getVerses } from '@/lib/db'
import { useNavigation } from '@/hooks/useNavigation'
import { getBook } from '@/data/books'
import { parseOsisId } from '@/lib/utils'
import type { Verse, ContentText, CrossReference } from '@/types/db'

interface ReadingViewProps {
  bookId: number
  chapter: number
  visibleVersions: string[]
  fontSize: number
  bookmarks: Set<string>
  isDesktop: boolean
  onToggleBookmark: (verseId: string) => void
  onOpenNote: (verseId: string) => void
}

export function ReadingView({
  bookId,
  chapter,
  visibleVersions,
  fontSize,
  bookmarks,
  isDesktop,
  onToggleBookmark,
  onOpenNote,
}: ReadingViewProps) {
  const { openCrossReferences, setStudyTab, setActivePanel, navigateTo } = useNavigation()
  const [verses, setVerses] = useState<Verse[]>([])
  const [data, setData] = useState<Map<string, { texts: ContentText[]; xrefs: CrossReference[] }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIds(new Set())
    let cancelled = false
    setLoading(true)
    async function load() {
      const vs = await getVerses(bookId, chapter)
      if (cancelled) return
      setVerses(vs)
      const map = new Map<string, { texts: ContentText[]; xrefs: CrossReference[] }>()
      const batch = vs.map(async (v) => {
        const [texts, xrefs] = await Promise.all([
          getTranslations(v.id),
          getCrossReferences(v.id),
        ])
        map.set(v.id, { texts, xrefs })
      })
      await Promise.all(batch)
      if (!cancelled) {
        setData(map)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [bookId, chapter])

  const handleToggleSelect = useCallback((verseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(verseId)) next.delete(verseId)
      else next.add(verseId)
      return next
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleNavigateToRef = useCallback((targetId: string) => {
    const parsed = parseOsisId(targetId)
    if (parsed) {
      navigateTo(parsed.bookId, parsed.chapter, targetId, true)
    }
  }, [navigateTo])

  const handleOpenCrossRefs = useCallback((verseId: string) => {
    setSelectedIds(new Set([verseId]))
    const v = verses.find((x) => x.id === verseId)
    if (!v) return
    const book = getBook(bookId)
    openCrossReferences({
      verseId,
      bookId: v.book_id,
      chapter: v.chapter_num,
      reference: `${book?.name ?? 'John'} ${chapter}:${v.verse_num}`,
    })
  }, [verses, bookId, chapter, openCrossReferences])

  const selectedList = useMemo(
    () => [...selectedIds].sort((a, b) => a.localeCompare(b)),
    [selectedIds],
  )

  const allBookmarked = useMemo(
    () => selectedList.length > 0 && selectedList.every((id) => bookmarks.has(id)),
    [selectedList, bookmarks],
  )

  const handleActionBookmark = useCallback(() => {
    for (const id of selectedList) onToggleBookmark(id)
  }, [selectedList, onToggleBookmark])

  const handleActionNote = useCallback(() => {
    if (selectedList.length === 1) onOpenNote(selectedList[0])
  }, [selectedList, onOpenNote])

  const handleActionCrossRefs = useCallback(() => {
    if (selectedList.length === 1) {
      const v = verses.find((x) => x.id === selectedList[0])
      if (!v) return
      const book = getBook(bookId)
      openCrossReferences({
        verseId: selectedList[0],
        bookId: v.book_id,
        chapter: v.chapter_num,
        reference: `${book?.name ?? 'John'} ${chapter}:${v.verse_num}`,
      })
    }
  }, [selectedList, verses, bookId, chapter, openCrossReferences])

  const handleActionAi = useCallback(() => {
    if (selectedList.length === 1) {
      setStudyTab('ai')
      setActivePanel('study')
    }
  }, [selectedList, setStudyTab, setActivePanel])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-tertiary">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto overflow-x-hidden" ref={topRef}>
        <div className="max-w-[680px] mx-auto py-3 space-y-0.5">
          {verses.map((verse) => {
            const d = data.get(verse.id)
            return (
              <VerseRow
                key={verse.id}
                verse={verse}
                translations={d?.texts ?? []}
                crossReferences={d?.xrefs ?? []}
                visibleVersions={visibleVersions}
                fontSize={fontSize}
                isSelected={selectedIds.has(verse.id)}
                isBookmarked={bookmarks.has(verse.id)}
                isDesktop={isDesktop}
                onToggleSelect={() => handleToggleSelect(verse.id)}
                onNavigateToRef={handleNavigateToRef}
                onOpenCrossRefs={handleOpenCrossRefs}
              />
            )
          })}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <VerseActionBar
          selectedCount={selectedIds.size}
          isDesktop={isDesktop}
          allBookmarked={allBookmarked}
          onToggleBookmark={handleActionBookmark}
          onAddNote={handleActionNote}
          onCrossReferences={handleActionCrossRefs}
          onAiCommentary={handleActionAi}
          onClearSelection={handleClearSelection}
        />
      )}
    </div>
  )
}
