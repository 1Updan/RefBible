import { useEffect, useState } from 'react'
import { Sun, Moon, BookMarked, Download, Trash2, CheckCircle, ChevronDown, ChevronRight, Globe } from 'lucide-react'
import clsx from 'clsx'
import type { Theme } from '@/contexts/ThemeContext'
import { getInstalledTranslations, removeTranslation } from '@/lib/db'
import { downloadAndInstall } from '@/lib/downloader'
import { getVersionsByLanguage } from '@/lib/versions'
import type { VersionMeta } from '@/lib/versions'

interface SettingsPanelProps {
  theme: Theme
  onChangeTheme: (t: Theme) => void
  fontSize: number
  onChangeFontSize: (px: number) => void
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'sepia', label: 'Sepia', icon: BookMarked },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function SettingsPanel({ theme, onChangeTheme, fontSize, onChangeFontSize }: SettingsPanelProps) {
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(new Set(['English']))

  useEffect(() => {
    getInstalledTranslations().then((codes) => setInstalled(new Set(codes)))
  }, [])

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
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
      </div>
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">Translations</h3>

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
