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
import type { AiTarget } from "./contexts/navigation";

import { AiVaultProvider } from "./contexts/AiVaultContext";
import { AiChatPanel } from "./components/panels/AiChatPanel";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  isPermissionGranted,
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
import { toDbOsis } from "./data/osis";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

/// Update Distribution System ///

// Update metadata endpoint configuration
const UPDATE_METADATA_ENDPOINT = 'https://1updan.github.io/RefBible/update-metadata.json';
const CHECK_FOR_UPDATE_KEY = 'refbible:update-check';
// Fallback when the Tauri app-version API is unavailable (e.g. web preview).
// MUST match the `version` field in src-tauri/tauri.conf.json.
const APP_VERSION = '0.1.0';

interface UpdateMetadata {
  current_version: string;
  latest_version: string;
  changelog: string;
  android_store_url: string;
  ios_store_url: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  updateMetadata: UpdateMetadata | null;
  showModal: boolean;
  checked: boolean;
  dismissUpdate: () => void;
}

function useUpdateCheck(): UpdateCheckResult {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateMetadata, setUpdateMetadata] = useState<UpdateMetadata | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Lazily initialise from storage so the effect never needs a
  // synchronous setState for the already-checked / offline paths.
  const [checked, setChecked] = useState(() => {
    try {
      return localStorage.getItem(CHECK_FOR_UPDATE_KEY) === new Date().toDateString();
    } catch {
      return false;
    }
  });

  const dismissUpdate = () => {
    setShowModal(false);
    try {
      localStorage.setItem(CHECK_FOR_UPDATE_KEY, new Date().toDateString());
    } catch {
      // storage unavailable - modal simply reappears next launch
    }
  };

  useEffect(() => {
    // Skip check if already checked today or no internet
    if (checked || !navigator.onLine) {
      return;
    }

    // Compare against the INSTALLED app version (not the metadata's
    // current_version field), so up-to-date users never see the modal.
    const getInstalledVersion = async (): Promise<string> => {
      try {
        return await getVersion();
      } catch {
        return APP_VERSION;
      }
    };

    // Compare versions (simple semver comparison, tolerant of missing parts)
    const versionCompare = (v1: string, v2: string): number => {
      const a = v1.split('.').map((p) => Number(p) || 0);
      const b = v2.split('.').map((p) => Number(p) || 0);
      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i++) {
        if ((a[i] ?? 0) > (b[i] ?? 0)) return 1;
        if ((a[i] ?? 0) < (b[i] ?? 0)) return -1;
      }
      return 0;
    };

    getInstalledVersion()
      .then((installed) =>
        fetch(UPDATE_METADATA_ENDPOINT)
          .then((res) => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
          })
          .then((data: UpdateMetadata) => {
            const comparison = versionCompare(data.latest_version, installed);

            setUpdateMetadata(data);
            setHasUpdate(comparison > 0);
            setShowModal(comparison > 0);
          }),
      )
      .catch((err) => {
        console.error('Failed to check for updates:', err);
        // Silently fail - don't break app launch
      })
      .finally(() => {
        setChecked(true);
      });
  }, [checked]);

  return { hasUpdate, updateMetadata, showModal, checked, dismissUpdate };
}

/// Update Modal Component ///

const UpdateModal = ({
  showModal,
  updateMetadata,
  onClose,
  onUpdate,
}: {
  showModal: boolean;
  updateMetadata: UpdateMetadata | null;
  onClose: () => void;
  onUpdate: () => void;
}) => {
  if (!showModal || !updateMetadata) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Update Available
        </h3>
        <p className="text-gray-600 text-sm mb-8">{updateMetadata.changelog}</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <a
            href={updateMetadata.android_store_url}
            target="_blank"
            rel="noopener"
            onClick={onUpdate}
            className="flex-1 bg-blue-600 text-white text-center px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            Update on Play Store
          </a>
          <a
            href={updateMetadata.ios_store_url}
            target="_blank"
            rel="noopener"
            onClick={onUpdate}
            className="flex-1 bg-green-600 text-white text-center px-4 py-2 rounded hover:bg-green-700 transition-colors">
            Update on App Store
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 mt-6 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
          Remind me later
        </button>
      </div>
    </div>
  );
};

