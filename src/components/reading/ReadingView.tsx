import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VerseRow } from './VerseRow'
import { VerseActionBar } from './VerseActionBar'
import { getCrossReferences, getTranslations, getVerses, getNotesForChapter } from '@/lib/db'
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
  isOnline: boolean
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
  isOnline,
  onToggleBookmark,
  onOpenNote,
}: ReadingViewProps) {
  const { openCrossReferences, setCrossRefTarget, setStudyTab, setActivePanel, navigateTo, setAiTarget, pendingRange, setPendingRange, activePanel, studyTab } = useNavigation()
  const [verses, setVerses] = useState<Verse[]>([])
  const [data, setData] = useState<Map<string, { texts: ContentText[]; xrefs: CrossReference[] }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null)
  const [rangeMode, setRangeMode] = useState(false)
  const [verseNotes, setVerseNotes] = useState<Set<string>>(new Set())
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSelectedIds(new Set())
      setSelectionAnchor(null)
      setRangeMode(false)
      setLoading(true)
      const [vs, noteIds] = await Promise.all([
        getVerses(bookId, chapter),
        getNotesForChapter(bookId, chapter),
      ])
      if (cancelled) return
      setVerses(vs)
      setVerseNotes(noteIds)
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
        if (pendingRange) {
          const ids = vs
            .filter((v) => v.verse_num >= pendingRange.verseStart && v.verse_num <= pendingRange.verseEnd)
            .map((v) => v.id)
          setSelectedIds(new Set(ids))
          setPendingRange(null)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [bookId, chapter, pendingRange, setPendingRange])

  const handleToggleSelect = useCallback((verseId: string, shiftKey?: boolean) => {
    if ((shiftKey || rangeMode) && selectionAnchor) {
      const anchorIdx = verses.findIndex(v => v.id === selectionAnchor)
      const clickIdx = verses.findIndex(v => v.id === verseId)
      if (anchorIdx !== -1 && clickIdx !== -1) {
        const start = Math.min(anchorIdx, clickIdx)
        const end = Math.max(anchorIdx, clickIdx)
        const ids = verses.slice(start, end + 1).map(v => v.id)
        setSelectedIds(new Set(ids))
        setRangeMode(false)
        return
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(verseId)) next.delete(verseId)
      else next.add(verseId)
      return next
    })
    setSelectionAnchor(verseId)
    setRangeMode(false)
  }, [verses, selectionAnchor, rangeMode])

  const handleRangeSelect = useCallback(() => {
    if (rangeMode) {
      setRangeMode(false)
    } else if (selectedIds.size === 1) {
      const anchor = [...selectedIds][0]
      setSelectionAnchor(anchor)
      setRangeMode(true)
    }
  }, [rangeMode, selectedIds])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setRangeMode(false)
  }, [])

  useEffect(() => {
    if (selectedIds.size === 1 && !rangeMode) {
      const verseId = [...selectedIds][0]
      if (bookmarks.has(verseId) && verseNotes.has(verseId)) {
        onOpenNote(verseId)
      }
    }
  }, [selectedIds, bookmarks, verseNotes, onOpenNote, rangeMode])

  useEffect(() => {
    if (selectedIds.size === 1 && activePanel === 'study' && studyTab === 'crossrefs') {
      const verseId = [...selectedIds][0]
      const v = verses.find((x) => x.id === verseId)
      if (!v) return
      const book = getBook(bookId)
      setCrossRefTarget({
        verseId,
        bookId: v.book_id,
        chapter: v.chapter_num,
        reference: `${book?.name ?? 'John'} ${chapter}:${v.verse_num}`,
      })
    }
  }, [selectedIds, activePanel, studyTab, verses, bookId, chapter, setCrossRefTarget])

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
      const verseId = selectedList[0]
      const v = verses.find((x) => x.id === verseId)
      const d = data.get(verseId)
      if (!v || !d) return
      const book = getBook(bookId)
      const firstText = d.texts.find((t) => t.translation_code === 'KJV') ?? d.texts[0]
      setAiTarget({
        verseId,
        bookId: v.book_id,
        chapter: v.chapter_num,
        verseNum: v.verse_num,
        reference: `${book?.name ?? 'John'} ${chapter}:${v.verse_num}`,
        text: firstText?.text_data ?? '',
      })
      setStudyTab('ai')
      setActivePanel('study')
    }
  }, [selectedList, verses, data, bookId, chapter, setStudyTab, setActivePanel, setAiTarget])

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
    <div className="relative flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" ref={topRef}>
        <div className="max-w-6xl ml-auto mr-4 py-3 space-y-0.5">
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
                hasNote={verseNotes.has(verse.id)}
                isDesktop={isDesktop}
                onToggleSelect={(e) => handleToggleSelect(verse.id, e.shiftKey)}
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
          isOnline={isOnline}
          allBookmarked={allBookmarked}
          onToggleBookmark={handleActionBookmark}
          onAddNote={handleActionNote}
          onCrossReferences={handleActionCrossRefs}
          onAiCommentary={handleActionAi}
          onClearSelection={handleClearSelection}
          onRangeSelect={handleRangeSelect}
          isRangeMode={rangeMode}
        />
      )}
    </div>
  )
}
