import type { InterlinearWord } from '@/types/db'

interface InterlinearViewProps {
  verseId: string
  words: InterlinearWord[]
  reference: string
  fontSize: number
  interlinearLanguages: readonly ('hebrew' | 'greek')[]
  onSelectWord: (word: InterlinearWord, verseId: string, reference: string) => void
}

export function InterlinearView({ verseId, words, reference, fontSize, interlinearLanguages, onSelectWord }: InterlinearViewProps) {
  const filteredWords = words.filter((w) => interlinearLanguages.includes(w.language))

  if (filteredWords.length === 0) {
    return <p className="text-xs text-text-tertiary italic px-1">No original language data for this verse.</p>
  }

  const hebrewWords = filteredWords.filter((w) => w.language === 'hebrew')
  const greekWords = filteredWords.filter((w) => w.language === 'greek')

  return (
    <div className="space-y-2">
      {hebrewWords.length > 0 && renderWordRow(hebrewWords, 'hebrew', fontSize, verseId, reference, onSelectWord)}
      {greekWords.length > 0 && renderWordRow(greekWords, 'greek', fontSize, verseId, reference, onSelectWord)}
    </div>
  )
}

function renderWordRow(
  words: InterlinearWord[],
  language: string,
  fontSize: number,
  verseId: string,
  reference: string,
  onSelectWord: (word: InterlinearWord, verseId: string, reference: string) => void,
) {
  const originalSize = language === 'hebrew' ? fontSize + 2 : fontSize
  const fontStack = language === 'hebrew'
    ? 'font-hebrew'
    : 'font-greek'

  return (
    <div className="flex flex-wrap gap-1">
      {words.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onSelectWord(w, verseId, reference)}
          className="flex flex-col items-center px-2 py-1 rounded-xl bg-surface hover:bg-surface-hover active:scale-[0.97] transition-all duration-150 cursor-pointer text-center min-w-[44px] max-w-[160px] touch-manipulation"
        >
          <span
            className={`${fontStack} leading-tight text-accent font-medium`}
            style={{ fontSize: `${originalSize}px` }}
            dir={language === 'hebrew' ? 'rtl' : 'ltr'}
          >
            {w.original_text}
          </span>
          {w.transliteration && (
            <span className="text-text-tertiary italic leading-tight" style={{ fontSize: `${Math.max(fontSize - 5, 11)}px` }}>
              {w.transliteration}
            </span>
          )}
          {w.gloss && (
            <span className="text-text-secondary leading-snug" style={{ fontSize: `${Math.max(fontSize - 6, 10)}px` }}>
              {w.gloss}
            </span>
          )}
          {w.strongs_number && (
            <span className="text-accent/45 font-mono leading-tight tracking-tight" style={{ fontSize: '10px' }}>
              {w.strongs_number}
            </span>
          )}
          {w.morphology && (
            <span className="text-text-tertiary/70 font-mono leading-tight tracking-tight" style={{ fontSize: '10px' }}>
              {w.morphology}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
