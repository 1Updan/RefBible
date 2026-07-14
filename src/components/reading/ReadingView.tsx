import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VerseRow } from "./VerseRow";
import { VerseActionBar } from "./VerseActionBar";
import { ShareSheet } from "./ShareSheet";
import type { HighlightColorId } from "@/lib/highlights";
import {
  getCrossReferences,
  getTranslations,
  getVerses,
  getNotesForChapter,
  getInterlinearWords,
  getUserCrossReferences,
} from "@/lib/db";
import { useNavigation } from "@/hooks/useNavigation";
import { getBook } from "@/data/books";
import { parseOsisId } from "@/lib/utils";
import type {
  Verse,
  ContentText,
  CrossReference,
  InterlinearWord,
} from "@/types/db";

interface ReadingViewProps {
  bookId: number;
  chapter: number;
  visibleVersions: string[];
  fontSize: number;
  bookmarks: Set<string>;
  isDesktop: boolean;
  interlinearEnabled: boolean;
  interlinearLanguages: readonly ("hebrew" | "greek")[];
  onToggleInterlinear: () => void;
  onToggleBookmark: (verseId: string) => void;
  onOpenNote: (verseId: string) => void;
  onChapterText?: (text: string) => void;
  onChapterVerses?: (verses: string[]) => void;
  onSelectionVerse?: (verseNum: number | null) => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  onControlsVisibleChange?: (visible: boolean) => void;
  votdVerseId?: string;
  highlightColors?: Map<string, string[]>;
  activeHighlightColor?: HighlightColorId | null;
  onHighlightVerse?: (verseId: string, color?: HighlightColorId) => void;
  onRemoveHighlight?: (verseId: string) => void;
  onHighlightColorChange?: (color: HighlightColorId | null) => void;
}

