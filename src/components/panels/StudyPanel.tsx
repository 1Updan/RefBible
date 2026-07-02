import { useCallback, useEffect, useRef, useState } from 'react'
import { Crosshair, MessageSquareMore, Sparkles, Trash2, WifiOff, Key, AlertCircle, BookText, Volume2, VolumeX } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { useNetworkState } from '@/hooks/useNetworkState'
import { getCrossReferences, getTranslations, saveNote, getNotes, getAllNotes, deleteNote, getStrongsEntry } from '@/lib/db'
import { formatVerseId, parseOsisId } from '@/lib/utils'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getBook } from '@/data/books'
import type { CrossReference, Note, StrongsEntry } from '@/types/db'
import type { ActiveTab } from '@/contexts/navigation'

const TABS: { id: ActiveTab; label: string; icon: typeof Crosshair }[] = [
  { id: 'crossrefs', label: 'Cross-Refs', icon: Crosshair },
  { id: 'notes', label: 'Notes', icon: MessageSquareMore },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'word', label: 'Word', icon: BookText },
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

type AiMode = 'context' | 'words' | 'theology' | 'application' | 'story' | 'custom'

const MOCK_RESPONSES: Record<AiMode, string> = {
  context: `**Immediate Context:** The surrounding verses establish this passage as a pivotal moment in the narrative arc. Verses immediately preceding set up a tension—a question, a conflict, or an expectation—that this passage resolves or intensifies. The author's flow moves from general principle to specific application, using this text as the hinge.\n\n**Book-Level Context:** This passage sits at a critical juncture in the book's overall argument. The author's purpose—whether theological instruction, historical record, or pastoral encouragement—shapes how every detail functions. The themes of covenant, faithfulness, and divine intervention recur throughout, and this passage develops them in a unique direction.\n\n**Historical & Cultural Setting:** Written in the first century AD, this passage reflects the socio-political realities of Roman occupation, Jewish religious expectations, and the early Christian community's struggle to define its identity. Key figures like Pharisees, Sadducees, and the common people all play roles that would have been immediately understood by the original audience.\n\n**Intertextual Connections:** This passage echoes several OT scriptures: it alludes to Isaiah 40 and Jeremiah 31, and directly quotes Psalm 110. The thematic connection to the Exodus narrative is unmistakable—what God did for Israel then, He is now doing through Christ. The author traces this thread from Genesis through Revelation, showing how this moment fulfills what was promised.`,

  words: `**Genre Analysis:** This passage belongs to the narrative genre with embedded poetic elements. As narrative, it uses characters, setting, and plot to convey theological truth. The genre shapes interpretation by inviting the reader to identify with the characters and experience the story's tension and resolution.\n\n**Literary Outline:** 1) Setup (vv. 1-3): introduces the scene and key characters; 2) Conflict (vv. 4-7): the central tension emerges through dialogue; 3) Climax (v. 8): the turning point where divine intervention occurs; 4) Resolution (vv. 9-11): the aftermath and response.\n\n**Literary Devices:** The passage employs an inclusio—the opening and closing phrases mirror each other, creating a frame. There's a chiasm in verses 4-7 (A-B-C-B'-A') that centers attention on the climactic statement. The metaphor of "light" and "darkness" runs throughout, drawing on OT wisdom traditions.\n\n**Lexical Analysis:**
• Greek word "λόγος" (logos) — Strong's G3056 — semantic range: word, reason, account, divine expression. Here in the nominative, it functions as the subject with theological weight, echoing Genesis 1 where God creates through speech.
• Hebrew word "דָּבָר" (davar) — Strong's H1697 — range: word, thing, matter, commandment. Its use here implies not just speech but active, creative power.
• The verb "ἐγένετο" (egeneto) — aorist middle deponent — indicates a definite historical event, grounding the theological claim in time and space.`,

  theology: `**Doctrine of God:** This passage reveals God's sovereignty and intimate involvement with creation. The self-existence of God is implied—He acts, He speaks, He initiates. The attribute of immutability (unchanging nature) underlies the consistency of His covenantal dealings.\n\n**Christology:** Central to this passage is the identity of Christ as the mediator between God and humanity. The incarnation is implied in the movement from divine purpose to human reality. Throughout church history, this text has been used to affirm the hypostatic union—Christ as fully God and fully man.\n\n**Soteriology:** The pattern of sin, judgment, and salvation emerges clearly. Human inability is contrasted with divine provision. Grace is the operative principle—unmerited favor that elicits faith as the appropriate response.\n\n**Church History Reception:** Augustine saw in this passage the irresistible nature of grace. Luther used it to argue for justification by faith alone. Calvin found here the doctrine of perseverance. Wesley emphasized the universal scope of the atonement. Each tradition highlights a different facet while remaining faithful to the text.\n\n**Theological Significance:** This passage makes its most significant contribution to our understanding of covenant theology—demonstrating that God's promises are both conditional and unconditional, requiring human response while ultimately depending on divine faithfulness.`,

  application: `**Ethical Principles:** The passage teaches several enduring principles: (1) Faithfulness in suffering—remaining true to God even when circumstances are difficult; (2) Community responsibility—bearing one another's burdens; (3) Truth-telling—speaking honestly even when costly.\n\n**Cultural-Specific vs. Transcultural:** The specific instructions about greetings and head coverings are culturally bound (first-century Mediterranean customs) and not directly transferable. However, the underlying principles of respect, cultural sensitivity, and orderly worship are transcultural and apply today.\n\n**Practical Application:**
• Personal: Examine areas where fear prevents faithful action. Start each day by acknowledging God's sovereignty over your circumstances.
• Relational: Practice active listening and empathetic presence with those who are suffering.
• Vocational: Bring integrity to your workplace—let your yes be yes and your no be no.\n\n**Reflection Questions:**
1. Where in my life am I hesitating to trust God's provision?
2. How can I bear someone else's burden this week?
3. What would it look like to live out this passage's teaching in my specific context?`,

  story: `The sun hung low over the dusty road leading out of Jericho, casting long shadows across the parched earth. The air smelled of spices and sheep, the sounds of the crowded city fading behind them. Jesus walked ahead, His pace purposeful, His disciples trailing in quiet confusion.\n\nThey had just heard Him speak of suffering and death—words that clashed violently with their expectations of glory and conquest. Peter had pulled Him aside, rebuking Him. And Jesus had turned, looking not with anger but with sorrow, saying, "Get behind me, Satan." The words hung in the air like thunder.\n\nNow they walked in silence. The road wound upward toward Jerusalem, and with every step, the tension grew. The city gleamed on the horizon, its temple catching the golden light. But for those who had ears to hear, the shadows seemed longer than they should be.\n\nIt was then that Jesus stopped. He turned to face them fully, and in that moment—with the wind stirring the dust at His feet and the city of David spread behind Him—He asked the question that would echo through eternity: "Who do you say that I am?"\n\nThe question wasn't academic. It was the hinge on which all of history turns. And standing there on that road, each disciple had to choose: was He teacher, prophet, or something—Someone—far greater?`,

  custom: `Running your custom analysis... Results will appear here based on your specific instructions.`,
}

