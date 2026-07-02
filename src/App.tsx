import { useCallback, useEffect, useRef, useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { useTheme } from './hooks/useTheme'
import { useReadingPreferences } from './hooks/useReadingPreferences'
import { NavigationProvider } from './contexts/NavigationContext'
import { useNavigation } from './hooks/useNavigation'
import { ReadingView } from './components/reading/ReadingView'
import { BookChapterNav } from './components/layout/BookChapterNav'
import { ChapterHeader } from './components/layout/ChapterHeader'
import { MobileTabBar } from './components/layout/MobileTabBar'
import { DesktopShell, MobileShell } from './components/layout/AppShell'

import { StudyPanel } from './components/panels/StudyPanel'
import { SettingsPanel } from './components/panels/SettingsPanel'
import { BookmarksPanel } from './components/panels/BookmarksPanel'
import { SearchPanel } from './components/panels/SearchPanel'
import { BottomSheet } from './components/sheets/BottomSheet'

import { ensureSeeded, saveBookmark, removeBookmark, getInstalledTranslations, saveNote, getNotes, getVerses, getHighlightsForChapter, toggleHighlight, removeHighlight } from './lib/db'
import { getBook, BOOKS } from '@/data/books'
import type { Verse } from '@/types/db'
import type { HighlightColorId } from './lib/highlights'
import { useNetworkState } from './hooks/useNetworkState'
import { useSpeech } from './hooks/useSpeech'
import { SpeechControlBar } from './components/reading/SpeechControlBar'
import { ChevronRight, ChevronDown, X } from 'lucide-react'
import { isPermissionGranted, requestPermission, sendNotification, onNotificationReceived } from '@tauri-apps/plugin-notification'
import { getTodaysVerse, shouldSendNotificationToday, markNotificationSent, getPendingVotdNavigation, clearPendingVotdNavigation, setPendingVotdNavigation } from './lib/verseOfTheDay'
import { parseOsisId } from './lib/utils'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

function AppContent() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { theme, setTheme } = useTheme()
  const { prefs, update, toggleVersion, toggleInterlinear } = useReadingPreferences()
  const { activePanel, setActivePanel, bookId, chapter, navigateTo, noteVerseId, closeNote, openNote, studyTab, setStudyTab, goBack, canGoBack, setPendingRange } = useNavigation()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0)
  const [highlightColors, setHighlightColors] = useState<Map<string, string[]>>(new Map())
  const [activeHighlightColor, setActiveHighlightColor] = useState<HighlightColorId | null>(null)
  const [installedVersions, setInstalledVersions] = useState<string[]>(['KJV', 'NASB'])
  const [noteText, setNoteText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNav, setShowNav] = useState(false)
