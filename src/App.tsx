import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTheme } from "./hooks/useTheme";
import { useReadingPreferences } from "./hooks/useReadingPreferences";
import { NavigationProvider } from "./contexts/NavigationContext";
import { useNavigation } from "./hooks/useNavigation";
import { ReadingView } from "./components/reading/ReadingView";
import { BookChapterNav } from "./components/layout/BookChapterNav";
import { ChapterHeader } from "./components/layout/ChapterHeader";
import { MobileTabBar } from "./components/layout/MobileTabBar";
import { DesktopShell } from "./components/layout/AppShell";

import { StudyPanel } from "./components/panels/StudyPanel";
import { SettingsPanel } from "./components/panels/SettingsPanel";
import { BookmarksPanel } from "./components/panels/BookmarksPanel";
import { SearchPanel } from "./components/panels/SearchPanel";
import { BottomSheet } from "./components/sheets/BottomSheet";

import {
  ensureSeeded,
  saveBookmark,
  removeBookmark,
  getInstalledTranslations,
  saveNote,
  getNotes,
  getHighlightsForChapter,
  toggleHighlight,
  removeHighlight,
} from "./lib/db";
import { getBook, BOOKS } from "@/data/books";
import type { HighlightColorId } from "./lib/highlights";
import { useNetworkState } from "./hooks/useNetworkState";
import { useSpeech } from "./hooks/useSpeech";
import { SpeechControlBar } from "./components/reading/SpeechControlBar";
import { BookOpen, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  onNotificationReceived,
} from "@tauri-apps/plugin-notification";
import {
  getTodaysVerse,
  shouldSendNotificationToday,
  markNotificationSent,
  getPendingVotdNavigation,
  clearPendingVotdNavigation,
  setPendingVotdNavigation,
} from "./lib/verseOfTheDay";
import { formatVerseId, parseOsisId } from "./lib/utils";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function AppContent() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { theme, setTheme } = useTheme();
  const { prefs, update, toggleVersion, toggleInterlinear } =
    useReadingPreferences();
  const {
    activePanel,
    setActivePanel,
    bookId,
    chapter,
    navigateTo,
    noteVerseId,
    closeNote,
    openNote,
    studyTab,
    setStudyTab,
    goBack,
    canGoBack,
    setPendingRange,
  } = useNavigation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0);
  const [highlightColors, setHighlightColors] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [activeHighlightColor, setActiveHighlightColor] =
    useState<HighlightColorId | null>(null);
  const [installedVersions, setInstalledVersions] = useState<string[]>([
    "KJV",
    "NASB",
  ]);
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNav, setShowNav] = useState(false);
  const [navBookId, setNavBookId] = useState(bookId);
  const [navChapter, setNavChapter] = useState(chapter);
  const [votdNavigateTo, setVotdNavigateTo] = useState<string | undefined>(
    undefined,
  );
  const [controlsHidden, setControlsHidden] = useState(false);
  const headerMeasureRef = useRef<HTMLDivElement>(null);
  const tabBarMeasureRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(48);
  const [tabBarHeight, setTabBarHeight] = useState(56);
  const isOnline = useNetworkState();
  const {
    speak,
    pause,
    stop,
    speaking,
    paused,
    resume,
    isActive,
    availableVoices,
    selectedVoiceUri,
    setSelectedVoiceUri,
  } = useSpeech();
  const chapterTextRef = useRef<{ verses: string[] }>({ verses: [] });
  const [speakFromVerse, setSpeakFromVerse] = useState<number | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    if (headerMeasureRef.current) {
      setHeaderHeight(headerMeasureRef.current.offsetHeight);
    }
    if (tabBarMeasureRef.current) {
      setTabBarHeight(tabBarMeasureRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, []);

  useEffect(() => {
    if (!ready) return;

    getInstalledTranslations().then((codes) => {
      setInstalledVersions(codes.length > 0 ? codes : ["KJV", "NASB"]);
    });

    const pendingOsis = getPendingVotdNavigation();
    if (pendingOsis) {
      const parsed = parseOsisId(pendingOsis);
      if (parsed) {
        navigateTo(parsed.bookId, parsed.chapter);
        queueMicrotask(() => setVotdNavigateTo(pendingOsis));
      }
      clearPendingVotdNavigation();
    }

    const unlistenPromise = onNotificationReceived(() => {
      const votd = getTodaysVerse();
      const parsed = parseOsisId(votd.osisId);
      if (parsed) {
        navigateTo(parsed.bookId, parsed.chapter);
        setVotdNavigateTo(votd.osisId);
      }
    });

    if (shouldSendNotificationToday()) {
      const votd = getTodaysVerse();
      setPendingVotdNavigation(votd.osisId);

      isPermissionGranted()
        .then((granted) => {
          if (!granted) {
            return requestPermission().then((perm) => perm === "granted");
          }
          return granted;
        })
        .then((canNotify) => {
          if (canNotify) {
            sendNotification({
              title: `Verse of the Day — ${votd.reference}`,
              body: votd.text,
            });
            markNotificationSent();
          }
        });
    }

    return () => {
      unlistenPromise.then((l) => l.unregister());
    };
  }, [ready, navigateTo]);

  useEffect(() => {
    if (noteVerseId) {
      getNotes(noteVerseId).then((notes) => {
        setNoteText(notes.length > 0 ? notes[0].text_content : "");
      });
    }
    return () => {
      setNoteText("");
    };
  }, [noteVerseId]);

  useEffect(() => {
    if (!ready) return;
    getHighlightsForChapter(bookId, chapter).then(setHighlightColors);
  }, [ready, bookId, chapter]);

  const handleHighlightVerse = useCallback(
    async (verseId: string, colorOverride?: HighlightColorId) => {
      const color = colorOverride ?? activeHighlightColor;
      if (!color) return;
      const colors = highlightColors.get(verseId) ?? [];
      if (colors.includes(color)) {
        await removeHighlight(verseId, color);
        setHighlightColors((prev) => {
          const next = new Map(prev);
          const c = (next.get(verseId) ?? []).filter((x) => x !== color);
          if (c.length > 0) next.set(verseId, c);
          else next.delete(verseId);
          return next;
        });
      } else {
        await toggleHighlight(verseId, color);
        setHighlightColors((prev) => {
          const next = new Map(prev);
          const c = next.get(verseId) ?? [];
          next.set(verseId, [...c, color]);
          return next;
        });
      }
    },
    [activeHighlightColor, highlightColors],
  );

  const handleRemoveHighlight = useCallback(
    async (verseId: string) => {
      const colors = highlightColors.get(verseId);
      if (!colors || colors.length === 0) return;
      for (const color of colors) {
        await removeHighlight(verseId, color);
      }
      setHighlightColors((prev) => {
        const next = new Map(prev);
        next.delete(verseId);
        return next;
      });
    },
    [highlightColors],
  );

  const handleToggleBookmark = useCallback(
    async (verseId: string) => {
      if (bookmarks.has(verseId)) {
        await removeBookmark(verseId);
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(verseId);
          return next;
        });
      } else {
        await saveBookmark(verseId);
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.add(verseId);
          return next;
        });
      }
      setBookmarkRefresh((n) => n + 1);
    },
    [bookmarks],
  );

  const handleOpenNote = useCallback(
    (verseId: string) => {
      openNote(verseId);
      if (isDesktop) {
        setStudyTab("notes");
        setActivePanel("study");
      }
    },
    [isDesktop, setActivePanel, setStudyTab, openNote],
  );

  const handleSaveNote = useCallback(async () => {
    if (!noteVerseId) return;
    const text = noteText.trim();
    if (!text) return;
    try {
      await saveNote(noteVerseId, text);
    } catch (e) {
      console.error("Failed to save note:", e);
      return;
    }
    setNoteText("");
    closeNote();
  }, [noteVerseId, noteText, closeNote]);

  const handleNavigateBookmark = useCallback(
    (_: string, bookId: number, chapter: number) => {
      navigateTo(bookId, chapter);
    },
    [navigateTo],
  );

  const handleSpeak = useCallback(() => {
    if (isActive()) {
      if (paused) {
        resume();
      } else {
        pause();
      }
      return;
    }
    const verses = chapterTextRef.current.verses;
    if (verses.length === 0) return;
    const from = speakFromVerse ?? 1;
    const text = verses.slice(from - 1).join(" ");
    speak(text);
  }, [isActive, paused, resume, pause, speak, speakFromVerse]);

  const handleChapterText = useCallback((text: string) => {
    setCanSpeak(text.length > 0);
  }, []);

  const handleChapterVerses = useCallback((verses: string[]) => {
    chapterTextRef.current.verses = verses;
    setSpeakFromVerse(null);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg gap-4">
        <p className="text-sm text-danger">Failed to initialize: {error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-6 max-w-[280px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <BookOpen size={32} className="text-accent" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              RefBible
            </h1>
            <p className="text-sm text-text-secondary font-medium">
              Bible Study Tool
            </p>
          </div>
          <div className="w-12 h-px bg-border-subtle" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-tertiary">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePanelToggle = (
    panel: "bookmarks" | "ai" | "settings" | "study" | "search" | "crossrefs",
  ) => {
    if (activePanel === panel) {
      setActivePanel("none");
    } else if (panel === "ai") {
      if (activePanel === "study" && studyTab === "ai") {
        setActivePanel("none");
      } else {
        setStudyTab("ai");
        setActivePanel("study");
      }
    } else if (panel === "crossrefs") {
      if (activePanel === "study" && studyTab === "crossrefs") {
        setActivePanel("none");
      } else {
        setStudyTab("crossrefs");
        setActivePanel("study");
      }
    } else {
      setActivePanel(panel);
    }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setActivePanel("search");
  };

  const currentBook = getBook(bookId);

  const nav = (
    <BookChapterNav
      selectedBook={bookId}
      selectedChapter={chapter}
      onSelect={(b, c) => navigateTo(b, c)}
    />
  );

  const chapterHeader = (
    <ChapterHeader
      bookName={currentBook?.name ?? "John"}
      chapter={chapter}
      totalChapters={currentBook?.chapters ?? 21}
      canGoBack={canGoBack}
      onGoBack={goBack}
      onPrevChapter={() => chapter > 1 && navigateTo(bookId, chapter - 1)}
      onNextChapter={() =>
        chapter < (currentBook?.chapters ?? 21) &&
        navigateTo(bookId, chapter + 1)
      }
      activePanel={activePanel}
      studyTab={studyTab}
      onTogglePanel={handlePanelToggle}
      isDesktop={isDesktop}
      visibleVersions={prefs.visibleVersions}
      installedVersions={installedVersions}
      onToggleVersion={toggleVersion}
      onSearch={handleSearch}
      onNavigateToRef={(b, c, range) => {
        setPendingRange(range ?? null);
        navigateTo(b, c);
      }}
      speaking={speaking}
      canSpeak={canSpeak}
      onSpeak={handleSpeak}
      onStop={stop}
      interlinearEnabled={prefs.interlinearEnabled}
      onToggleInterlinear={toggleInterlinear}
      onOpenNav={
        !isDesktop
          ? () => {
              setNavBookId(bookId);
              setNavChapter(chapter);
              setShowNav(true);
            }
          : undefined
      }
    />
  );

  const speechBar = (
    <SpeechControlBar
      speaking={speaking}
      paused={paused}
      bookName={currentBook?.name ?? "John"}
      chapter={chapter}
      onPlayPause={handleSpeak}
      onStop={stop}
      onPrevChapter={() => chapter > 1 && navigateTo(bookId, chapter - 1)}
      onNextChapter={() =>
        chapter < (currentBook?.chapters ?? 21) &&
        navigateTo(bookId, chapter + 1)
      }
      hasPrev={chapter > 1}
      hasNext={chapter < (currentBook?.chapters ?? 21)}
    />
  );

  const readingView = (
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
      onSwipePrev={
        !isDesktop
          ? () => chapter > 1 && navigateTo(bookId, chapter - 1)
          : undefined
      }
      onSwipeNext={
        !isDesktop
          ? () =>
              chapter < (currentBook?.chapters ?? 21) &&
              navigateTo(bookId, chapter + 1)
          : undefined
      }
      onControlsVisibleChange={!isDesktop ? setControlsHidden : undefined}
      votdVerseId={votdNavigateTo}
      highlightColors={highlightColors}
      activeHighlightColor={activeHighlightColor}
      onHighlightVerse={handleHighlightVerse}
      onRemoveHighlight={handleRemoveHighlight}
      onHighlightColorChange={setActiveHighlightColor}
    />
  );

  const reading = (
    <>
      {chapterHeader}
      {speechBar}
      {readingView}
    </>
  );

  const renderSidebar = () => {
    switch (activePanel) {
      case "study":
        return <StudyPanel />;
      case "settings":
        return (
          <SettingsPanel
            theme={theme}
            onChangeTheme={setTheme}
            fontSize={prefs.fontSize}
            onChangeFontSize={(px) => update({ fontSize: px })}
            interlinearEnabled={prefs.interlinearEnabled}
            interlinearLanguages={prefs.interlinearLanguages}
            onToggleInterlinear={toggleInterlinear}
            onSetInterlinearLanguages={(langs) =>
              update({ interlinearLanguages: langs })
            }
            voices={availableVoices}
            selectedVoiceUri={selectedVoiceUri}
            onChangeVoice={setSelectedVoiceUri}
            onVotdNavigate={() => {
              const votd = getTodaysVerse();
              navigateTo(votd.bookId, votd.chapter);
              setVotdNavigateTo(votd.osisId);
            }}
          />
        );
      case "bookmarks":
        return (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">Saved</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <BookmarksPanel
                refreshKey={bookmarkRefresh}
                onNavigate={handleNavigateBookmark}
              />
            </div>
          </div>
        );
      case "search":
        return (
          <SearchPanel
            key={searchQuery}
            initialQuery={searchQuery}
            visibleVersions={prefs.visibleVersions}
            onNavigate={(b, c, range) => {
              setPendingRange(range ?? null);
              navigateTo(b, c);
            }}
          />
        );
      default:
        return null;
    }
  };

  const tabBar = (
    <MobileTabBar
      activePanel={activePanel}
      onTabChange={(tab) => {
        if (tab === "read") setActivePanel("none");
        else if (tab === "saved") setActivePanel("bookmarks");
        else if (tab === "settings") setActivePanel("settings");
      }}
    />
  );

  const mobileSheet = activePanel && activePanel !== "none" && (
    <BottomSheet
      open={!!activePanel}
      onClose={() => setActivePanel("none")}
      position="bottom"
      title={
        activePanel === "study"
          ? "Study"
          : activePanel === "search"
            ? "Search"
            : activePanel === "bookmarks"
              ? "Saved"
              : "Settings"
      }
    >
      {activePanel === "study" && <StudyPanel />}
      {activePanel === "search" && (
        <SearchPanel
          key={searchQuery}
          initialQuery={searchQuery}
          visibleVersions={prefs.visibleVersions}
          onNavigate={(b, c, range) => {
            setPendingRange(range ?? null);
            navigateTo(b, c);
          }}
        />
      )}
      {activePanel === "bookmarks" && (
        <BookmarksPanel
          refreshKey={bookmarkRefresh}
          onNavigate={handleNavigateBookmark}
        />
      )}
      {activePanel === "settings" && (
        <SettingsPanel
          theme={theme}
          onChangeTheme={setTheme}
          fontSize={prefs.fontSize}
          onChangeFontSize={(px) => update({ fontSize: px })}
          interlinearEnabled={prefs.interlinearEnabled}
          interlinearLanguages={prefs.interlinearLanguages}
          onToggleInterlinear={toggleInterlinear}
          onSetInterlinearLanguages={(langs) =>
            update({ interlinearLanguages: langs })
          }
          voices={availableVoices}
          selectedVoiceUri={selectedVoiceUri}
          onChangeVoice={setSelectedVoiceUri}
          onVotdNavigate={() => {
            const votd = getTodaysVerse();
            navigateTo(votd.bookId, votd.chapter);
            setVotdNavigateTo(votd.osisId);
          }}
        />
      )}
    </BottomSheet>
  );

  const noteSheet = noteVerseId && (
    <BottomSheet
      open={!!noteVerseId}
      onClose={closeNote}
      title="Add Note"
      position="bottom"
    >
      <div className="space-y-3">
        <p className="text-xs text-text-secondary">
          {formatVerseId(noteVerseId)}
        </p>
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
  );

  if (isDesktop) {
    return (
      <div className="h-[100dvh] flex flex-col bg-bg">
        <DesktopShell
          nav={nav}
          reading={reading}
          sidebar={renderSidebar()}
          onCloseSidebar={() => setActivePanel("none")}
        />
      </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-bg">
        <div
          ref={headerMeasureRef}
          className="shrink-0 transition-all duration-300 ease-out"
          style={{
            maxHeight: controlsHidden ? 0 : headerHeight,
            overflow: controlsHidden ? "hidden" : "visible",
          }}
        >
          {chapterHeader}
        </div>
        {speechBar}
        <main className="flex-1 min-h-0 flex flex-col bg-bg">
          {readingView}
        </main>
        <div
          ref={tabBarMeasureRef}
          className="shrink-0 overflow-hidden transition-all duration-300 ease-out"
          style={{ maxHeight: controlsHidden ? 0 : tabBarHeight }}
        >
          {tabBar}
        </div>
        {currentBook && (
          <>
            {chapter > 1 && (
              <button
                type="button"
                onClick={() => navigateTo(bookId, chapter - 1)}
                className="fixed bottom-[64px] left-4 z-30 flex items-center justify-center w-11 h-11 rounded-full text-text-tertiary hover:text-text-primary bg-black/25 dark:bg-white/20 ring-1 ring-black/15 dark:ring-white/10 active:bg-black/45 dark:active:bg-white/35 transition-all duration-150 cursor-pointer"
                aria-label="Previous chapter"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {chapter < (currentBook?.chapters ?? 21) && (
              <button
                type="button"
                onClick={() => navigateTo(bookId, chapter + 1)}
                className="fixed bottom-[64px] right-4 z-30 flex items-center justify-center w-11 h-11 rounded-full text-text-tertiary hover:text-text-primary bg-black/25 dark:bg-white/20 ring-1 ring-black/15 dark:ring-white/10 active:bg-black/45 dark:active:bg-white/35 transition-all duration-150 cursor-pointer"
                aria-label="Next chapter"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </>
        )}
      </div>
      {mobileSheet}
      {noteSheet}
      <NavBottomSheet
        open={showNav}
        onClose={() => setShowNav(false)}
        navBookId={navBookId}
        navChapter={navChapter}
        onSelectBook={(id) => {
          setNavBookId(id);
          setNavChapter(1);
        }}
        onSelectChapter={(ch) => setNavChapter(ch)}
        onSelectVerse={(b, c) => {
          navigateTo(b, c);
          setShowNav(false);
        }}
      />
    </>
  );
}

function NavBottomSheet({
  open,
  onClose,
  navBookId,
  navChapter,
  onSelectBook,
  onSelectChapter,
  onSelectVerse,
}: {
  open: boolean;
  onClose: () => void;
  navBookId: number;
  navChapter: number;
  onSelectBook: (id: number) => void;
  onSelectChapter: (ch: number) => void;
  onSelectVerse: (bookId: number, chapter: number, verseNum: number) => void;
}) {
  void onSelectChapter;
  const currentBook = BOOKS.find((b) => b.id === navBookId);
  const [otExpanded, setOtExpanded] = useState(
    () => localStorage.getItem("refbible:nav-ot") !== "false",
  );
  const [ntExpanded, setNtExpanded] = useState(
    () => localStorage.getItem("refbible:nav-nt") !== "false",
  );

  const OT_BOOKS = BOOKS.filter((b) => b.testament === "OT");
  const NT_BOOKS = BOOKS.filter((b) => b.testament === "NT");

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={currentBook?.name ?? "Bible"}
      position="bottom"
    >
      <div className="flex h-[55vh] overflow-hidden -mx-4 -mb-4 -mt-3">
        <div className="w-[40%] min-w-0 shrink-0 border-r border-border flex flex-col">
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/50">
            <div>
              <button
                type="button"
                onClick={() => {
                  setOtExpanded((p) => {
                    const n = !p;
                    localStorage.setItem("refbible:nav-ot", String(n));
                    return n;
                  });
                }}
                className="w-full flex items-center gap-1.5 px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-accent border-b border-border bg-surface-hover/30 sticky top-0 cursor-pointer"
              >
                {otExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                OT
              </button>
              {otExpanded &&
                OT_BOOKS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectBook(b.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-all duration-100 cursor-pointer border-l-2 min-h-[44px] ${
                      navBookId === b.id
                        ? "bg-accent/[0.12] text-accent font-semibold border-l-accent"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary border-l-transparent hover:border-l-border"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setNtExpanded((p) => {
                    const n = !p;
                    localStorage.setItem("refbible:nav-nt", String(n));
                    return n;
                  });
                }}
                className="w-full flex items-center gap-1.5 px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-accent border-b border-border bg-surface-hover/30 sticky top-0 cursor-pointer"
              >
                {ntExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                NT
              </button>
              {ntExpanded &&
                NT_BOOKS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectBook(b.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-all duration-100 cursor-pointer border-l-2 min-h-[44px] ${
                      navBookId === b.id
                        ? "bg-accent/[0.12] text-accent font-semibold border-l-accent"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary border-l-transparent hover:border-l-border"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="shrink-0 px-3 py-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider border-b border-border">
            Chapter
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {currentBook && (
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from(
                  { length: currentBook.chapters },
                  (_, i) => i + 1,
                ).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => onSelectVerse(currentBook.id, ch, 1)}
                    className={`flex items-center justify-center min-h-[44px] text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer touch-manipulation ${
                      navChapter === ch
                        ? "bg-accent text-white shadow-sm"
                        : "bg-surface-hover/50 text-text-secondary border border-border hover:border-accent/30 hover:text-accent active:bg-accent/8"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </ThemeProvider>
  );
}