interface AiModeDef {
  id: AiMode
  label: string
  description: string
  systemPrompt: string
}

const AI_MODES: AiModeDef[] = [
  {
    id: 'context',
    label: 'Context & Background',
    description: 'Context, history, cross-references',

    systemPrompt: `You are an expert in biblical exegesis. Analyze the passage thoroughly across four layers: (1) Immediate context — how the surrounding verses frame its meaning, the narrative or argumentative flow leading into and out of the text. (2) Book-level context — the author's purpose, the book's overarching themes, and how this passage contributes to them. (3) Historical and cultural setting — authorship, audience, date, societal norms, political and religious landscape, geographical details. (4) Intertextual connections — specific cross-references (cite verse numbers), quotations of or allusions to other Old or New Testament passages, and how the passage fits into the sweep of redemptive history from Genesis to Revelation. For each layer, explain why it matters for interpreting the passage. Be specific: name historical figures, quote relevant cross-references, and trace thematic developments across Testaments.`,
  },
  {
    id: 'words',
    label: 'Words & Structure',
    description: 'Genre, outline, original language',

    systemPrompt: `You are an expert in biblical literary analysis and biblical languages. Analyze the passage in two complementary dimensions. First, literary analysis: identify the genre (narrative, poetry, prophecy, epistle, wisdom, apocalyptic) and explain how genre shapes interpretation. Break the passage into a logical outline showing how each part contributes to the whole. Detect and explain literary devices — chiasms, parallelisms, inclusio, metaphors, similes, hyperbole, irony, merisms, and wordplay — describing their rhetorical effect. Second, lexical analysis: identify the key Greek, Hebrew, or Aramaic words behind the English translation. For each, provide the lemma, Strong's number, semantic range, grammatical features (tense, voice, mood for verbs; case, number, gender for nouns), and how the word functions in this specific context. Show how the word is used elsewhere in Scripture. Always tie word-level and literary insights back to the meaning and impact of the passage as a whole.`,
  },
  {
    id: 'theology',
    label: 'Theology & Doctrine',
    description: 'Doctrines, biblical themes, church tradition',

    systemPrompt: `You are an expert in biblical and systematic theology. Identify and explain the major doctrinal themes present in the passage — the nature and character of God, Christology, the work of the Holy Spirit, sin and salvation, humanity and the image of God, covenant, kingdom of God, grace, faith, judgment, and eschatology. Connect each theme to the broader biblical narrative, showing how this passage develops, affirms, or challenges what Scripture teaches on the subject. Then discuss how the passage has been understood throughout church history — cite key theologians (e.g., Augustine, Aquinas, Luther, Calvin, Wesley), ecumenical creeds, and confessional statements where relevant. Highlight areas of both interpretive consensus and significant divergence among traditions, explaining what theologically is at stake in each view. Conclude by summarizing the passage's most significant theological contribution.`,
  },
  {
    id: 'application',
    label: 'Modern Application',
    description: 'Ethics, contemporary living',

    systemPrompt: `You are an expert in biblical ethics and practical theology. Extract the ethical principles, commands, values, and virtues taught or implied in the passage. Carefully distinguish between cultural-specific instructions (bound to the original context and not directly transferable) and transcultural principles (applicable today), explaining your reasoning for each classification. For each transcultural principle, provide concrete, actionable guidance for contemporary life across multiple spheres — personal character and spirituality, relationships and family, work and vocation, church and community, and engagement with the broader culture. Include reflection questions that move the reader from understanding to personal transformation. Be specific and practical rather than abstract — give examples of what faithful application looks like in real-world situations today.`,
  },
  {
    id: 'story',
    label: 'Story Mode',
    description: 'Immersive biblical storytelling',

    systemPrompt: `You are a gifted biblical storyteller. Present the passage as a vivid, engaging narrative. Begin by setting the scene — include relevant geographical, cultural, and historical details so the world of the text feels immediate and real. Introduce the key characters with their backgrounds and motivations. Identify the dramatic tension or conflict that drives the narrative forward. Walk through the narrative arc — setup, rising action, climax, resolution — while remaining 100% faithful to Scripture; never contradict or embellish beyond what is written. Weave explanatory details (customs, geography, political dynamics, theological background) naturally into the story so they enrich rather than interrupt. Use sensory language and vivid description to make the scene come alive. End by connecting the passage to its role in the larger biblical story and suggesting what it reveals about God's character and purposes.`,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Write your own instruction',

    systemPrompt: '',
  },
]