function AppContent() {
  useEffect(() => {
    const splash = document.getElementById('splash')
    if (!splash) return
    const timer = setTimeout(() => {
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 400)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Desktop-class layout: wide screens, OR a landscape phone/tablet where we
  // want the resizable 3-pane shell so the user can drag the side panels to
  // make the reading column bigger. (Previously only >=768px, which excluded
  // landscape phones and left them with no resizable panels at all.)
  const isWide = useMediaQuery("(min-width: 768px)");
  const isLandscape = useMediaQuery(
    "(orientation: landscape) and (min-width: 560px)",
  );
  const isDesktop = isWide || isLandscape;

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
      setAiTarget,
    } = useNavigation();
  const [ready, setReady] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [bookmarkRefresh, setBookmarkRefresh] = useState(0);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [highlightColors, setHighlightColors] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [activeHighlightColor, setActiveHighlightColor] =
    useState<HighlightColorId | null>(null);
  const aiVerseRef = useRef<AiTarget | null>(null);
  const [installedVersions, setInstalledVersions] = useState<string[]>([
    "KJV",
    "NASB",
  ]);
  const { updateMetadata, showModal, dismissUpdate } = useUpdateCheck();

  const refreshInstalledVersions = useCallback(async () => {
    const codes = await getInstalledTranslations()
    setInstalledVersions(codes)
  }, [])

  useEffect(() => {
    refreshInstalledVersions()
  }, [refreshInstalledVersions])
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNav, setShowNav] = useState(false);
  const [navBookId, setNavBookId] = useState(bookId);
  const [navChapter, setNavChapter] = useState(chapter);

  useEffect(() => {
    setNavBookId(bookId);
    setNavChapter(chapter);
  }, [bookId, chapter]);
  const [votdNavigateTo, setVotdNavigateTo] = useState<string | undefined>(
    undefined,
  );
  const [controlsHidden, setControlsHidden] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const headerMeasureRef = useRef<HTMLDivElement>(null);
  const tabBarMeasureRef = useRef<HTMLDivElement>(null);

  // First-run Bible database: on fresh installs the database is not
  // bundled anymore (keeps installs small) and must be downloaded once.
  const [dbScreen, setDbScreen] = useState<'checking' | 'ready' | 'downloading' | 'error'>('checking');
  const [dbProgress, setDbProgress] = useState<{ downloaded: number; total: number | null }>({ downloaded: 0, total: null });
  const [dbError, setDbError] = useState("");

  const startDbDownload = useCallback(() => {
    setDbError("");
    setDbProgress({ downloaded: 0, total: null });
    setDbScreen('downloading');
    invoke('download_db')
      .then(() => {
        setDbScreen('ready');
        setReady(true);
      })
      .catch((err) => {
        setDbError(typeof err === 'string' ? err : String(err));
        setDbScreen('error');
      });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen<{ phase: string; downloaded?: number; total?: number | null }>(
          'db-download',
          (e) => {
            if (e.payload.phase === 'downloading') {
              setDbProgress({
                downloaded: e.payload.downloaded ?? 0,
                total: e.payload.total ?? null,
              });
            }
          },
        );
      } catch {
        // Event listening unavailable (e.g. web preview) — the
        // invoke() result below still drives the UI.
      }
      try {
        const ok = await invoke<boolean>('db_status');
        if (ok) {
          setDbScreen('ready');
          setReady(true);
        } else {
          startDbDownload();
        }
      } catch {
        // Backend commands unavailable (e.g. web preview) — proceed as before.
        setDbScreen('ready');
        setReady(true);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [startDbDownload]);

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
        queueMicrotask(() => setVotdNavigateTo(toDbOsis(pendingOsis)));
      }
      clearPendingVotdNavigation();
    }

    const unlistenPromise = onNotificationReceived(() => {
      const votd = getTodaysVerse();
      const parsed = parseOsisId(votd.osisId);
      if (parsed) {
        navigateTo(parsed.bookId, parsed.chapter);
        setVotdNavigateTo(toDbOsis(votd.osisId));
      }
    });

    if (shouldSendNotificationToday()) {
      const votd = getTodaysVerse();

      // Only notify if the user has ALREADY granted permission.
      // Do NOT prompt at launch — that blocks the UI and hurts first-run UX.
      // The permission request is deferred to an explicit user opt-in (settings).
      isPermissionGranted()
        .then((granted) => {
          if (granted) {
            sendNotification({
              title: `Verse of the Day — ${votd.reference}`,
              body: votd.text,
            });
            markNotificationSent();
            // Only set pending VOTD navigation when a notification is actually
            // sent. This prevents the app from always navigating to the VOTD
            // on every launch when notifications aren't permitted.
            setPendingVotdNavigation(votd.osisId);
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
      const existing = highlightColors.get(verseId) ?? [];
      if (existing.includes(color)) {
        await removeHighlight(verseId, color);
        setHighlightColors((prev) => {
          const next = new Map(prev);
          const c = (next.get(verseId) ?? []).filter((x) => x !== color);
          if (c.length > 0) next.set(verseId, c);
          else next.delete(verseId);
          return next;
        });
      } else {
        setHighlightColors((prev) => {
          const next = new Map(prev);
          const c = next.get(verseId) ?? [];
          next.set(verseId, [...c, color]);
          return next;
        });
        try {
          await toggleHighlight(verseId, color);
        } catch (e) {
          console.error('Highlight error:', e);
          const fresh = await getHighlightsForChapter(bookId, chapter);
          setHighlightColors(fresh);
        }
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

  const handleDataChange = useCallback(() => {
    setDataRefreshKey((n) => n + 1);
  }, []);

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
    handleDataChange();
  }, [noteVerseId, noteText, closeNote, handleDataChange]);

  const handleNavigateBookmark = useCallback(
    (_: string, bookId: number, chapter: number) => {
      navigateTo(bookId, chapter);
    },
    [navigateTo],
  );

  if (!ready) {
    if (dbScreen === 'downloading' || dbScreen === 'error') {
      const pct = dbProgress.total
        ? Math.min(100, Math.round((dbProgress.downloaded / dbProgress.total) * 100))
        : null;
      const sizeText = dbProgress.total
        ? `${(dbProgress.downloaded / 1048576).toFixed(1)} / ${(dbProgress.total / 1048576).toFixed(1)} MB`
        : `${(dbProgress.downloaded / 1048576).toFixed(1)} MB downloaded`;
      return (
        <div className="flex items-center justify-center min-h-screen bg-bg">
          <div className="flex flex-col items-center gap-6 max-w-[280px] text-center">
            <div className="w-32 h-32 rounded-3xl bg-accent/10 flex items-center justify-center overflow-hidden">
              <img
                src="/rblogo.svg"
                alt="RefBible"
                className="h-28 w-auto object-contain"
              />
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
            {dbScreen === 'downloading' ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-xs text-text-secondary font-medium">
                  Downloading Bible data… {pct !== null ? `${pct}%` : ''}
                </p>
                <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                  {pct !== null ? (
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  ) : (
                    <div className="h-full w-1/3 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-text-tertiary">{sizeText} — one-time download</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-xs text-danger font-medium">Download failed</p>
                <p className="text-xs text-text-tertiary break-all">{dbError}</p>
                <button
                  type="button"
                  onClick={startDbDownload}
                  className="w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover active:bg-accent-hover transition-all duration-150 cursor-pointer touch-manipulation"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-6 max-w-[280px] text-center">
          <div className="w-32 h-32 rounded-3xl bg-accent/10 flex items-center justify-center overflow-hidden">
            <img
              src="/rblogo.svg"
              alt="RefBible"
              className="h-28 w-auto object-contain"
            />
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
        if (panel === "ai" && aiVerseRef.current) {
          setAiTarget(aiVerseRef.current);
        }
        if (activePanel === panel) {
          setActivePanel("none");
        } else if (panel === "ai") {
          setActivePanel("ai");
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

  const readingView = (
      <ReadingView
        bookId={bookId}
        chapter={chapter}
        visibleVersions={prefs.visibleVersions}
        fontSize={prefs.fontSize}
        bookmarks={bookmarks}
        isDesktop={isDesktop}
        interlinearEnabled={prefs.interlinearEnabled}
        interlinearLanguages={prefs.interlinearLanguages}
        onToggleInterlinear={toggleInterlinear}
        onToggleBookmark={handleToggleBookmark}
        onOpenNote={handleOpenNote}
        onSelectionVerse={(v) => { setIsSelecting(v !== null); }}
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
                      dataRefreshKey={dataRefreshKey}
                      aiVerseRef={aiVerseRef}
                      handlePanelToggle={() => handlePanelToggle("crossrefs")}
                    />
    );

  const reading = (
    <>
      {chapterHeader}
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
            onVotdNavigate={() => {
              const votd = getTodaysVerse();
              navigateTo(votd.bookId, votd.chapter);
              setVotdNavigateTo(toDbOsis(votd.osisId));
            }}
            installedVersions={installedVersions}
            onRefreshInstalled={refreshInstalledVersions}
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
          interlinearEnabled={prefs.interlinearEnabled}
          onTabChange={(tab) => {
                      if (tab === "read") {
                        setNavBookId(bookId);
                        setNavChapter(chapter);
                        setShowNav(true);
                      } else if (tab === "interlinear") toggleInterlinear();
                      else if (tab === "references") handlePanelToggle("crossrefs");
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
                onVotdNavigate={() => {
                  const votd = getTodaysVerse();
                  navigateTo(votd.bookId, votd.chapter);
                  setVotdNavigateTo(toDbOsis(votd.osisId));
                }}
                installedVersions={installedVersions}
                onRefreshInstalled={refreshInstalledVersions}
              />
            )}
            {activePanel === "ai" && (
              <AiChatPanel
                verseId={aiVerseRef.current?.verseId}
                reference={aiVerseRef.current?.reference}
                verseText={aiVerseRef.current?.text}
                onClose={() => setActivePanel("none")}
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
      <div className="min-h-[100dvh] h-[100dvh] flex flex-col bg-bg" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <DesktopShell
          nav={nav}
          reading={reading}
          sidebar={renderSidebar()}
          onCloseSidebar={() => setActivePanel("none")}
        />
        <UpdateModal
          showModal={showModal}
          updateMetadata={updateMetadata}
          onClose={dismissUpdate}
          onUpdate={dismissUpdate}
        />
      </div>
    );
  }

  return (
      <>
        <div className="min-h-[100dvh] h-[100dvh] flex flex-col overflow-hidden bg-bg" style={{ paddingTop: 'env(safe-area-inset-top, 26px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div
            ref={headerMeasureRef}
            className={controlsHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto shrink-0'}
            style={{ height: controlsHidden ? '0px' : 'auto', transition: 'height 200ms ease, opacity 200ms ease' }}
          >
            {chapterHeader}
          </div>
          <main className="flex-1 min-h-0 flex flex-col bg-bg">
            {readingView}
          </main>
          <div
            ref={tabBarMeasureRef}
            className={controlsHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto shrink-0'}
            style={{ height: controlsHidden ? '0px' : 'auto', transition: 'height 200ms ease, opacity 200ms ease' }}
          >
            {tabBar}
          </div>
        {currentBook && (
          <>
            {chapter > 1 && (
              <button
                type="button"
                onClick={() => navigateTo(bookId, chapter - 1)}
                className={`fixed z-40 flex items-center justify-center w-11 h-11 rounded-full text-text-tertiary hover:text-text-primary bg-black/35 dark:bg-white/25 ring-1 ring-black/20 dark:ring-white/15 active:bg-black/55 dark:active:bg-white/45 transition-all duration-150 cursor-pointer touch-manipulation ${isSelecting ? 'bottom-[140px]' : 'bottom-[80px]'} left-4`}
                aria-label="Previous chapter"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {chapter < (currentBook?.chapters ?? 21) && (
              <button
                type="button"
                onClick={() => navigateTo(bookId, chapter + 1)}
                className={`fixed z-40 flex items-center justify-center w-11 h-11 rounded-full text-text-tertiary hover:text-text-primary bg-black/35 dark:bg-white/25 ring-1 ring-black/20 dark:ring-white/15 active:bg-black/55 dark:active:bg-white/45 transition-all duration-150 cursor-pointer touch-manipulation ${isSelecting ? 'bottom-[140px]' : 'bottom-[80px]'} right-4`}
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
          console.warn('[NavBottomSheet] onSelectVerse called: bookId=', b, 'chapter=', c);
          navigateTo(b, c);
          setShowNav(false);
        }}
      />
      <UpdateModal
        showModal={showModal}
        updateMetadata={updateMetadata}
        onClose={dismissUpdate}
        onUpdate={dismissUpdate}
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
                                  ref={navBookId === b.id ? (el: HTMLButtonElement | null) => {
                                    if (el) {
                                      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
                                    }
                                  } : undefined}
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
                                  ref={navBookId === b.id ? (el: HTMLButtonElement | null) => {
                                    if (el) {
                                      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
                                    }
                                  } : undefined}
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
        <AiVaultProvider>
          <AppContent />
        </AiVaultProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}
