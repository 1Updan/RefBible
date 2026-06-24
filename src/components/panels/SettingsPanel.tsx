import { useEffect, useState } from 'react'
import { Sun, Moon, BookMarked, Download, Trash2, CheckCircle, ChevronDown, ChevronRight, Globe, BookText, Volume2 } from 'lucide-react'
import clsx from 'clsx'
import type { Theme } from '@/contexts/theme'
import { getInstalledTranslations, removeTranslation } from '@/lib/db'
import { downloadAndInstall } from '@/lib/downloader'
import { getVersionsByLanguage } from '@/lib/versions'
import type { VersionMeta } from '@/lib/versions'
import type { SpeechVoice } from '@/hooks/useSpeech'
import { getTodaysVerse } from '@/lib/verseOfTheDay'

interface SettingsPanelProps {
  theme: Theme
  onChangeTheme: (t: Theme) => void
  fontSize: number
  onChangeFontSize: (px: number) => void
  interlinearEnabled: boolean
  interlinearLanguages: ('hebrew' | 'greek')[]
  onToggleInterlinear: () => void
  onSetInterlinearLanguages: (langs: ('hebrew' | 'greek')[]) => void
  voices: SpeechVoice[]
  selectedVoiceUri: string
  onChangeVoice: (uri: string) => void
  onVotdNavigate: () => void
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'sepia', label: 'Sepia', icon: BookMarked },
  { value: 'dark', label: 'Dark', icon: Moon },
]

function useSectionState(key: string, defaultOpen = false): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(`refbible:section:${key}`)
      return saved !== null ? JSON.parse(saved) : defaultOpen
    } catch {
      return defaultOpen
    }
  })
  const toggle = () => {
    setOpen((v: boolean) => {
      const next = !v
      localStorage.setItem(`refbible:section:${key}`, JSON.stringify(next))
      return next
    })
  }
  return [open, toggle]
}