function AiTab() {
  const { aiTarget } = useNavigation()
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('refbible-ai-key') ?? '')
  const saved = !!localStorage.getItem('refbible-ai-key')
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem('refbible-ai-demo') === 'true')
  const isOnline = useNetworkState()
  const [selectedMode, setSelectedMode] = useState<AiMode | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const responseRef = useRef('')
  const sentenceBufferRef = useRef('')
  const unlistenRef = useRef<(() => void)[]>([])
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    for (const u of unlistenRef.current) u()
    unlistenRef.current = []
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current)
      mockTimerRef.current = null
    }
  }, [])

  const startMockStream = useCallback((mode: AiMode) => {
    const fullText = MOCK_RESPONSES[mode] ?? MOCK_RESPONSES.context
    const words = fullText.split(/(\s+)/)
    let idx = 0
    const delay = 20

    mockTimerRef.current = setInterval(() => {
      if (idx >= words.length) {
        if (mockTimerRef.current) clearInterval(mockTimerRef.current)
        mockTimerRef.current = null
        setLoading(false)
        setStreaming(false)
        const leftover = sentenceBufferRef.current.trim()
        if (leftover) speakSentence(leftover)
        sentenceBufferRef.current = ''
        return
      }
      const word = words[idx++]
      responseRef.current += word
      setResponse(responseRef.current)

      sentenceBufferRef.current += word
      let match
      const sentenceEnd = /[.!?](?:\s|$)/
      while ((match = sentenceEnd.exec(sentenceBufferRef.current)) !== null) {
        const cs = sentenceBufferRef.current.slice(0, match.index + 1)
        sentenceBufferRef.current = sentenceBufferRef.current.slice(match.index + 1).trimStart()
        speakSentence(cs)
      }
    }, delay)
  }, [speakSentence])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const speakSentence = useCallback((sentence: string) => {
    const utterance = new SpeechSynthesisUtterance(sentence)
    utterance.rate = 0.9
    utterance.onend = () => {
      if (speechSynthesis.speaking === false) {
        setAiSpeaking(false)
      }
    }
    utterance.onerror = () => setAiSpeaking(false)
    speechSynthesis.speak(utterance)
    setAiSpeaking(true)
  }, [])

  const stopAiSpeech = useCallback(() => {
    speechSynthesis.cancel()
    setAiSpeaking(false)
  }, [])

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
    if (!aiTarget) return
    if (!demoMode && !apiKey) return
    const mode = AI_MODES.find((m) => m.id === (selectedMode ?? 'context'))
    if (!mode) return
    setLoading(true)
    setStreaming(true)
    setError(null)
    setResponse('')
    responseRef.current = ''
    sentenceBufferRef.current = ''
    stopAiSpeech()
    cleanup()

    if (demoMode) {
      startMockStream(selectedMode ?? 'context')
      return
    }

    const systemPrompt = mode.systemPrompt
    const combinedPrompt = customPrompt.trim()
      ? `${systemPrompt}\n\nExtra instructions from user:\n${customPrompt}\n\nVerse: ${aiTarget.reference}\n\n${aiTarget.text}`
      : `${systemPrompt}\n\nVerse: ${aiTarget.reference}\n\n${aiTarget.text}`

    try {
      const unlistenToken = await listen<string>('ai:token', (event) => {
        const token = event.payload
        responseRef.current += token
        setResponse(responseRef.current)

        sentenceBufferRef.current += token
        let match
        const sentenceEnd = /[.!?](?:\s|$)/
        while ((match = sentenceEnd.exec(sentenceBufferRef.current)) !== null) {
          const completedSentence = sentenceBufferRef.current.slice(0, match.index + 1)
          sentenceBufferRef.current = sentenceBufferRef.current.slice(match.index + 1).trimStart()
          speakSentence(completedSentence)
        }
      })
      unlistenRef.current.push(unlistenToken)

      const unlistenDone = await listen('ai:done', () => {
        if (sentenceBufferRef.current.trim()) {
          speakSentence(sentenceBufferRef.current.trim())
          sentenceBufferRef.current = ''
        }
        setLoading(false)
        setStreaming(false)
      })
      unlistenRef.current.push(unlistenDone)

      await invoke('ai_query_stream', { apiKey, prompt: combinedPrompt })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
      setStreaming(false)
    }
  }

  if (!isOnline && !demoMode) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <WifiOff size={24} className="text-text-tertiary" />
        <p className="text-sm text-text-secondary font-medium">You are offline</p>
        <p className="text-xs text-text-tertiary">AI analysis requires an internet connection.</p>
      </div>
    )
  }

  if (!saved && !demoMode) {
    const selectedModeLabel = selectedMode ? AI_MODES.find((m) => m.id === selectedMode)?.label : null
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} />
            Pick an Analysis Mode
          </h3>
            <div className="flex flex-col gap-1.5">
            {AI_MODES.filter((m) => m.id !== 'custom').map((mode) => (
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
          {selectedMode ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-accent/10 border border-accent/20">
              <Sparkles size={14} className="shrink-0 mt-0.5 text-accent" />
              <p className="text-xs text-text-primary leading-relaxed">
                You picked <strong className="text-accent">{selectedModeLabel}</strong>. Enter your API key below and click <strong>Activate AI</strong> to start analyzing verses.
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary mt-1">
              Choose a mode above, then enter your API key to get started.
            </p>
          )}
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

          <hr className="border-border" />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-text-tertiary" />
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">No API Key?</h3>
            </div>
            <button
              type="button"
              onClick={() => { setDemoMode(true); localStorage.setItem('refbible-ai-demo', 'true') }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border-2 border-dashed border-accent/50 text-accent hover:bg-accent/5 hover:border-accent transition-all duration-150 cursor-pointer"
            >
              <Sparkles size={14} />
              Try Demo Mode
            </button>
            <p className="text-xs text-text-tertiary flex items-start gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              Simulated responses to test the full UI — no API key needed.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-secondary">{demoMode ? 'Demo Mode' : 'AI activated'}</span>
        <div className="flex items-center gap-2">
          {demoMode && (
            <button
              type="button"
              onClick={() => { setDemoMode(false); localStorage.removeItem('refbible-ai-demo') }}
              className="text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
            >
              Use API Key
            </button>
          )}
          {!demoMode && (
            <button type="button" onClick={handleClear} className="text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer">
              Revoke
            </button>
          )}
        </div>
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
          <div className="flex flex-col gap-1.5">
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
                {streaming ? 'Receiving response…' : 'Analyzing…'}
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Result</p>
                <div className="flex items-center gap-1">
                  {aiSpeaking ? (
                    <button
                      type="button"
                      onClick={stopAiSpeech}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all duration-150 cursor-pointer"
                    >
                      <VolumeX size={12} />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => speakSentence(responseRef.current)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-150 cursor-pointer"
                    >
                      <Volume2 size={12} />
                      Listen
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{response}</div>
              {streaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-accent animate-pulse rounded-sm" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WordTab() {
  const { wordTarget, setAiTarget, setStudyTab } = useNavigation()
  const [strongs, setStrongs] = useState<StrongsEntry | null>(null)

  useEffect(() => {
    if (!wordTarget) return
    getStrongsEntry(wordTarget.word.strongs_number ?? '').then((entry) => {
      setStrongs(entry)
    })
  }, [wordTarget])

  const handleAskAi = useCallback(() => {
    if (!wordTarget) return
    const w = wordTarget.word
    const langLabel = w.language === 'hebrew' ? 'Hebrew' : 'Greek'
    setAiTarget({
      verseId: wordTarget.verseId,
      bookId: 0,
      chapter: 0,
      verseNum: 0,
      reference: wordTarget.reference,
      text: `Analyze the ${langLabel} word "${w.original_text}" (Strong's ${w.strongs_number ?? 'N/A'}, lemma: ${w.lemma ?? 'N/A'}) in ${wordTarget.reference}. Provide lexical meaning, grammatical analysis, usage in context, and theological significance.`,
    })
    setStudyTab('ai')
  }, [wordTarget, setAiTarget, setStudyTab])

  if (!wordTarget) {
    return <p className="text-xs text-text-tertiary px-1 py-4 text-center">Tap a word to see its details here.</p>
  }

  const w = wordTarget.word
  const isHebrew = w.language === 'hebrew'
  const fontStack = isHebrew ? 'font-hebrew' : 'font-greek'
  const langLabel = isHebrew ? 'Hebrew' : 'Greek'

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-4 px-3 rounded-xl bg-surface-elevated border border-border-subtle">
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{langLabel}</span>
        <span className={`${fontStack} text-2xl text-accent leading-tight`} dir={isHebrew ? 'rtl' : 'ltr'}>
          {w.original_text}
        </span>
        {w.transliteration && (
          <span className="text-sm text-text-tertiary italic mt-1">{w.transliteration}</span>
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

      <button
        type="button"
        onClick={handleAskAi}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150 cursor-pointer"
      >
        <Sparkles size={14} />
        Ask AI about this word
      </button>
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
        {studyTab === 'ai' && <AiTab />}
        {studyTab === 'word' && <WordTab />}
      </div>
    </div>
  )
}
