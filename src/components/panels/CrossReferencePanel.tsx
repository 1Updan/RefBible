import { useEffect, useState } from 'react'
import { ArrowRight, Crosshair, X } from 'lucide-react'
import { getCrossReferences, getTranslations } from '@/lib/db'
import { useNavigation } from '@/hooks/useNavigation'
import { formatVerseId } from '@/lib/utils'
import type { CrossReference } from '@/types/db'

interface TargetPreview {
  verseId: string
  text: string
  reference: string
}

export function CrossReferencePanel() {
  const { crossRefTarget, setActivePanel, navigateTo, bookId } = useNavigation()
  const [xrefs, setXrefs] = useState<CrossReference[]>([])
  const [previews, setPreviews] = useState<Map<string, TargetPreview>>(new Map())

  useEffect(() => {
    if (!crossRefTarget) return
    const verseId: string = crossRefTarget.verseId
    let cancelled = false
    async function load() {
      const refs = await getCrossReferences(verseId)
      if (cancelled) return
      setXrefs(refs)

      const map = new Map<string, TargetPreview>()
      const batch = refs.map(async (x) => {
        const texts = await getTranslations(x.target_verse_id)
        const first = texts.find((t) => t.translation_code === 'KJV') ?? texts[0]
        if (first) {
          map.set(x.target_verse_id, {
            verseId: x.target_verse_id,
            text: first.text_data.slice(0, 120) + (first.text_data.length > 120 ? '…' : ''),
            reference: formatVerseId(x.target_verse_id),
          })
        }
      })
      await Promise.all(batch)
      if (!cancelled) setPreviews(map)
    }
    load()
    return () => { cancelled = true }
  }, [crossRefTarget])

  const handleNavigate = (targetVerseId: string) => {
    if (!crossRefTarget) return
    const parts = targetVerseId.split('.')
    if (parts.length >= 3) {
      const ch = Number(parts[1])
      navigateTo(bookId, ch, targetVerseId)
    }
  }

  if (!crossRefTarget) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Crosshair size={24} className="text-text-tertiary mb-3" />
        <p className="text-sm text-text-tertiary">Select a verse to see cross references</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-accent shrink-0" />
          <span className="text-sm font-semibold text-text-primary">Cross References</span>
        </div>
        <button
          type="button"
          onClick={() => setActivePanel('none')}
          className="p-1 rounded-md hover:bg-surface text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-xs text-text-secondary px-1 pb-1">
          For <span className="font-semibold text-text-primary">{crossRefTarget.reference}</span>
        </div>
        {xrefs.length === 0 && (
          <p className="text-xs text-text-tertiary px-1">No cross references available.</p>
        )}
        {xrefs.map((xref) => {
          const preview = previews.get(xref.target_verse_id)
          return (
            <button
              key={xref.id}
              type="button"
              onClick={() => handleNavigate(xref.target_verse_id)}
              className="w-full text-left p-3 rounded-lg bg-surface-elevated border border-border-subtle hover:bg-surface transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-accent">{preview?.reference ?? formatVerseId(xref.target_verse_id)}</span>
                <ArrowRight size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              </div>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                {preview?.text ?? 'Loading…'}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
