import { useEffect, useState } from 'react'
import { Crosshair, MessageSquareMore, Sparkles } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { getCrossReferences, getTranslations } from '@/lib/db'
import { formatVerseId } from '@/lib/utils'
import type { CrossReference } from '@/types/db'
import type { ActiveTab } from '@/contexts/NavigationContext'

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
          map.set(x.target_verse_id, first.text_data.slice(0, 100) + (first.text_data.length > 100 ? '…' : ''))
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
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">{preview}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}

function NotesTab() {
  const { noteVerseId, openNote } = useNavigation()
  const [text, setText] = useState('')

  return (
    <div className="space-y-3">
      {noteVerseId ? (
        <>
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
              onClick={() => { /* TODO: save note */ }}
              disabled={!text.trim()}
              className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              Save Note
            </button>
            <button
              type="button"
              onClick={() => openNote('')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-tertiary px-1 py-4 text-center">
          Tap the note icon on any verse to write a note
        </p>
      )}
    </div>
  )
}

function AiTab() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('refbible-ai-key') ?? '')
  const saved = !!localStorage.getItem('refbible-ai-key')

  const handleSave = () => {
    localStorage.setItem('refbible-ai-key', apiKey)
    window.location.reload()
  }

  const handleClear = () => {
    localStorage.removeItem('refbible-ai-key')
    setApiKey('')
    window.location.reload()
  }

  if (!saved) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          Enter your Google AI Studio API key to enable AI-powered commentary.
          Your key stays on this device.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API key"
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
      <p className="text-xs text-text-tertiary">
        Select a verse and use the context menu to get AI commentary.
      </p>
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