const [navBookId, setNavBookId] = useState(bookId)
const [navChapter, setNavChapter] = useState(chapter)
  const [votdNavigateTo, setVotdNavigateTo] = useState<string | undefined>(undefined)
  const isOnline = useNetworkState()
  const { speak, pause, stop, speaking, paused, resume, isActive, availableVoices, selectedVoiceUri, setSelectedVoiceUri } = useSpeech()
  const chapterTextRef = useRef<{ verses: string[] }>({ verses: [] })
  const [speakFromVerse, setSpeakFromVerse] = useState<number | null>(null)
  const [canSpeak, setCanSpeak] = useState(false)

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (!ready) return

    getInstalledTranslations().then((codes) => {
      setInstalledVersions(codes.length > 0 ? codes : ['KJV', 'NASB'])
    })

    const pendingOsis = getPendingVotdNavigation()
    if (pendingOsis) {
      const parsed = parseOsisId(pendingOsis)
      if (parsed) {
        navigateTo(parsed.bookId, parsed.chapter)
        queueMicrotask(() => setVotdNavigateTo(pendingOsis))
      }
      clearPendingVotdNavigation()
    }

    const unlistenPromise = onNotificationReceived(() => {
      const votd = getTodaysVerse()
      const parsed = parseOsisId(votd.osisId)
      if (parsed) {
        navigateTo(parsed.bookId, parsed.chapter)
        setVotdNavigateTo(votd.osisId)
      }
    })

    if (shouldSendNotificationToday()) {
      const votd = getTodaysVerse()
      setPendingVotdNavigation(votd.osisId)

      isPermissionGranted().then((granted) => {
        if (!granted) {
          return requestPermission().then((perm) => perm === 'granted')
        }
        return granted
      }).then((canNotify) => {
        if (canNotify) {
          sendNotification({
            title: `Verse of the Day — ${votd.reference}`,
            body: votd.text,
          })
          markNotificationSent()
        }
      })
    }

    return () => { unlistenPromise.then((l) => l.unregister()) }
  }, [ready, navigateTo])

  useEffect(() => {
    if (noteVerseId) {
      getNotes(noteVerseId).then((notes) => {
        setNoteText(notes.length > 0 ? notes[0].text_content : '')
      })
    }
    return () => { setNoteText('') }
  }, [noteVerseId])

  useEffect(() => {
    if (!ready) return
    getHighlightsForChapter(bookId, chapter).then(setHighlightColors)
  }, [ready, bookId, chapter])

  const handleHighlightVerse = useCallback(async (verseId: string, colorOverride?: HighlightColorId) => {
    const color = colorOverride ?? activeHighlightColor
    if (!color) return
    const colors = highlightColors.get(verseId) ?? []
    if (colors.includes(color)) {
      await removeHighlight(verseId, color)
      setHighlightColors((prev) => {
        const next = new Map(prev)
        const c = (next.get(verseId) ?? []).filter((x) => x !== color)
        if (c.length > 0) next.set(verseId, c)
        else next.delete(verseId)
        return next
      })
    } else {
      await toggleHighlight(verseId, color)
      setHighlightColors((prev) => {
        const next = new Map(prev)
        const c = next.get(verseId) ?? []
        next.set(verseId, [...c, color])
        return next
      })
    }
  }, [activeHighlightColor, highlightColors])

  const handleRemoveHighlight = useCallback(async (verseId: string) => {
    const colors = highlightColors.get(verseId)
    if (!colors || colors.length === 0) return
    for (const color of colors) {
      await removeHighlight(verseId, color)
    }
    setHighlightColors((prev) => {
      const next = new Map(prev)
      next.delete(verseId)
      return next
    })
  }, [highlightColors])

  const handleToggleBookmark = useCallback(async (verseId: string) => {
    if (bookmarks.has(verseId)) {
      await removeBookmark(verseId)
      setBookmarks((prev) => { const next = new Set(prev); next.delete(verseId); return next })
    } else {
      await saveBookmark(verseId)
      setBookmarks((prev) => { const next = new Set(prev); next.add(verseId); return next })
    }
    setBookmarkRefresh((n) => n + 1)
  }, [bookmarks])

  const handleOpenNote = useCallback((verseId: string) => {
    openNote(verseId)
    if (isDesktop) {
      setStudyTab('notes')
      setActivePanel('study')
    }
  }, [isDesktop, setActivePanel, setStudyTab, openNote])

  const handleSaveNote = useCallback(async () => {
    if (!noteVerseId) return
    const text = noteText.trim()
    if (!text) return
    try {
      await saveNote(noteVerseId, text)
    } catch (e) {
      console.error('Failed to save note:', e)
      return
    }
    setNoteText('')
    closeNote()
  }, [noteVerseId, noteText, closeNote])

  const handleNavigateBookmark = useCallback((_: string, bookId: number, chapter: number) => {
    navigateTo(bookId, chapter)
  }, [navigateTo])

  const handleSpeak = useCallback(() => {
    if (isActive()) {
      if (paused) {
        resume()
      } else {
        pause()
      }
      return
    }
    const verses = chapterTextRef.current.verses
    if (verses.length === 0) return
    const from = speakFromVerse ?? 1
    const text = verses.slice(from - 1).join(' ')
    speak(text)
  }, [isActive, paused, resume, pause, speak, speakFromVerse])

  const handleChapterText = useCallback((text: string) => {
    setCanSpeak(text.length > 0)
  }, [])

  const handleChapterVerses = useCallback((verses: string[]) => {
    chapterTextRef.current.verses = verses
    setSpeakFromVerse(null)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg gap-4">
        <p className="text-sm text-danger">Failed to initialize: {error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-4 max-w-[240px] text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold text-text-primary tracking-wide">RefBible</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-text-tertiary">Loading…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handlePanelToggle = (panel: 'bookmarks' | 'ai' | 'settings' | 'study' | 'search' | 'crossrefs') => {
    if (activePanel === panel) {
      setActivePanel('none')
    } else if (panel === 'ai') {
      if (activePanel === 'study' && studyTab === 'ai') {
        setActivePanel('none')
      } else {
        setStudyTab('ai')
        setActivePanel('study')
      }
    } else if (panel === 'crossrefs') {
      if (activePanel === 'study' && studyTab === 'crossrefs') {
        setActivePanel('none')
      } else {
        setStudyTab('crossrefs')
        setActivePanel('study')
      }
    } else {
      setActivePanel(panel)
    }
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    setActivePanel('search')
  }

  const currentBook = getBook(bookId)

  const offlineBanner = !isOnline ? (
    <div className="px-3 py-1.5 text-xs font-medium text-center bg-danger text-white shrink-0">
      You are offline — AI features are unavailable
    </div>
  ) : null

  const nav = (
    <BookChapterNav
      selectedBook={bookId}
      selectedChapter={chapter}
      onSelect={(b, c) => navigateTo(b, c)}
    />
  )

  const reading = (
    <>
      {offlineBanner}
      <ChapterHeader
        bookName={currentBook?.name ?? 'John'}
        chapter={chapter}
        totalChapters={currentBook?.chapters ?? 21}
        canGoBack={canGoBack}
        onGoBack={goBack}
        onPrevChapter={() => chapter > 1 && navigateTo(bookId, chapter - 1)}
        onNextChapter={() => chapter < (currentBook?.chapters ?? 21) && navigateTo(bookId, chapter + 1)}
        activePanel={activePanel}
        studyTab={studyTab}
        onTogglePanel={handlePanelToggle}
        isDesktop={isDesktop}
        visibleVersions={prefs.visibleVersions}
        installedVersions={installedVersions}
        onToggleVersion={toggleVersion}
        onSearch={handleSearch}
        onNavigateToRef={(b, c, range) => { setPendingRange(range ?? null); navigateTo(b, c) }}
        speaking={speaking}
        canSpeak={canSpeak}
        onSpeak={handleSpeak}
        onStop={stop}
        onOpenNav={!isDesktop ? () => { setNavBookId(bookId); setNavChapter(chapter); setShowNav(true) } : undefined}
      />
      <SpeechControlBar
        speaking={speaking}
        paused={paused}
        bookName={currentBook?.name ?? 'John'}
        chapter={chapter}
        onPlayPause={handleSpeak}
        onStop={stop}
        onPrevChapter={() => chapter > 1 && navigateTo(bookId, chapter - 1)}
        onNextChapter={() => chapter < (currentBook?.chapters ?? 21) && navigateTo(bookId, chapter + 1)}
        hasPrev={chapter > 1}
        hasNext={chapter < (currentBook?.chapters ?? 21)}
      />
      <ReadingView
        bookId={bookId}
        chapter={chapter}
        visibleVersions={prefs.visibleVersions}
        fontSize={prefs.fontSize}
        bookmarks={bookmarks}
        isDesktop={isDesktop}
        isOnline={isOnline}
        interlinearEnabled={prefs.interlinearEnabled}
        interlinearLanguages={prefs.interlinearLanguages}
        onToggleInterlinear={toggleInterlinear}
        onToggleBookmark={handleToggleBookmark}
        onOpenNote={handleOpenNote}
        onChapterText={handleChapterText}
        onChapterVerses={handleChapterVerses}
        onSelectionVerse={setSpeakFromVerse}
        onSwipePrev={!isDesktop ? () => chapter > 1 && navigateTo(bookId, chapter - 1) : undefined}
        onSwipeNext={!isDesktop ? () => chapter < (currentBook?.chapters ?? 21) && navigateTo(bookId, chapter + 1) : undefined}
        votdVerseId={votdNavigateTo}
        highlightColors={highlightColors}
        activeHighlightColor={activeHighlightColor}
        onHighlightVerse={handleHighlightVerse}
        onRemoveHighlight={handleRemoveHighlight}
        onHighlightColorChange={setActiveHighlightColor}
      />
    </>
  )

  const renderSidebar = () => {
    switch (activePanel) {
      case 'study':
        return <StudyPanel />
      case 'settings':
        return (
          <SettingsPanel
            theme={theme}
            onChangeTheme={setTheme}
            fontSize={prefs.fontSize}
            onChangeFontSize={(px) => update({ fontSize: px })}
            interlinearEnabled={prefs.interlinearEnabled}
            interlinearLanguages={prefs.interlinearLanguages}
            onToggleInterlinear={toggleInterlinear}
            onSetInterlinearLanguages={(langs) => update({ interlinearLanguages: langs })}
            voices={availableVoices}
            selectedVoiceUri={selectedVoiceUri}
            onChangeVoice={setSelectedVoiceUri}
            onVotdNavigate={() => {
              const votd = getTodaysVerse()
              navigateTo(votd.bookId, votd.chapter)
              setVotdNavigateTo(votd.osisId)
            }}
          />
        )
      case 'bookmarks':
        return (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">Saved</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <BookmarksPanel refreshKey={bookmarkRefresh} onNavigate={handleNavigateBookmark} />
            </div>
          </div>
        )
      case 'search':
        return <SearchPanel key={searchQuery} initialQuery={searchQuery} visibleVersions={prefs.visibleVersions} onNavigate={(b, c, range) => { setPendingRange(range ?? null); navigateTo(b, c) }} />
      default:
        return null
    }
  }

  const tabBar = (
    <MobileTabBar
      activePanel={activePanel}
      onTabChange={(tab) => {
        if (tab === 'read') setActivePanel('none')
        else if (tab === 'saved') setActivePanel('bookmarks')
        else if (tab === 'settings') setActivePanel('settings')
      }}
    />
  )

  const mobileSheet = activePanel && activePanel !== 'none' && (
    <BottomSheet
      open={!!activePanel}
      onClose={() => setActivePanel('none')}
      position="top"
      title={
        activePanel === 'study' ? 'Study' :
        activePanel === 'search' ? 'Search' :
        activePanel === 'bookmarks' ? 'Saved' :
        'Settings'
      }
    >
      {activePanel === 'study' && <StudyPanel />}
      {activePanel === 'search' && <SearchPanel key={searchQuery} initialQuery={searchQuery} visibleVersions={prefs.visibleVersions} onNavigate={(b, c, range) => { setPendingRange(range ?? null); navigateTo(b, c) }} />}
      {activePanel === 'bookmarks' && <BookmarksPanel refreshKey={bookmarkRefresh} onNavigate={handleNavigateBookmark} />}
      {activePanel === 'settings' && (
        <SettingsPanel
          theme={theme}
          onChangeTheme={setTheme}
          fontSize={prefs.fontSize}
          onChangeFontSize={(px) => update({ fontSize: px })}
          interlinearEnabled={prefs.interlinearEnabled}
          interlinearLanguages={prefs.interlinearLanguages}
          onToggleInterlinear={toggleInterlinear}
          onSetInterlinearLanguages={(langs) => update({ interlinearLanguages: langs })}
          voices={availableVoices}
          selectedVoiceUri={selectedVoiceUri}
          onChangeVoice={setSelectedVoiceUri}
          onVotdNavigate={() => {
            const votd = getTodaysVerse()
            navigateTo(votd.bookId, votd.chapter)
            setVotdNavigateTo(votd.osisId)
          }}
        />
      )}
    </BottomSheet>
  )

  const noteSheet = noteVerseId && (
    <BottomSheet open={!!noteVerseId} onClose={closeNote} title="Add Note" position="top">
      <div className="space-y-3">
        <p className="text-xs text-text-secondary font-mono">{noteVerseId}</p>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Write your note…"
          rows={5}
          className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all duration-150"
        />
        <button
          type="button"
          onClick={handleSaveNote}
          className="w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover active:bg-accent-hover transition-all duration-150 cursor-pointer touch-manipulation"
        >
          Save Note
        </button>
      </div>
    </BottomSheet>
  )

  if (isDesktop) {
    return (
      <div className="h-[100dvh] flex flex-col bg-bg">
        <DesktopShell
          nav={nav}
          reading={reading}
          sidebar={renderSidebar()}
          onCloseSidebar={() => setActivePanel('none')}
        />
      </div>
    )
  }

  return (
    <>
      <MobileShell
        reading={reading}
        tabBar={tabBar}
      />
      {mobileSheet}
      {noteSheet}
      <NavBottomSheet
        open={showNav}
        onClose={() => setShowNav(false)}
        navBookId={navBookId}
        navChapter={navChapter}
        onSelectBook={(id) => { setNavBookId(id); setNavChapter(1) }}
        onSelectChapter={(ch) => setNavChapter(ch)}
        onSelectVerse={(b, c) => { navigateTo(b, c); setShowNav(false) }}
      />
    </>
  )
}

function NavBottomSheet({
  open, onClose, navBookId, navChapter, onSelectBook, onSelectChapter, onSelectVerse,
}: {
  open: boolean; onClose: () => void
  navBookId: number; navChapter: number
  onSelectBook: (id: number) => void; onSelectChapter: (ch: number) => void
  onSelectVerse: (bookId: number, chapter: number, verseNum: number) => void
}) {
  const currentBook = BOOKS.find((b) => b.id === navBookId)
  const [navVerses, setNavVerses] = useState<Verse[]>([])
  const [otExpanded, setOtExpanded] = useState(() => localStorage.getItem('refbible:nav-ot') !== 'false')
  const [ntExpanded, setNtExpanded] = useState(() => localStorage.getItem('refbible:nav-nt') !== 'false')

  useEffect(() => {
    if (open && currentBook) {
      getVerses(navBookId, navChapter).then(setNavVerses)
    }
  }, [open, navBookId, navChapter, currentBook])

  const OT_BOOKS = BOOKS.filter((b) => b.testament === 'OT')
  const NT_BOOKS = BOOKS.filter((b) => b.testament === 'NT')

  return (
    <BottomSheet open={open} onClose={onClose} title="" position="bottom">
      <div className="flex h-[50vh] overflow-hidden -mx-4 -mb-4 -mt-4">
        <div className="w-[44%] min-w-0 shrink-0 border-r border-border flex flex-col">
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/50">
            <div>
              <button
                type="button"
                onClick={() => { setOtExpanded((p) => { const n = !p; localStorage.setItem('refbible:nav-ot', String(n)); return n }) }}
                className="w-full flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest text-accent border-b border-border bg-surface-hover/30 cursor-pointer"
              >
                {otExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Old Testament
              </button>
              {otExpanded && OT_BOOKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBook(b.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-all duration-100 cursor-pointer border-l-2 ${
                    navBookId === b.id
                      ? 'bg-accent/[0.12] text-accent font-semibold border-l-accent'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border-l-transparent hover:border-l-border'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <div>
              <button
                type="button"
                onClick={() => { setNtExpanded((p) => { const n = !p; localStorage.setItem('refbible:nav-nt', String(n)); return n }) }}
                className="w-full flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest text-accent border-b border-border bg-surface-hover/30 cursor-pointer"
              >
                {ntExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                New Testament
              </button>
              {ntExpanded && NT_BOOKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBook(b.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-all duration-100 cursor-pointer border-l-2 ${
                    navBookId === b.id
                      ? 'bg-accent/[0.12] text-accent font-semibold border-l-accent'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border-l-transparent hover:border-l-border'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-[28%] min-w-0 shrink-0 border-r border-border flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 bg-accent/[0.02]">
            {currentBook && (
              <div className="space-y-0.5">
                  {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => onSelectChapter(ch)}
                      className={`w-full text-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
                        navChapter === ch
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-text-secondary border border-transparent hover:border-accent/15 hover:bg-accent/[0.04] hover:text-accent active:bg-accent/8'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
            )}
          </div>
        </div>

        <div className="w-[28%] min-w-0 shrink-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 bg-accent/[0.02]">
            {currentBook && (
              <div className="space-y-0.5">
                  {navVerses.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectVerse(v.book_id, v.chapter_num, v.verse_num)}
                      className="w-full text-center px-2.5 py-2 rounded-md text-xs text-text-secondary border border-transparent hover:border-accent/15 hover:bg-accent/[0.04] hover:text-accent active:bg-accent/8 transition-all duration-100 cursor-pointer"
                    >
                      {v.verse_num}
                    </button>
                  ))}
                </div>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </ThemeProvider>
  )
}
