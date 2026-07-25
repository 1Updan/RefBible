import { createContext } from 'react'
import type { InterlinearWord } from '@/types/db'

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

export type ActiveTab = 'crossrefs' | 'notes' | 'ai' | 'word'

export interface WordTarget {
  word: InterlinearWord
  verseId: string
  reference: string
}

export type PanelType = 'none' | 'settings' | 'study' | 'bookmarks' | 'search' | 'ai';

export interface NavigationContextValue {
  activePanel: PanelType
  setActivePanel: (p: PanelType) => void
  crossRefTarget: CrossRefTarget | null
  setCrossRefTarget: (target: CrossRefTarget | null) => void
  openCrossReferences: (target: CrossRefTarget) => void
  aiTarget: AiTarget | null
  setAiTarget: (target: AiTarget | null) => void
  wordTarget: WordTarget | null
  setWordTarget: (target: WordTarget | null) => void
  openWordStudy: (target: WordTarget) => void
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
  setNoteVerseId: (id: string | null) => void
  openNote: (verseId: string) => void
  closeNote: () => void
  pendingRange: { verseStart: number; verseEnd: number } | null
  setPendingRange: (range: { verseStart: number; verseEnd: number } | null) => void
  openAi: (target: AiTarget) => void
  openBookmarks: () => void
  openSettings: () => void
  openSearch: () => void
  closePanel: () => void
  handlePanelToggle: (panel: 'bookmarks' | 'ai' | 'settings' | 'study' | 'search' | 'crossrefs') => void
}

export const NavigationContext = createContext<NavigationContextValue>(null!)