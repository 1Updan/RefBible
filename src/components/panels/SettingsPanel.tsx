import { useState } from 'react'
import { useRef } from 'react'
import { Sun, Moon, BookMarked, Download, Trash2, CheckCircle, ChevronDown, ChevronRight, BookText, Cloud, FileUp, Sparkles } from 'lucide-react'
import { AiConfigPanel } from './AiConfigPanel'
import clsx from 'clsx'
import type { Theme } from '@/contexts/theme'
import { removeTranslation, exportBackupData, importBackupData } from '@/lib/db'
import { downloadAndInstall } from '@/lib/downloader'
import { getVersionsByLanguage, VERSIONS } from '@/lib/versions'
import type { VersionMeta } from '@/lib/versions'
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
  onVotdNavigate: () => void
  installedVersions: string[]
  onRefreshInstalled: () => void
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
  onVotdNavigate,
  installedVersions,
  onRefreshInstalled,
}: SettingsPanelProps) {
  const [openTranslations, toggleTranslations] = useSectionState('translations')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const installed = new Set(installedVersions)

  const handleDownload = async (code: string) => {
    setDownloading(code)
    setError(null)
    try {
      await downloadAndInstall(code)
      await onRefreshInstalled()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (code: string) => {
    await removeTranslation(code)
    await onRefreshInstalled()
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

          <div className="space-y-0.5">
            {byLang.size > 0
              ? [...byLang.values()].flat().map((v) => (
                  <VersionRow
                    key={v.code}
                    version={v}
                    installed={installed.has(v.code)}
                    downloading={downloading === v.code}
                    onDownload={() => handleDownload(v.code)}
                    onDelete={() => handleDelete(v.code)}
                  />
                ))
              : VERSIONS.map((v) => (
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
          </>)}
        </section>

        <BackupSection />

        <AiSetupSection />

        <DataSourcesSection />
      </div>
    </div>
  )
}

function AiSetupSection() {
  const [openAi, toggleAi] = useSectionState('ai-setup')
  return (
    <section>
      <button
        type="button"
        onClick={toggleAi}
        className="w-full flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 cursor-pointer"
      >
        {openAi ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Sparkles size={13} />
        AI Setup
      </button>

      {openAi && (
        <div className="rounded-xl border border-border-subtle overflow-hidden">
          <AiConfigPanel
            isFirstRun={false}
            onBack={toggleAi}
            onComplete={toggleAi}
          />
        </div>
      )}
    </section>
  )
}

function DataSourcesSection() {
  const [openSources, toggleSources] = useSectionState('datasources')
  return (
    <section>
      <button
        type="button"
        onClick={toggleSources}
        className="w-full flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 cursor-pointer"
      >
        {openSources ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Data Sources
      </button>

      {openSources && (
        <div className="space-y-2 px-1">
          <p className="text-xs text-text-secondary leading-relaxed">
            Cross-references courtesy of{' '}
            <a
              href="https://www.openbible.info/labs/cross-references/"
              target="_blank"
              rel="noopener"
              className="text-accent hover:text-accent-hover font-medium"
            >
              OpenBible.info
            </a>{' '}
            (CC-BY 4.0), based on the public-domain Treasury of Scripture Knowledge.
          </p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            Bible text: King James Version (public domain) and New American Standard Bible (fair use).
          </p>
        </div>
      )}
    </section>
  )
}

function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [openBackup, toggleBackup] = useSectionState('backup')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      const data = await exportBackupData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().slice(0, 10)
      a.download = `refbible-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
      setTimeout(() => setImportError(null), 5000)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    setImportStatus(null)
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.bookmarks || !data.notes || !data.highlights) {
        setImportError('Invalid backup file — missing required data.')
        return
      }
      if (!confirm('This will replace all your current bookmarks, notes, highlights, and custom cross-references with the imported data. Continue?')) {
        return
      }
      await importBackupData(data)
      setImportStatus('Data imported successfully. Reload the app to see changes.')
      setTimeout(() => setImportStatus(null), 6000)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Invalid backup file.')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <section>
      <button
        type="button"
        onClick={toggleBackup}
        className="w-full flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 cursor-pointer"
      >
        {openBackup ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Cloud size={13} />
        Backup & Restore
      </button>

      {openBackup && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150 cursor-pointer"
          >
            <Cloud size={14} />
            Export Backup
          </button>
          <p className="text-xs text-text-tertiary text-center">
            Downloads a JSON file with your bookmarks, notes, highlights, and custom cross-references.
          </p>

          <hr className="border-border-subtle" />

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover transition-all duration-150 cursor-pointer"
          >
            <FileUp size={14} />
            Import Backup
          </button>
          <p className="text-xs text-text-tertiary text-center">
            Select a previously exported backup file to restore your data. This will replace all existing bookmarks, notes, highlights, and custom cross-references.
          </p>

          {importStatus && (
            <div className="px-3 py-2 rounded-lg bg-success/10 border border-success/30">
              <p className="text-xs text-success">{importStatus}</p>
            </div>
          )}
          {importError && (
            <div className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30">
              <p className="text-xs text-danger">{importError}</p>
            </div>
          )}
        </div>
      )}
    </section>
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