export function SettingsPanel({
  theme,
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  interlinearEnabled,
  interlinearLanguages,
  onToggleInterlinear,
  onSetInterlinearLanguages,
  voices,
  selectedVoiceUri,
  onChangeVoice,
  onVotdNavigate,
}: SettingsPanelProps) {
  const [openTranslations, toggleTranslations] = useSectionState('translations')
  const [openAudio, toggleAudio] = useSectionState('audio')
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('refbible:expanded-langs')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  useEffect(() => {
    getInstalledTranslations().then((codes) => setInstalled(new Set(codes)))
  }, [])

  useEffect(() => {
    localStorage.setItem('refbible:expanded-langs', JSON.stringify([...expandedLangs]))
  }, [expandedLangs])

  const refreshInstalled = async () => {
    const codes = await getInstalledTranslations()
    setInstalled(new Set(codes))
  }

  const handleDownload = async (code: string) => {
    setDownloading(code)
    setError(null)
    try {
      await downloadAndInstall(code)
      await refreshInstalled()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (code: string) => {
    await removeTranslation(code)
    await refreshInstalled()
  }

  const toggleLang = (name: string) => {
    setExpandedLangs((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const byLang = getVersionsByLanguage()

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">Color Mode</h3>
          <div className="flex gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChangeTheme(value)}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer',
                  theme === value
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle',
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">Font Size</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">A</span>
            <input
              type="range"
              min={14}
              max={24}
              step={1}
              value={fontSize}
              onChange={(e) => onChangeFontSize(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none bg-border cursor-pointer accent-accent
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-sm
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-base text-text-secondary font-semibold">A</span>
          </div>
          <p className="text-xs text-text-tertiary text-center mt-1">{fontSize}px</p>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">Verse of the Day</h3>
          <div
            onClick={onVotdNavigate}
            className="px-3 py-2.5 rounded-xl cursor-pointer bg-accent/10 hover:bg-accent/15 transition-colors duration-150 border border-accent/20"
          >
            <div className="font-semibold text-accent text-xs">{getTodaysVerse().reference}</div>
            <p className="text-text-secondary text-xs mt-1 leading-relaxed line-clamp-2">{getTodaysVerse().text}</p>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <BookText size={13} />
            Interlinear Bible
          </h3>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle">
              <span className="text-sm text-text-primary">Show Interlinear</span>
              <button
                type="button"
                onClick={onToggleInterlinear}
                className={clsx(
                  'relative w-10 h-5 rounded-full transition-all duration-200 cursor-pointer',
                  interlinearEnabled ? 'bg-accent' : 'bg-border',
                )}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                    interlinearEnabled ? 'left-5' : 'left-0.5',
                  )}
                />
              </button>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors duration-150 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interlinearLanguages.includes('hebrew')}
                  onChange={(e) => {
                    const next: ('hebrew' | 'greek')[] = e.target.checked
                      ? [...interlinearLanguages, 'hebrew']
                      : interlinearLanguages.filter((l) => l !== 'hebrew')
                    onSetInterlinearLanguages(next.length > 0 ? next : ['hebrew'])
                  }}
                  className="accent-accent cursor-pointer"
                />
                <span className="text-sm text-text-primary">Hebrew (OT)</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors duration-150 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interlinearLanguages.includes('greek')}
                  onChange={(e) => {
                    const next: ('hebrew' | 'greek')[] = e.target.checked
                      ? [...interlinearLanguages, 'greek']
                      : interlinearLanguages.filter((l) => l !== 'greek')
                    onSetInterlinearLanguages(next.length > 0 ? next : ['greek'])
                  }}
                  className="accent-accent cursor-pointer"
                />
                <span className="text-sm text-text-primary">Greek (NT)</span>
              </label>
            </div>

        </section>

        <section>
          <button
            type="button"
            onClick={toggleTranslations}
            className="w-full flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 cursor-pointer"
          >
            {openTranslations ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Translations
          </button>

          {openTranslations && (<>
          {error && (
            <p className="text-xs text-danger mb-3 px-1">{error}</p>
          )}

          <div className="space-y-1">
            {[...byLang.entries()].map(([langName, versions]) => {
              const open = expandedLangs.has(langName)
              return (
                <div key={langName}>
                  <button
                    type="button"
                    onClick={() => toggleLang(langName)}
                    className="w-full flex items-center gap-1.5 px-2 py-2 text-xs font-bold text-accent uppercase tracking-widest hover:text-accent-hover transition-colors duration-150 cursor-pointer border-b border-border-subtle"
                  >
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Globe size={13} />
                    {langName}
                  </button>
                  {open && (
                    <div className="space-y-0.5 pt-1">
                      {versions.map((v) => (
                        <VersionRow
                          key={v.code}
                          version={v}
                          installed={installed.has(v.code)}
                          downloading={downloading === v.code}
                          onDownload={() => handleDownload(v.code)}
                          onDelete={() => handleDelete(v.code)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </>)}
        </section>

        <section>
          <button
            type="button"
            onClick={toggleAudio}
            className="w-full flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 cursor-pointer"
          >
            {openAudio ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Volume2 size={13} />
            Audio
          </button>

          {openAudio && (<>
          <div className="space-y-1.5">
            {voices.length === 0 ? (
              <p className="text-xs text-text-tertiary px-1">No voices available. Install a text-to-speech voice in your system settings.</p>
            ) : (
              voices.map((v) => (
                <button
                  key={v.uri}
                  type="button"
                  onClick={() => onChangeVoice(v.uri)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150 cursor-pointer',
                    selectedVoiceUri === v.uri
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                >
                  <Volume2 size={14} className={clsx(selectedVoiceUri === v.uri ? 'text-accent' : 'text-text-tertiary')} />
                  <div className="min-w-0">
                    <span className="block truncate">{v.name}</span>
                    <span className="text-[10px] text-text-tertiary">{v.lang}</span>
                  </div>
                </button>
              ))
            )}
          </div>
          </>)}
        </section>
      </div>
    </div>
  )
}

function VersionRow({
  version,
  installed,
  downloading,
  onDownload,
  onDelete,
}: {
  version: VersionMeta
  installed: boolean
  downloading: boolean
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors duration-150">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary truncate">{version.name}</span>
          {installed && <CheckCircle size={12} className="text-accent shrink-0" />}
        </div>
        <span className="text-[10px] text-text-tertiary font-mono uppercase">{version.code}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {version.builtIn ? (
          <span className="px-2 py-0.5 text-[10px] font-medium text-text-tertiary bg-surface-elevated rounded-full border border-border-subtle">
            Built-in
          </span>
        ) : installed ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 rounded-lg transition-all duration-150 cursor-pointer"
          >
            <Trash2 size={13} />
            Delete
          </button>
        ) : (
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={13} />
            )}
            {downloading ? 'Downloading…' : 'Download'}
          </button>
        )}
      </div>
    </div>
  )
}
