import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Crosshair, MessageSquareMore, Trash2, BookText, Volume2, Search } from 'lucide-react'
import clsx from 'clsx'
import { useNavigation } from '@/hooks/useNavigation'
import { getCrossReferences, getTranslations, saveNote, getNotes, getAllNotes, deleteNote, getStrongsEntry, getInterlinearWords, getUserCrossReferences, addCustomCrossReference, removeCustomCrossReference, searchVerses } from '@/lib/db'
import { formatVerseId, parseOsisId, parseReference, verseIdFromBookChapterVerse } from '@/lib/utils'
import type { SearchResult } from '@/lib/db'
import { getBook } from '@/data/books'
import type { CrossReference, Note, StrongsEntry, InterlinearWord } from '@/types/db'
import type { ActiveTab } from '@/contexts/navigation'

const TABS: { id: ActiveTab; label: string; icon: typeof Crosshair }[] = [
  { id: 'crossrefs', label: 'Cross-Refs', icon: Crosshair },
  { id: 'notes', label: 'Notes', icon: MessageSquareMore },
  { id: 'word', label: 'Word', icon: BookText },
]

function CrossRefsTab() {
  const { crossRefTarget, navigateTo, bookId } = useNavigation()
  const [xrefs, setXrefs] = useState<CrossReference[]>([])
  const [userXrefs, setUserXrefs] = useState<(CrossReference & { user_created: boolean })[]>([])
  const [previews, setPreviews] = useState<Map<string, string>>(new Map())
  const [addInput, setAddInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = crossRefTarget?.verseId
    let cancelled = false
    async function load() {
      if (!target) return
      try {
        const [refs, userRefs] = await Promise.all([
          getCrossReferences(target),
          getUserCrossReferences(target),
        ])
        if (cancelled) return
        setXrefs(refs)
        setUserXrefs(userRefs)
        setLoadError(null)
        const allRefs = [...refs, ...userRefs]
        const map = new Map<string, string>()
        const batch = allRefs.map(async (x) => {
          const texts = await getTranslations(x.target_verse_id)
          const first = texts.find((t) => t.translation_code === 'KJV') ?? texts[0]
          if (first) {
            map.set(x.target_verse_id, first.text_data)
          }
        })
        await Promise.all(batch)
        if (!cancelled) setPreviews(map)
      } catch (e) {
        if (!cancelled) setLoadError(String(e))
      }
    }
    load()
    return () => { cancelled = true }
  }, [crossRefTarget, refreshKey])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const trimmed = addInput.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchVerses(trimmed, ['KJV'])
        setSearchResults(results.slice(0, 20))
        setShowSearchResults(results.length > 0)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [addInput])

  const handleAdd = useCallback(async (targetIdOverride?: string) => {
    setAddError(null)
    setShowSearchResults(false)
    const target = crossRefTarget?.verseId
    if (!target) return
    const trimmed = addInput.trim()
    if (!trimmed && !targetIdOverride) {
      setAddError('Enter a verse reference.')
      return
    }
    let targetId: string
    if (targetIdOverride) {
      targetId = targetIdOverride
    } else {
      const parsed = parseReference(trimmed)
      if (!parsed) {
        setAddError('Could not parse. Try e.g. "Romans 1:1"')
        return
      }
      if (!parsed.verse) {
        setAddError('Include a verse number, e.g. "Romans 1:1"')
        return
      }
      const id = verseIdFromBookChapterVerse(parsed.bookId, parsed.chapter, parsed.verse)
      if (!id) {
        setAddError('Could not build verse ID.')
        return
      }
      targetId = id
    }
    setAdding(true)
    try {
      await addCustomCrossReference(target, targetId)
      setAddInput('')
      addInputRef.current?.focus()
      setRefreshKey((n) => n + 1)
    } finally {
      setAdding(false)
    }
  }, [crossRefTarget, addInput])

  const handleRemove = useCallback(async (id: number) => {
    await removeCustomCrossReference(id)
    setRefreshKey((n) => n + 1)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node) &&
          addInputRef.current && !addInputRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function renderHighlightedText(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} className="bg-accent/30 text-text-primary rounded-sm px-0.5">{part}</mark>
        : <Fragment key={i}>{part}</Fragment>
    )
  }

  if (!crossRefTarget) {
    return <p className="text-xs text-text-tertiary px-1 py-4 text-center">Select a verse to see cross references</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-secondary px-1">
        For <span className="font-semibold text-text-primary">{crossRefTarget.reference}</span>
      </p>

      <div className="relative">
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              ref={addInputRef}
              type="text"
              value={addInput}
              onChange={(e) => { setAddInput(e.target.value); setAddError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true) }}
              placeholder="Search Bible or type a reference e.g. Romans 1:1"
              className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
            />
          </div>
          <button
            type="button"
            onClick={() => handleAdd()}
            disabled={adding || !addInput.trim()}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer shrink-0"
          >
            {adding ? 'Adding\u2026' : 'Add Ref'}
          </button>
        </div>
        <p className="text-[10px] text-text-tertiary px-1 mt-1">Click a search result to navigate, hover and tap +Add to add as cross-reference</p>
        {showSearchResults && (
          <div
            ref={resultsRef}
            className="absolute z-50 left-0 right-12 mt-1 max-h-48 overflow-y-auto rounded-lg bg-surface-elevated border border-border shadow-lg"
          >
            {searching ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              searchResults.map((r) => {
                const book = getBook(r.book_id)
                const label = `${book?.name ?? 'Unknown'} ${r.chapter_num}:${r.verse_num}`
                return (
                  <div
                    key={r.verse_id}
                    className="flex items-start gap-1 px-2.5 py-2 text-xs border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors duration-100 group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo(r.book_id, r.chapter_num, r.verse_id)
                        setShowSearchResults(false)
                        setAddInput('')
                      }}
                      className="flex-1 text-left cursor-pointer min-w-0"
                    >
                      <span className="font-semibold text-accent">{label}</span>
                      <p className="text-text-secondary mt-0.5 leading-relaxed line-clamp-2">{renderHighlightedText(r.text_data, addInput)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAdd(r.verse_id)
                      }}
                      className="shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent/15 text-accent hover:bg-accent/30 active:bg-accent/40 transition-all duration-150 cursor-pointer touch-manipulation"
                      title="Add as cross-reference"
                    >
                      +Add
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      {addError && (
        <p className="text-[10px] text-danger px-1">{addError}</p>
      )}
      {loadError && (
        <p className="text-[10px] text-danger px-1">Error loading: {loadError}</p>
      )}

      {!loadError && xrefs.length === 0 && userXrefs.length === 0 && (
        <p className="text-xs text-text-tertiary px-1">No cross references available. Add your own above.</p>
      )}
      {[...xrefs, ...userXrefs].map((xref: CrossReference & { user_created?: boolean }) => {
        const preview = previews.get(xref.target_verse_id)
        const isUser = (xref as CrossReference & { user_created?: boolean }).user_created
        return (
          <div
            key={xref.id}
            className={clsx(
              'relative w-full text-left p-2.5 rounded-lg border transition-all duration-150 group',
              isUser
                ? 'bg-accent/5 border-accent/20 hover:bg-accent/10'
                : 'bg-surface-elevated border-border-subtle hover:bg-surface-hover',
            )}
          >
            <button
              type="button"
              onClick={() => {
                const parts = xref.target_verse_id.split('.')
                if (parts.length >= 3) navigateTo(bookId, Number(parts[1]), xref.target_verse_id)
              }}
              className="w-full text-left cursor-pointer"
            >
              <span className="text-xs font-semibold text-accent">{formatVerseId(xref.target_verse_id)}</span>
              {preview && (
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed break-words pr-12">{preview}</p>
              )}
            </button>
            {isUser && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(xref.id) }}
                className="absolute bottom-2 right-2 p-1 rounded text-danger hover:text-danger/80 transition-all duration-150 cursor-pointer"
                aria-label="Remove cross-reference"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NotesTab() {
  const { noteVerseId, closeNote, navigateTo, openNote } = useNavigation()
  const [text, setText] = useState('')
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    getAllNotes().then(setAllNotes)
  }, [noteVerseId, refreshKey])

  useEffect(() => {
    if (noteVerseId) {
      getNotes(noteVerseId).then((notes) => {
        setText(notes.length > 0 ? notes[0].text_content : '')
      })
    }
    return () => { setText('') }
  }, [noteVerseId])

  const handleSave = useCallback(async () => {
    if (noteVerseId && text.trim()) {
      await saveNote(noteVerseId, text.trim())
      setRefreshKey((n) => n + 1)
      closeNote()
    }
  }, [noteVerseId, text, closeNote])

  const handleDelete = useCallback(async (verseId: string) => {
    await deleteNote(verseId)
    setRefreshKey((n) => n + 1)
    if (noteVerseId === verseId) closeNote()
  }, [noteVerseId, closeNote])

  const handleNavigateToVerse = useCallback((verseId: string) => {
    const parsed = parseOsisId(verseId)
    if (parsed) {
      navigateTo(parsed.bookId, parsed.chapter)
    }
  }, [navigateTo])

  if (noteVerseId) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-text-secondary font-mono">{noteVerseId}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your note…"
          rows={5}
          className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all duration-150"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            Save Note
          </button>
          <button
            type="button"
            onClick={closeNote}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDelete(noteVerseId)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-danger border border-danger/30 hover:bg-danger/10 transition-all duration-150 cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {allNotes.length === 0 && (
        <p className="text-xs text-text-tertiary px-1 py-4 text-center">
          No notes yet. Select a verse and tap the note icon to write one.
        </p>
      )}
      {allNotes.map((note) => {
        const parsed = parseOsisId(note.verse_id)
        const book = parsed ? getBook(parsed.bookId) : null
        return (
          <button
            key={note.id}
            type="button"
            onClick={() => handleNavigateToVerse(note.verse_id)}
            className="w-full text-left p-3 rounded-lg bg-surface-elevated border border-border-subtle hover:bg-surface-hover transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-accent">
                {book ? `${book.name} ${parsed?.chapter}:${parsed?.verseNum}` : note.verse_id}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openNote(note.verse_id) }}
                  className="p-1 rounded text-text-tertiary hover:text-accent transition-colors duration-150 cursor-pointer"
                  aria-label="Edit note"
                >
                  <MessageSquareMore size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(note.verse_id) }}
                  className="p-1 rounded text-text-tertiary hover:text-danger transition-colors duration-150 cursor-pointer"
                  aria-label="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{note.text_content}</p>
          </button>
        )
      })}
    </div>
  )
}

