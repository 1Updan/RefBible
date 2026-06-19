import { useCallback, useEffect, useState } from 'react'
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
import { ensureSeeded, saveBookmark, removeBookmark, getInstalledTranslations, saveNote, getNotes } from './lib/db'
import { getBook } from '@/data/books'
import { useNetworkState } from './hooks/useNetworkState'

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
  const { prefs, update, toggleVersion } = useReadingPreferences()
  const { activePanel, setActivePanel, bookId, chapter, navigateTo, noteVerseId, closeNote, openNote, studyTab, setStudyTab, goBack, canGoBack, setPendingRange } = useNavigation()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0)
  const [installedVersions, setInstalledVersions] = useState<string[]>(['KJV', 'NASB'])
  const [noteText, setNoteText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const isOnline = useNetworkState()

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (ready) {
      getInstalledTranslations().then((codes) => {
        setInstalledVersions(codes.length > 0 ? codes : ['KJV', 'NASB'])
      })
    }
  }, [ready])

  useEffect(() => {
    if (noteVerseId) {
      getNotes(noteVerseId).then((notes) => {
        setNoteText(notes.length > 0 ? notes[0].text_content : '')
      })
    }
    return () => { setNoteText('') }
  }, [noteVerseId])

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
    if (noteVerseId && noteText.trim()) {
      await saveNote(noteVerseId, noteText.trim())
      closeNote()
    }
  }, [noteVerseId, noteText, closeNote])

  const handleNavigateBookmark = useCallback((_: string, bookId: number, chapter: number) => {
    navigateTo(bookId, chapter)
  }, [navigateTo])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-bg">
        <p className="text-sm text-danger">Failed to initialize: {error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-tertiary">Loading Scripture…</p>
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
      />
      <ReadingView
        bookId={bookId}
        chapter={chapter}
        visibleVersions={prefs.visibleVersions}
        fontSize={prefs.fontSize}
        bookmarks={bookmarks}
        isDesktop={isDesktop}
        isOnline={isOnline}
        onToggleBookmark={handleToggleBookmark}
        onOpenNote={handleOpenNote}
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
        else if (tab === 'search') setActivePanel('search')
        else if (tab === 'saved') setActivePanel('bookmarks')
        else if (tab === 'settings') setActivePanel('settings')
      }}
    />
  )

  const mobileSheet = activePanel && activePanel !== 'none' && (
    <BottomSheet
      open={!!activePanel}
      onClose={() => setActivePanel('none')}
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
        />
      )}
    </BottomSheet>
  )

  const noteSheet = noteVerseId && (
    <BottomSheet open={!!noteVerseId} onClose={closeNote} title="Add Note">
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
          className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150 cursor-pointer"
        >
          Save Note
        </button>
      </div>
    </BottomSheet>
  )

  if (isDesktop) {
    return (
      <DesktopShell
        nav={nav}
        reading={reading}
        sidebar={renderSidebar()}
        onCloseSidebar={() => setActivePanel('none')}
      />
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
    </>
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
