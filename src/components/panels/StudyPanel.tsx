import { useCallback, useEffect, useState } from 'react'
import { Crosshair, MessageSquareMore, Sparkles, Trash2, WifiOff, Key, AlertCircle } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { useNetworkState } from '@/hooks/useNetworkState'
import { getCrossReferences, getTranslations, saveNote, getNotes, getAllNotes, deleteNote } from '@/lib/db'
import { formatVerseId, parseOsisId } from '@/lib/utils'
import { invoke } from '@tauri-apps/api/core'
import { getBook } from '@/data/books'
import type { CrossReference, Note } from '@/types/db'
import type { ActiveTab } from '@/contexts/navigation'

const TABS: { id: ActiveTab; label: string; icon: typeof Crosshair }[] = [
  { id: 'crossrefs', label: 'Cross-Refs', icon: Crosshair },
  { id: 'notes', label: 'Notes', icon: MessageSquareMore },
  { id: 'ai', label: 'AI', icon: Sparkles },
]

function CrossRefsTab() {
  const { crossRefTarget, navigateTo, bookId } = useNavigation()
  const [xrefs, setXrefs] = useState<CrossReference[]>([])
  const [previews, setPreviews] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const target = crossRefTarget?.verseId
    let cancelled = false
    async function load() {
      if (!target) return
      const refs = await getCrossReferences(target)
      if (cancelled) return
      setXrefs(refs)
      const map = new Map<string, string>()
      const batch = refs.map(async (x) => {
        const texts = await getTranslations(x.target_verse_id)
        const first = texts.find((t) => t.translation_code === 'KJV') ?? texts[0]
        if (first) {
          map.set(x.target_verse_id, first.text_data)
        }
      })
      await Promise.all(batch)
      if (!cancelled) setPreviews(map)
    }
    load()
    return () => { cancelled = true }
  }, [crossRefTarget])

  if (!crossRefTarget) {
    return <p className="text-xs text-text-tertiary px-1 py-4 text-center">Select a verse to see cross references</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-secondary px-1">
        For <span className="font-semibold text-text-primary">{crossRefTarget.reference}</span>
      </p>
      {xrefs.length === 0 && <p className="text-xs text-text-tertiary px-1">No cross references available.</p>}
      {xrefs.map((xref) => {
        const preview = previews.get(xref.target_verse_id)
        return (
          <button
            key={xref.id}
            type="button"
            onClick={() => {
              const parts = xref.target_verse_id.split('.')
              if (parts.length >= 3) navigateTo(bookId, Number(parts[1]), xref.target_verse_id)
            }}
            className="w-full text-left p-2.5 rounded-lg bg-surface-elevated border border-border-subtle hover:bg-surface-hover transition-all duration-150 cursor-pointer group"
          >
            <span className="text-xs font-semibold text-accent">{formatVerseId(xref.target_verse_id)}</span>
            {preview && (
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{preview}</p>
            )}
          </button>
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

type AiMode = 'passage' | 'contextual' | 'historical' | 'structural' | 'lexical' | 'intertextual' | 'denominational' | 'theological' | 'applicational' | 'custom'

interface AiModeDef {
  id: AiMode
  label: string
  description: string
  icon: typeof Crosshair
  systemPrompt: string
}

const AI_MODES: AiModeDef[] = [
  {
    id: 'passage',
    label: 'Pure Passage',
    description: 'Text-only meaning, no outside data',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Analyze the provided text strictly by what is written. Do not pull in external historical, cultural, or philosophical data. Focus only on the immediate, explicit meaning of the words as they appear on the page.`,
  },
  {
    id: 'contextual',
    label: 'Contextual & Background',
    description: 'Immediate context, book theme, narrative flow',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Analyze the passage in light of its context. Examine how it fits within the verses immediately before and after it. Analyze it in light of the entire book's overarching theme and purpose. Track how the argument or story develops leading up to and following the selected text.`,
  },
  {
    id: 'historical',
    label: 'Historical & Cultural',
    description: 'Ancient customs, authorship, setting',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Analyze the historical and cultural setting of the passage. Explain societal norms, laws, traditions, and cultural practices of the time. Identify who wrote the text, who they were writing to, and why. Outline political events, geographical locations, and the chronological timeline surrounding the text.`,
  },
  {
    id: 'structural',
    label: 'Structural & Literary',
    description: 'Genre, outline, literary devices',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Analyze the literary features of the passage. Identify its genre (poetry, prophecy, epistle, narrative, wisdom). Break the passage into a logical outline or structural map. Detect rhetorical and poetic tools such as chiasms, parallelisms, metaphors, and wordplay.`,
  },
  {
    id: 'lexical',
    label: 'Lexical Analysis',
    description: 'Original languages, word studies, etymology',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Analyze the original Greek, Hebrew, or Aramaic words behind the English translation. Trace the etymology and underlying definitions of key terms. Examine how specific words are used across different parts of Scripture to find deeper nuances.`,
  },
  {
    id: 'intertextual',
    label: 'Intertextual Analysis',
    description: 'Cross-references, quotations, redemptive history',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Analyze how the passage connects to the rest of Scripture. Locate and explain direct links to other verses. Identify where the passage quotes other scriptures or alludes to older biblical themes. Trace how the specific concepts develop from Genesis to Revelation.`,
  },
  {
    id: 'denominational',
    label: 'Comparative Denominational',
    description: 'Reformed, Catholic, Orthodox, Arminian views',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Compare interpretations from different Christian traditions (Reformed, Catholic, Orthodox, Arminian, Pentecostal). Clearly outline where these traditions disagree on the interpretation of the text. Highlight points of agreement among the various traditions.`,
  },
  {
    id: 'theological',
    label: 'Theological & Topical',
    description: 'Doctrines, biblical themes, topical synthesis',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Identify major doctrinal themes present in the text (nature of God, salvation, humanity). Trace core motifs like covenant, kingdom, grace, or justice. Connect the passage to broader biblical teachings on specific subjects.`,
  },
  {
    id: 'applicational',
    label: 'Behavioral & Application',
    description: 'Ethics, modern application, reflection',
    icon: Crosshair,
    systemPrompt: `You are an advanced AI engine for Bible study. Extract the ethical commands, principles, and values taught in the passage. Translate ancient principles into actionable guidance for contemporary daily living. Provide prompts that help the user think about personal transformation and character growth.`,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Write your own instruction',
    icon: Crosshair,
    systemPrompt: '',
  },
]

function AiTab() {
  const { aiTarget } = useNavigation()
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('refbible-ai-key') ?? '')
  const saved = !!localStorage.getItem('refbible-ai-key')
  const isOnline = useNetworkState()
  const [selectedMode, setSelectedMode] = useState<AiMode | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    localStorage.setItem('refbible-ai-key', apiKey)
    window.location.reload()
  }

  const handleClear = () => {
    localStorage.removeItem('refbible-ai-key')
    setApiKey('')
    window.location.reload()
  }

  const handleRun = async () => {
    if (!aiTarget || !apiKey) return
    const mode = AI_MODES.find((m) => m.id === (selectedMode ?? 'text-analysis'))
    if (!mode) return
    setLoading(true)
    setError(null)
    setResponse('')
    try {
      const systemPrompt = mode.systemPrompt
      const combinedPrompt = customPrompt.trim()
        ? `${systemPrompt}\n\nExtra instructions from user:\n${customPrompt}\n\nVerse: ${aiTarget.reference}\n\n${aiTarget.text}`
        : `${systemPrompt}\n\nVerse: ${aiTarget.reference}\n\n${aiTarget.text}`
      const raw = await invoke<string>('ai_query', { apiKey, prompt: combinedPrompt })
      const parsed = JSON.parse(raw)
      const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response text found.'
      setResponse(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <WifiOff size={24} className="text-text-tertiary" />
        <p className="text-sm text-text-secondary font-medium">You are offline</p>
        <p className="text-xs text-text-tertiary">AI analysis requires an internet connection.</p>
      </div>
    )
  }

  if (!saved) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} />
            What AI Can Do
          </h3>
          <div className="space-y-1.5">
            {AI_MODES.filter((m) => m.id !== 'custom').map((mode) => (
              <div key={mode.id} className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle">
                <p className="text-xs font-semibold text-text-primary">{mode.label}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{mode.description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            AI works on any verse you select. Enter your API key to get started.
          </p>
        </div>

        <hr className="border-border" />

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Key size={14} className="text-text-tertiary" />
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">API Key</h3>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Gemini API key"
            className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            Activate AI
          </button>
          <p className="text-xs text-text-tertiary flex items-start gap-1.5">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            Your key is stored locally and never sent anywhere except Google AI Studio.
          </p>
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-text-secondary mb-2">How to get your API key:</p>
            <ol className="space-y-1.5 text-xs text-text-tertiary list-decimal list-inside leading-relaxed">
              <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">aistudio.google.com/apikey</a></li>
              <li>Sign in with your Google account</li>
              <li>Click <strong>Create API Key</strong></li>
              <li>Copy the generated key and paste it above</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-secondary">AI activated</span>
        <button type="button" onClick={handleClear} className="text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer">
          Revoke
        </button>
      </div>

      {!aiTarget ? (
        <div className="px-4 py-6 rounded-lg bg-surface-elevated border border-border-subtle text-center">
          <Sparkles size={20} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">
            Select a verse and tap the AI button in the action bar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs font-semibold text-accent">{aiTarget.reference}</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{aiTarget.text}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Analysis Mode</p>
            <div className="grid grid-cols-2 gap-1.5">
              {AI_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-all duration-150 cursor-pointer ${
                    selectedMode === mode.id
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface-elevated text-text-secondary border-border-subtle hover:border-accent/30 hover:text-text-primary'
                  }`}
                >
                  <p className="font-semibold">{mode.label}</p>
                  <p className={`mt-0.5 leading-tight ${selectedMode === mode.id ? 'text-white/80' : 'text-text-tertiary'}`}>
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {selectedMode === 'custom' ? 'Your Instruction' : 'Extra Instructions (optional)'}
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={selectedMode === 'custom' ? 'Write your analysis instruction…' : 'Add your own instructions on top of the preset…'}
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all duration-150"
            />
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Run Analysis
              </>
            )}
          </button>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {response && (
            <div className="px-3 py-3 rounded-lg bg-surface-elevated border border-border-subtle">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Result</p>
              <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{response}</div>
            </div>
          )}
        </div>
      )}
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
        {studyTab === 'ai' && <AiTab />}
      </div>
    </div>
  )
}