function WordTab() {
  const { wordTarget } = useNavigation()
  const [strongs, setStrongs] = useState<StrongsEntry | null>(null)
  const [verseWords, setVerseWords] = useState<InterlinearWord[]>([])

  useEffect(() => {
    if (!wordTarget) return
    getStrongsEntry(wordTarget.word.strongs_number ?? '').then((entry) => {
      setStrongs(entry)
    })
    getInterlinearWords(wordTarget.verseId).then((words) => {
      setVerseWords(words)
    })
  }, [wordTarget])

  const speak = useCallback((text: string) => {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const uri = localStorage.getItem('refbible-speech-voice')
    if (uri) {
      const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === uri)
      if (voice) utterance.voice = voice
    }
    utterance.rate = 0.65
    speechSynthesis.speak(utterance)
  }, [])

  if (!wordTarget) {
    return <p className="text-xs text-text-tertiary px-1 py-4 text-center">Tap a word to see its details here.</p>
  }

  const w = wordTarget.word
  const isHebrew = w.language === 'hebrew'
  const fontStack = isHebrew ? 'font-hebrew' : 'font-greek'
  const langLabel = isHebrew ? 'Hebrew' : 'Greek'

  const fullVerseText = verseWords
    .map((vw) => vw.transliteration)
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-4 px-3 rounded-xl bg-surface-elevated border border-border-subtle relative">
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{langLabel}</span>
        <span className={`${fontStack} text-2xl text-accent leading-tight`} dir={isHebrew ? 'rtl' : 'ltr'}>
          {w.original_text}
        </span>
        {w.transliteration && (
          <span className="text-sm text-text-tertiary italic mt-1">{w.transliteration}</span>
        )}
        {w.transliteration && (
          <button
            type="button"
            onClick={() => speak(w.transliteration!)}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 transition-all duration-150 cursor-pointer"
          >
            <Volume2 size={13} />
            Pronounce
          </button>
        )}
      </div>

      <div className="space-y-2">
        {w.strongs_number && (
          <DetailRow label="Strong's Number" value={w.strongs_number} />
        )}
        {w.lemma && (
          <DetailRow label="Lemma" value={w.lemma} />
        )}
        {w.morphology && (
          <DetailRow label="Morphology" value={w.morphology} />
        )}
        {w.gloss && (
          <DetailRow label="Gloss" value={w.gloss} />
        )}
      </div>

      {strongs && (
        <div className="px-3 py-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-1">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Strong's Definition</p>
          {strongs.transliteration && (
            <p className="text-xs text-text-secondary italic">{strongs.transliteration}</p>
          )}
          {strongs.pronunciation && (
            <p className="text-xs text-text-tertiary">{strongs.pronunciation}</p>
          )}
          {strongs.definition && (
            <p className="text-xs text-text-primary leading-relaxed">{strongs.definition}</p>
          )}
          {strongs.word_count != null && (
            <p className="text-[10px] text-text-tertiary mt-1">Occurrences: {strongs.word_count}</p>
          )}
        </div>
      )}

      {fullVerseText && (
        <div className="px-3 py-3 rounded-lg bg-surface-elevated border border-border-subtle space-y-2">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
            Read Verse Aloud
          </p>
          <p className="text-xs text-text-secondary italic leading-relaxed line-clamp-3">
            {fullVerseText}
          </p>
          <button
            type="button"
            onClick={() => speak(fullVerseText)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 transition-all duration-150 cursor-pointer"
          >
            <Volume2 size={13} />
            Read Verse
          </button>
        </div>
      )}

    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle">
      <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
      <span className="text-xs text-text-primary font-mono">{value}</span>
    </div>
  )
}

export function StudyPanel() {
  const { studyTab, setStudyTab } = useNavigation()

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStudyTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-all duration-150 cursor-pointer border-b-2 ${
              studyTab === id
                ? 'text-accent border-accent'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {studyTab === 'crossrefs' && <CrossRefsTab />}
        {studyTab === 'notes' && <NotesTab />}
        {studyTab === 'word' && <WordTab />}
      </div>
    </div>
  )
}
