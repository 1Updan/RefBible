import { createContext, useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface CrossRefTarget {
  verseId: string
  bookId: number
  chapter: number
  reference: string
}

export type ActiveTab = 'crossrefs' | 'notes' | 'ai'

interface NavEntry {
  bookId: number
  chapter: number
}

interface NavigationContextValue {
  activePanel: 'none' | 'settings' | 'study' | 'bookmarks' | 'search'
  setActivePanel: (p: NavigationContextValue['activePanel']) => void
  crossRefTarget: CrossRefTarget | null
  openCrossReferences: (target: CrossRefTarget) => void
  studyTab: ActiveTab
  setStudyTab: (t: ActiveTab) => void
  bookId: number
  chapter: number
  navigateTo: (bookId: number, chapter: number, verseId?: string, pushHistory?: boolean) => void
  goBack: () => void
  canGoBack: boolean
  onNavigate: (cb: (bookId: number, chapter: number, verseId?: string) => void) => void
  verseScrollRef: React.MutableRefObject<Map<string, number>>
  noteVerseId: string | null
  openNote: (verseId: string) => void
  closeNote: () => void
}

export const NavigationContext = createContext<NavigationContextValue>(null!)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<NavigationContextValue['activePanel']>('none')
  const [crossRefTarget, setCrossRefTarget] = useState<CrossRefTarget | null>(null)
  const [studyTab, setStudyTab] = useState<ActiveTab>('crossrefs')
  const [[bookId, chapter], setNav] = useState<[number, number]>([43, 1])
  const [navStack, setNavStack] = useState<NavEntry[]>([])
  const [noteVerseId, setNoteVerseId] = useState<string | null>(null)
  const navigateListeners = useRef<((bookId: number, chapter: number, verseId?: string) => void)[]>([])
  const verseScrollRef = useRef<Map<string, number>>(new Map())

  const navigateTo = useCallback((b: number, c: number, verseId?: string, pushHistory?: boolean) => {
    if (pushHistory) {
      setNavStack((prev) => [...prev, { bookId, chapter }])
    }
    setNav([b, c])
    setActivePanel('none')
    setCrossRefTarget(null)
    setNoteVerseId(null)
    for (const cb of navigateListeners.current) {
      cb(b, c, verseId)
    }
  }, [bookId, chapter])

  const goBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev
      const entry = prev[prev.length - 1]
      const rest = prev.slice(0, -1)
      setNav([entry.bookId, entry.chapter])
      setActivePanel('none')
      setCrossRefTarget(null)
      setNoteVerseId(null)
      return rest
    })
  }, [])

  const canGoBack = navStack.length > 0

  const onNavigate = useCallback((cb: (bookId: number, chapter: number, verseId?: string) => void) => {
    navigateListeners.current.push(cb)
  }, [])

  const openCrossReferences = useCallback((target: CrossRefTarget) => {
    setCrossRefTarget(target)
    setStudyTab('crossrefs')
    setActivePanel('study')
  }, [])

  const openNote = useCallback((verseId: string) => {
    setNoteVerseId(verseId)
  }, [])

  const closeNote = useCallback(() => {
    setNoteVerseId(null)
  }, [])

  return (
    <NavigationContext.Provider
      value={{
        activePanel,
        setActivePanel,
        crossRefTarget,
        openCrossReferences,
        studyTab,
        setStudyTab,
        bookId,
        chapter,
        navigateTo,
        goBack,
        canGoBack,
        onNavigate,
        verseScrollRef,
        noteVerseId,
        openNote,
        closeNote,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}
