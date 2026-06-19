import { createContext } from 'react'

export interface CrossRefTarget {
  verseId: string
  bookId: number
  chapter: number
  reference: string
}

export interface AiTarget {
  verseId: string
  bookId: number
  chapter: number
  verseNum: number
  reference: string
  text: string
}

export type ActiveTab = 'crossrefs' | 'notes' | 'ai'

export interface NavigationContextValue {
  activePanel: 'none' | 'settings' | 'study' | 'bookmarks' | 'search'
  setActivePanel: (p: NavigationContextValue['activePanel']) => void
  crossRefTarget: CrossRefTarget | null
  setCrossRefTarget: (target: CrossRefTarget | null) => void
  openCrossReferences: (target: CrossRefTarget) => void
  aiTarget: AiTarget | null
  setAiTarget: (target: AiTarget | null) => void
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
  pendingRange: { verseStart: number; verseEnd: number } | null
  setPendingRange: (range: { verseStart: number; verseEnd: number } | null) => void
}

export const NavigationContext = createContext<NavigationContextValue>(null!)
