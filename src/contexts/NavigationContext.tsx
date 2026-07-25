import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NavigationContext } from './navigation'
import type { NavigationContextValue, CrossRefTarget, ActiveTab, AiTarget, WordTarget } from './navigation'

type PanelToggleFn = (panel: 'bookmarks' | 'ai' | 'settings' | 'study' | 'search' | 'crossrefs') => void

interface NavEntry {
  bookId: number
  chapter: number
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<NavigationContextValue['activePanel']>('none')
  const [crossRefTarget, setCrossRefTarget] = useState<CrossRefTarget | null>(null)
  const [aiTarget, setAiTarget] = useState<AiTarget | null>(null)
  const [wordTarget, setWordTarget] = useState<WordTarget | null>(null)
  const [studyTab, setStudyTab] = useState<ActiveTab>('crossrefs')
  const [[bookId, chapter], setNav] = useState<[number, number]>(() => {
    // Restore last position from localStorage so the app opens where
    // the user left off, not always at John 1.
    try {
      const saved = localStorage.getItem('refbible-last-pos')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 2) {
          return [Number(parsed[0]) || 43, Number(parsed[1]) || 1]
        }
      }
    } catch { /* ignore */ }
    return [43, 1]
  })
  const [navStack, setNavStack] = useState<NavEntry[]>([])
  const [noteVerseId, setNoteVerseId] = useState<string | null>(null)
  const [pendingRange, setPendingRange] = useState<{ verseStart: number; verseEnd: number } | null>(null)
  const navigateListeners = useRef<((bookId: number, chapter: number, verseId?: string) => void)[]>([])
  const verseScrollRef = useRef<Map<string, number>>(new Map())
  const activePanelRef = useRef<NavigationContextValue['activePanel']>('none')

  useEffect(() => {
    activePanelRef.current = activePanel
  }, [activePanel])

  // Persist last position so app restores on next launch
  useEffect(() => {
    try {
      localStorage.setItem('refbible-last-pos', JSON.stringify([bookId, chapter]))
    } catch { /* ignore */ }
  }, [bookId, chapter])

  // Placeholder — overridden in App.tsx with the real routing logic
  const handlePanelToggle: PanelToggleFn = useCallback(() => {}, [])

  const navigateTo = useCallback((b: number, c: number, verseId?: string, pushHistory?: boolean) => {
    if (pushHistory) {
      // Push the CURRENT location (where we're leaving from) so goBack
      // returns here.  The destination (b, c) is where we're going next.
      setNavStack((prev) => [...prev, { bookId: bookId, chapter: chapter }])
    }
    setNav([b, c])
    setActivePanel('none')
    setCrossRefTarget(null)
    setAiTarget(null)
    setNoteVerseId(null)
    for (const cb of navigateListeners.current) {
      cb(b, c, verseId)
    }
  }, [bookId, chapter])

  const goBack = useCallback(() => {
    // If a panel is open, close it first without consuming history
    if (activePanelRef.current && activePanelRef.current !== 'none') {
      setActivePanel('none')
      return
    }
    setNavStack((prev) => {
      if (prev.length === 0) return prev
      const entry = prev[prev.length - 1]
      const rest = prev.slice(0, -1)
      setNav([entry.bookId, entry.chapter])
      setActivePanel('none')
      setCrossRefTarget(null)
      setAiTarget(null)
      setNoteVerseId(null)
      return rest
    })
  }, [])

  const canGoBack = navStack.length > 0

  const onNavigate = useCallback((cb: (bookId: number, chapter: number, verseId?: string) => void) => {
    navigateListeners.current.push(cb)
  }, [])

  const setCrossRefTargetDirect = useCallback((target: CrossRefTarget | null) => {
    setCrossRefTarget(target)
  }, [])

  const openCrossReferences = useCallback((target: CrossRefTarget) => {
    setCrossRefTarget(target)
    setStudyTab('crossrefs')
    setActivePanel('study')
  }, [])

  const openWordStudy = useCallback((target: WordTarget) => {
    setWordTarget(target)
    setStudyTab('word')
    setActivePanel('study')
  }, [])

  const openNote = useCallback((verseId: string) => {
    setNoteVerseId(verseId)
  }, [])

  const closeNote = useCallback(() => {
    setNoteVerseId(null)
  }, [])

  const openAi = useCallback((target: AiTarget) => {
    setAiTarget(target)
    setStudyTab('ai')
    setActivePanel('study')
  }, [])

  const openBookmarks = useCallback(() => {
    setActivePanel('bookmarks')
  }, [])

  const openSettings = useCallback(() => {
    setActivePanel('settings')
  }, [])

  const openSearch = useCallback(() => {
    setActivePanel('search')
  }, [])

  const closePanel = useCallback(() => {
    setActivePanel('none')
  }, [])

  const value: NavigationContextValue = {
    activePanel,
    setActivePanel,
    crossRefTarget,
    setCrossRefTarget: setCrossRefTargetDirect,
    aiTarget,
    setAiTarget,
    wordTarget,
    setWordTarget,
    studyTab,
    setStudyTab,
    bookId,
    chapter,
    navigateTo,
    goBack,
    canGoBack,
    onNavigate,
    pendingRange,
    setPendingRange,
    noteVerseId,
    setNoteVerseId,
    openNote,
    closeNote,
    openCrossReferences,
    openWordStudy,
    openAi,
    openBookmarks,
    openSettings,
    openSearch,
    closePanel,
    handlePanelToggle,
    verseScrollRef,
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}