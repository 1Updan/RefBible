import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VerseRow } from './VerseRow'
import { VerseActionBar } from './VerseActionBar'
import { getCrossReferences, getTranslations, getVerses, getNotesForChapter, getInterlinearWords } from '@/lib/db'
import { useNavigation } from '@/hooks/useNavigation'
import { getBook } from '@/data/books'
import { parseOsisId } from '@/lib/utils'
import type { Verse, ContentText, CrossReference, InterlinearWord } from '@/types/db'

interface ReadingViewProps {
  bookId: number
  chapter: number
  visibleVersions: string[]
  fontSize: number
  bookmarks: Set<string>
  isDesktop: boolean
  isOnline: boolean
  interlinearEnabled: boolean
  interlinearLanguages: readonly ('hebrew' | 'greek')[]
  onToggleInterlinear: () => void
  onToggleBookmark: (verseId: string) => void
  onOpenNote: (verseId: string) => void
  onChapterText?: (text: string) => void
  onChapterVerses?: (verses: string[]) => void
  onSelectionVerse?: (verseNum: number | null) => void
  onSwipePrev?: () => void
  onSwipeNext?: () => void
}

export function ReadingView({
  bookId,
  chapter,
  visibleVersions,
  fontSize,
  bookmarks,
  isDesktop,
  isOnline,
  interlinearEnabled,
  interlinearLanguages,
  onToggleInterlinear,
  onToggleBookmark,
  onOpenNote,
  onChapterText,
  onChapterVerses,
  onSelectionVerse,
  onSwipePrev,
  onSwipeNext,
}: ReadingViewProps) {
  const { openCrossReferences, setCrossRefTarget, setStudyTab, setActivePanel, navigateTo, setAiTarget, pendingRange, setPendingRange, activePanel, studyTab, openWordStudy } = useNavigation()
  const pendingRef = useRef(pendingRange)
  useEffect(() => { pendingRef.current = pendingRange }, [pendingRange])
  const prevChapterRef = useRef({ bookId, chapter })
  const [verses, setVerses] = useState<Verse[]>([])
  const [data, setData] = useState<Map<string, { texts: ContentText[]; xrefs: CrossReference[]; interlinear: InterlinearWord[] }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null)
  const [rangeMode, setRangeMode] = useState(false)
  const [verseNotes, setVerseNotes] = useState<Set<string>>(new Set())
  const [highlightedVerseId, setHighlightedVerseId] = useState<string | null>(null)
  const highlightRef = useRef<string | null>(null)
  const historyHighlightedRef = useRef<Set<string>>(new Set())
  const topRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!onSwipePrev && !onSwipeNext) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 1.5) return
    if (dx > 0) onSwipePrev?.()
    else onSwipeNext?.()
  }, [onSwipePrev, onSwipeNext])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSelectionAnchor(null)
      setRangeMode(false)
      setHighlightedVerseId(null)
      const chapterChanged = bookId !== prevChapterRef.current.bookId || chapter !== prevChapterRef.current.chapter
      prevChapterRef.current = { bookId, chapter }
      if (chapterChanged) setLoading(true)
      const [vs, noteIds] = await Promise.all([
        getVerses(bookId, chapter),
        getNotesForChapter(bookId, chapter),
      ])
      if (cancelled) return
      setVerses(vs)
      setVerseNotes(noteIds)
      const map = new Map<string, { texts: ContentText[]; xrefs: CrossReference[]; interlinear: InterlinearWord[] }>()
      const batch = vs.map(async (v) => {
        const [texts, xrefs, interlinear] = await Promise.all([
          getTranslations(v.id),
          getCrossReferences(v.id),
          interlinearEnabled ? getInterlinearWords(v.id) : Promise.resolve([] as InterlinearWord[]),
        ])
        map.set(v.id, { texts, xrefs, interlinear })
      })
      await Promise.all(batch)
      if (!cancelled) {
        setData(map)
        if (onChapterText || onChapterVerses) {
          const verseTexts: string[] = []
          for (const v of vs) {
            const texts = map.get(v.id)?.texts ?? []
            for (const code of visibleVersions) {
              const t = texts.find((t) => t.translation_code === code)
              if (t) { verseTexts.push(t.text_data); break }
            }
          }
          onChapterText?.(verseTexts.join(' '))
          onChapterVerses?.(verseTexts)
        }
        const newSelected = new Set<string>()
        for (const v of vs) {
          if (historyHighlightedRef.current.has(v.id)) {
            newSelected.add(v.id)
          }
        }
        const range = pendingRef.current
        if (range) {
          for (const v of vs) {
            if (v.verse_num >= range.verseStart && v.verse_num <= range.verseEnd) {
              newSelected.add(v.id)
            }
          }
          setPendingRange(null)
        }
        setLoading(false)
        if (highlightRef.current && map.has(highlightRef.current)) {
          setHighlightedVerseId(highlightRef.current)
          newSelected.add(highlightRef.current)
          highlightRef.current = null
        }
        setSelectedIds(newSelected)
      }
    }
    load()
    return () => { cancelled = true }
  }, [bookId, chapter, interlinearEnabled, visibleVersions, onChapterText, onChapterVerses, setPendingRange])

  useEffect(() => {
    if (!onSelectionVerse) return
    if (selectedIds.size === 0) {
      onSelectionVerse(null)
      return
    }
    const first = verses.find((v) => selectedIds.has(v.id))
    onSelectionVerse(first ? first.verse_num : null)
  }, [selectedIds, verses, onSelectionVerse])

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

  useEffect(() => {
    if (!highlightedVerseId) return
    const el = document.getElementById(`verse-${highlightedVerseId}`)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    const timer = setTimeout(() => setHighlightedVerseId(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightedVerseId])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
    historyHighlightedRef.current = new Set()
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
    historyHighlightedRef.current.add(targetId)
    const parsed = parseOsisId(targetId)
    if (!parsed) return
    if (parsed.bookId === bookId && parsed.chapter === chapter) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.add(targetId)
        return next
      })
      setHighlightedVerseId(targetId)
      const el = document.getElementById(`verse-${targetId}`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    } else {
      highlightRef.current = targetId
      navigateTo(parsed.bookId, parsed.chapter, targetId, true)
    }
  }, [navigateTo, bookId, chapter])

  const handleSelectWord = useCallback((word: InterlinearWord, verseId: string, reference: string) => {
    openWordStudy({ word, verseId, reference })
  }, [openWordStudy])

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
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y" ref={topRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="max-w-6xl ml-auto mr-4 py-3 space-y-0.5">
          {verses.map((verse) => {
            const d = data.get(verse.id)
            return (
              <VerseRow
                key={verse.id}
                verse={verse}
                translations={d?.texts ?? []}
                crossReferences={d?.xrefs ?? []}
                interlinearWords={d?.interlinear}
                visibleVersions={visibleVersions}
                fontSize={fontSize}
                isSelected={selectedIds.has(verse.id)}
                isBookmarked={bookmarks.has(verse.id)}
                hasNote={verseNotes.has(verse.id)}
                interlinearEnabled={interlinearEnabled}
                interlinearLanguages={interlinearLanguages}
                isHighlighted={highlightedVerseId === verse.id}
                onToggleSelect={(e) => handleToggleSelect(verse.id, e.shiftKey)}
                onNavigateToRef={handleNavigateToRef}
                onOpenCrossRefs={handleOpenCrossRefs}
                onSelectWord={handleSelectWord}
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
          interlinearEnabled={interlinearEnabled}
          onToggleInterlinear={onToggleInterlinear}
        />
      )}
    </div>
  )
}