export function ReadingView({
  bookId,
  chapter,
  visibleVersions,
  fontSize,
  bookmarks,
  isDesktop,
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
  onControlsVisibleChange,
  votdVerseId,
  highlightColors,
  activeHighlightColor,
  onHighlightVerse,
  onRemoveHighlight,
  onHighlightColorChange,
}: ReadingViewProps) {
  const {
    openCrossReferences,
    setCrossRefTarget,
    navigateTo,
    pendingRange,
    setPendingRange,
    activePanel,
    studyTab,
    openWordStudy,
  } = useNavigation();
  const pendingRef = useRef(pendingRange);
  useEffect(() => {
    pendingRef.current = pendingRange;
  }, [pendingRange]);
  const prevChapterRef = useRef({ bookId, chapter });
  const [verses, setVerses] = useState<Verse[]>([]);
  const [data, setData] = useState<
    Map<
      string,
      {
        texts: ContentText[];
        xrefs: CrossReference[];
        interlinear: InterlinearWord[];
      }
    >
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [verseNotes, setVerseNotes] = useState<Set<string>>(new Set());
  const [highlightedVerseId, setHighlightedVerseId] = useState<string | null>(
    null,
  );
  const highlightRef = useRef<string | null>(null);
  const historyHighlightedRef = useRef<Set<string>>(new Set());
  const consumedVotdRef = useRef<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swiping = useRef(false);
  const swipeTranslate = useRef(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const controlsVisibleRef = useRef(true);
  const controlsCallbackRef = useRef(onControlsVisibleChange);
  useEffect(() => {
    controlsCallbackRef.current = onControlsVisibleChange;
  }, [onControlsVisibleChange]);

  const handleScroll = useCallback((e: React.UIEvent) => {
    const target = e.target as HTMLElement;
    const scrollY = target.scrollTop;
    const diff = scrollY - lastScrollY.current;
    lastScrollY.current = scrollY;
    if (diff > 8 && scrollY > 40 && controlsVisibleRef.current) {
      controlsVisibleRef.current = false;
      controlsCallbackRef.current?.(true);
    } else if (diff < -8 && !controlsVisibleRef.current) {
      controlsVisibleRef.current = true;
      controlsCallbackRef.current?.(false);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swiping.current = false;
    swipeTranslate.current = 0;
    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onSwipePrev && !onSwipeNext) return;
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (swipeContainerRef.current) {
        swipeContainerRef.current.style.transform = '';
      }
      return;
    }
    swiping.current = true;
    swipeTranslate.current = dx;
    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transform = `translateX(${dx * 0.3}px)`;
      swipeContainerRef.current.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 500));
    }
  }, [onSwipePrev, onSwipeNext]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!onSwipePrev && !onSwipeNext) return;
      const dx = e.changedTouches[0].clientX - swipeStartX.current;
      const dy = e.changedTouches[0].clientY - swipeStartY.current;
      if (swipeContainerRef.current) {
        swipeContainerRef.current.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
        swipeContainerRef.current.style.transform = '';
        swipeContainerRef.current.style.opacity = '1';
      }
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) onSwipePrev?.();
      else onSwipeNext?.();
    },
    [onSwipePrev, onSwipeNext],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swiping.current = false;
    swipeTranslate.current = 0;
    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transition = 'none';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!onSwipePrev && !onSwipeNext) return;
    if ((e.buttons & 1) === 0) return;
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (swipeContainerRef.current) {
        swipeContainerRef.current.style.transform = '';
      }
      return;
    }
    swiping.current = true;
    swipeTranslate.current = dx;
    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transform = `translateX(${dx * 0.3}px)`;
      swipeContainerRef.current.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 500));
    }
  }, [onSwipePrev, onSwipeNext]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!onSwipePrev && !onSwipeNext) return;
      if (swipeContainerRef.current) {
        swipeContainerRef.current.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
        swipeContainerRef.current.style.transform = '';
        swipeContainerRef.current.style.opacity = '1';
      }
      const dx = e.clientX - swipeStartX.current;
      const dy = e.clientY - swipeStartY.current;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) onSwipePrev?.();
      else onSwipeNext?.();
    },
    [onSwipePrev, onSwipeNext],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setSelectionAnchor(null);
      setRangeMode(false);
      setHighlightedVerseId(null);
      setLoadError(null);
      const chapterChanged =
        bookId !== prevChapterRef.current.bookId ||
        chapter !== prevChapterRef.current.chapter;
      prevChapterRef.current = { bookId, chapter };
      if (chapterChanged) setLoading(true);
      let vs: Verse[];
      let noteIds: Set<string>;
      try {
        const result = await Promise.all([
          getVerses(bookId, chapter),
          getNotesForChapter(bookId, chapter),
        ]);
        if (cancelled) return;
        vs = result[0];
        noteIds = result[1];
      } catch (e) {
        if (cancelled) return;
        setLoadError(String(e));
        setLoading(false);
        return;
      }
      setVerses(vs);
      setVerseNotes(noteIds);
      const map = new Map<
        string,
        {
          texts: ContentText[];
          xrefs: CrossReference[];
          interlinear: InterlinearWord[];
        }
      >();
      const batch = vs.map(async (v) => {
        try {
          const [texts, xrefs, userXrefs, interlinear] = await Promise.all([
            getTranslations(v.id),
            getCrossReferences(v.id),
            getUserCrossReferences(v.id),
            interlinearEnabled
              ? getInterlinearWords(v.id)
              : Promise.resolve([] as InterlinearWord[]),
          ]);
          map.set(v.id, { texts, xrefs: [...xrefs, ...userXrefs], interlinear });
        } catch (_) {
          map.set(v.id, { texts: [], xrefs: [], interlinear: [] });
        }
      });
      await Promise.all(batch);
      if (!cancelled) {
        setData(map);
        if (onChapterText || onChapterVerses) {
          const verseTexts: string[] = [];
          for (const v of vs) {
            if (interlinearEnabled) {
              const interlinear = map.get(v.id)?.interlinear ?? [];
              const translit = interlinear
                .map((w) => w.transliteration)
                .filter(Boolean)
                .join(" ");
              verseTexts.push(translit);
            } else {
              const texts = map.get(v.id)?.texts ?? [];
              for (const code of visibleVersions) {
                const t = texts.find((t) => t.translation_code === code);
                if (t) {
                  verseTexts.push(t.text_data);
                  break;
                }
              }
            }
          }
          onChapterText?.(verseTexts.join(" "));
          onChapterVerses?.(verseTexts);
        }
        let historyHighlight: string | null = null;
        for (const v of vs) {
          if (historyHighlightedRef.current.has(v.id)) {
            historyHighlight = v.id;
            historyHighlightedRef.current.delete(v.id);
          }
        }
        const range = pendingRef.current;
        if (range) {
          const newSelected = new Set<string>();
          for (const v of vs) {
            if (
              v.verse_num >= range.verseStart &&
              v.verse_num <= range.verseEnd
            ) {
              newSelected.add(v.id);
            }
          }
          setPendingRange(null);
          setSelectedIds(newSelected);
          const firstInRange = vs.find(
            (v) =>
              v.verse_num >= range.verseStart &&
              v.verse_num <= range.verseEnd,
          );
          if (firstInRange) {
            setHighlightedVerseId(firstInRange.id);
            requestAnimationFrame(() => scrollToVerse(firstInRange.id));
          }
        } else {
          setSelectedIds(new Set());
        }
        setLoading(false);
        if (historyHighlight) {
          setHighlightedVerseId(historyHighlight);
          requestAnimationFrame(() => scrollToVerse(historyHighlight));
        }
        if (highlightRef.current && map.has(highlightRef.current)) {
          const target = highlightRef.current;
          highlightRef.current = null;
          setHighlightedVerseId(target);
          requestAnimationFrame(() => scrollToVerse(target));
        }
        if (votdVerseId && map.has(votdVerseId)) {
          if (votdVerseId !== consumedVotdRef.current) {
            consumedVotdRef.current = votdVerseId;
          }
          setHighlightedVerseId(votdVerseId);
          requestAnimationFrame(() => scrollToVerse(votdVerseId));
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [
    bookId,
    chapter,
    interlinearEnabled,
    visibleVersions,
    onChapterText,
    onChapterVerses,
    setPendingRange,
    votdVerseId,
  ]);

  useEffect(() => {
    if (!onSelectionVerse) return;
    if (selectedIds.size === 0) {
      onSelectionVerse(null);
      return;
    }
    const first = verses.find((v) => selectedIds.has(v.id));
    onSelectionVerse(first ? first.verse_num : null);
  }, [selectedIds, verses, onSelectionVerse]);

  const handleToggleSelect = useCallback(
    (verseId: string, shiftKey?: boolean) => {
      if ((shiftKey || rangeMode) && selectionAnchor) {
        const anchorIdx = verses.findIndex((v) => v.id === selectionAnchor);
        const clickIdx = verses.findIndex((v) => v.id === verseId);
        if (anchorIdx !== -1 && clickIdx !== -1) {
          const start = Math.min(anchorIdx, clickIdx);
          const end = Math.max(anchorIdx, clickIdx);
          const ids = verses.slice(start, end + 1).map((v) => v.id);
          setSelectedIds(new Set(ids));
          setRangeMode(false);
          return;
        }
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(verseId)) next.delete(verseId);
        else next.add(verseId);
        return next;
      });
      setSelectionAnchor(verseId);
      setRangeMode(false);
    },
    [verses, selectionAnchor, rangeMode],
  );

  const handleRangeSelect = useCallback(() => {
    if (rangeMode) {
      setRangeMode(false);
    } else if (selectedIds.size === 1) {
      const anchor = [...selectedIds][0];
      setSelectionAnchor(anchor);
      setRangeMode(true);
    }
  }, [rangeMode, selectedIds]);

  useEffect(() => {
    if (!votdVerseId || votdVerseId === consumedVotdRef.current) return;
    const parsed = parseOsisId(votdVerseId);
    if (!parsed) return;
    if (parsed.bookId === bookId && parsed.chapter === chapter) {
      consumedVotdRef.current = votdVerseId;
      queueMicrotask(() => {
        setHighlightedVerseId(votdVerseId);
        setSelectedIds(new Set([votdVerseId]));
      });
    }
  }, [votdVerseId, bookId, chapter]);

  const scrollToVerse = useCallback((verseId: string) => {
    const el = document.getElementById(`verse-${verseId}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (!highlightedVerseId) return;
    const raf = requestAnimationFrame(() => scrollToVerse(highlightedVerseId));
    const timer = setTimeout(() => setHighlightedVerseId(null), 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [highlightedVerseId, scrollToVerse]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    historyHighlightedRef.current = new Set();
    setRangeMode(false);
  }, []);

  useEffect(() => {
    if (selectedIds.size === 1 && !rangeMode) {
      const verseId = [...selectedIds][0];
      if (bookmarks.has(verseId) && verseNotes.has(verseId)) {
        onOpenNote(verseId);
      }
    }
  }, [selectedIds, bookmarks, verseNotes, onOpenNote, rangeMode]);

  useEffect(() => {
    if (
      selectedIds.size === 1 &&
      activePanel === "study" &&
      studyTab === "crossrefs"
    ) {
      const verseId = [...selectedIds][0];
      const v = verses.find((x) => x.id === verseId);
      if (!v) return;
      const book = getBook(bookId);
      setCrossRefTarget({
        verseId,
        bookId: v.book_id,
        chapter: v.chapter_num,
        reference: `${book?.name ?? "John"} ${chapter}:${v.verse_num}`,
      });
    }
  }, [
    selectedIds,
    activePanel,
    studyTab,
    verses,
    bookId,
    chapter,
    setCrossRefTarget,
  ]);

  const handleNavigateToRef = useCallback(
    (sourceId: string, targetId: string) => {
      historyHighlightedRef.current.add(sourceId);
      historyHighlightedRef.current.add(targetId);
      const parsed = parseOsisId(targetId);
      if (!parsed) return;
      if (parsed.bookId === bookId && parsed.chapter === chapter) {
        setHighlightedVerseId(targetId);
        const el = document.getElementById(`verse-${targetId}`);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      } else {
        highlightRef.current = targetId;
        navigateTo(parsed.bookId, parsed.chapter, targetId, true);
      }
    },
    [navigateTo, bookId, chapter],
  );

  const handleSelectWord = useCallback(
    (word: InterlinearWord, verseId: string, reference: string) => {
      openWordStudy({ word, verseId, reference });
    },
    [openWordStudy],
  );

  const handleOpenCrossRefs = useCallback(
    (verseId: string) => {
      setSelectedIds(new Set([verseId]));
      const v = verses.find((x) => x.id === verseId);
      const book = getBook(bookId);
      openCrossReferences({
        verseId,
        bookId: v?.book_id ?? bookId,
        chapter: v?.chapter_num ?? chapter,
        reference: `${book?.name ?? "John"} ${chapter}:${v?.verse_num ?? (verseId.split('.').pop() ?? '')}`,
      });
    },
    [verses, bookId, chapter, openCrossReferences],
  );

  const selectedList = useMemo(
    () => [...selectedIds].sort((a, b) => a.localeCompare(b)),
    [selectedIds],
  );

  const allBookmarked = useMemo(
    () =>
      selectedList.length > 0 && selectedList.every((id) => bookmarks.has(id)),
    [selectedList, bookmarks],
  );

  const handleActionBookmark = useCallback(() => {
    for (const id of selectedList) onToggleBookmark(id);
  }, [selectedList, onToggleBookmark]);

  const handleActionNote = useCallback(() => {
    if (selectedList.length === 1) onOpenNote(selectedList[0]);
  }, [selectedList, onOpenNote]);

  const handleActionCrossRefs = useCallback(() => {
    if (selectedList.length === 1) {
      const v = verses.find((x) => x.id === selectedList[0]);
      if (!v) return;
      const book = getBook(bookId);
      openCrossReferences({
        verseId: selectedList[0],
        bookId: v.book_id,
        chapter: v.chapter_num,
        reference: `${book?.name ?? "John"} ${chapter}:${v.verse_num}`,
      });
    }
  }, [selectedList, verses, bookId, chapter, openCrossReferences]);

  const [shareVerse, setShareVerse] = useState<{
    reference: string;
    text: string;
    versionLabel: string;
    highlightColors?: string[];
  } | null>(null);
  const [highlightActive, setHighlightActive] = useState(false);

  const handleToggleHighlight = useCallback(() => {
    setHighlightActive((prev) => {
      if (prev) onHighlightColorChange?.(null);
      return !prev;
    });
  }, [onHighlightColorChange]);

  const handleHighlightColorSelect = useCallback(
    (color: HighlightColorId | null) => {
      if (color && onHighlightVerse) {
        for (const verseId of selectedIds) {
          onHighlightVerse(verseId, color);
        }
      }
      setHighlightActive(false);
      onHighlightColorChange?.(null);
    },
    [selectedIds, onHighlightVerse, onHighlightColorChange],
  );

  const handleEraseSelection = useCallback(() => {
    if (onRemoveHighlight) {
      for (const verseId of selectedIds) {
        onRemoveHighlight(verseId);
      }
    }
    setHighlightActive(false);
  }, [selectedIds, onRemoveHighlight]);

  const handleShare = useCallback(() => {
    if (selectedList.length < 1 || selectedList.length > 5) return;
    const book = getBook(bookId);
    const versionLabel = "King James Bible";
    const parts: string[] = [];

    for (const verseId of selectedList) {
      const d = data.get(verseId);
      const v = verses.find((x) => x.id === verseId);
      if (!d || !v) continue;
      const firstText =
        d.texts.find((t) => t.translation_code === "KJV") ?? d.texts[0];
      if (!firstText) continue;
      parts.push(`${v.verse_num}. ${firstText.text_data}`);
    }

    if (parts.length === 0) return;

    const firstVerse = verses.find((x) => x.id === selectedList[0]);
    const lastVerse = verses.find(
      (x) => x.id === selectedList[selectedList.length - 1],
    );
    const ref =
      selectedList.length === 1
        ? `${book?.name ?? "John"} ${firstVerse?.chapter_num}:${firstVerse?.verse_num}`
        : `${book?.name ?? "John"} ${firstVerse?.chapter_num}:${firstVerse?.verse_num}-${lastVerse?.verse_num}`;

    const firstId = selectedList[0];
    setShareVerse({
      reference: ref,
      text: parts.join("\n"),
      versionLabel,
      highlightColors: highlightColors?.get(firstId),
    });
  }, [selectedList, verses, data, bookId, highlightColors]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-danger font-medium">Error loading chapter</p>
          <p className="text-[10px] text-text-tertiary break-all">{loadError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-tertiary">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain"
        ref={topRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ overscrollBehavior: 'contain' }}
      >
        <div ref={swipeContainerRef}>
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-0.5">
          {verses.map((verse) => {
            const d = data.get(verse.id);
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
                highlightColors={highlightColors?.get(verse.id)}
                activeHighlightColor={activeHighlightColor}
                onToggleSelect={(e) => handleToggleSelect(verse.id, e.shiftKey)}
                onNavigateToRef={(targetId) =>
                  handleNavigateToRef(verse.id, targetId)
                }
                onOpenCrossRefs={handleOpenCrossRefs}
                onSelectWord={handleSelectWord}
                onHighlightVerse={onHighlightVerse}
              />
            );
          })}
        </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <VerseActionBar
          selectedCount={selectedIds.size}
          isDesktop={isDesktop}
          allBookmarked={allBookmarked}
          onToggleBookmark={handleActionBookmark}
          onAddNote={handleActionNote}
          onCrossReferences={handleActionCrossRefs}
          onClearSelection={handleClearSelection}
          onRangeSelect={handleRangeSelect}
          isRangeMode={rangeMode}
          interlinearEnabled={interlinearEnabled}
          onToggleInterlinear={onToggleInterlinear}
          onShare={handleShare}
          highlightActive={highlightActive}
          activeHighlightColor={activeHighlightColor}
          onToggleHighlight={handleToggleHighlight}
          onHighlightColorSelect={handleHighlightColorSelect}
          onEraseSelection={handleEraseSelection}
        />
      )}

      {shareVerse && (
        <ShareSheet
          reference={shareVerse.reference}
          verseText={shareVerse.text}
          versionLabel={shareVerse.versionLabel}
          highlightColors={shareVerse.highlightColors}
          onClose={() => setShareVerse(null)}
        />
      )}
    </div>
  );
}
