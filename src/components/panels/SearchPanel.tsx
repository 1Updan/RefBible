import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Download, Trash2, CheckCircle, ChevronDown, ChevronRight, Globe, X } from 'lucide-react'
import { searchVerses, getInstalledTranslations, removeTranslation } from '@/lib/db'
import type { SearchResult } from '@/lib/db'
import { downloadAndInstall } from '@/lib/downloader'
import { getVersionsByLanguage } from '@/lib/versions'
import type { VersionMeta } from '@/lib/versions'
import { getBook } from '@/data/books'

interface SearchPanelProps {
  onNavigate?: (bookId: number, chapter: number) => void
}

export function SearchPanel({ onNavigate }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const r = await searchVerses(q.trim())
      setResults(r)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">Search</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search verses…"
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors duration-150 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {searching && (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] text-text-tertiary font-medium px-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
              {results.map((r) => {
                const book = getBook(r.book_id)
                return (
                  <button
                    key={`${r.verse_id}-${r.translation_code}`}
                    type="button"
                    onClick={() => onNavigate?.(r.book_id, r.chapter_num)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle hover:bg-surface-hover transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-accent">
                        {book?.name ?? 'Unknown'} {r.chapter_num}:{r.verse_num}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase text-text-tertiary bg-surface rounded border border-border-subtle">
                        {r.translation_code}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{r.text_data}</p>
                  </button>
                )
              })}
            </div>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-8">No results found</p>
          )}

          {!searching && query.trim().length < 2 && (
            <p className="text-xs text-text-tertiary text-center py-8">Type at least 2 characters to search</p>
          )}
        </section>

        <TranslationsSection />
      </div>
    </div>
  )
}

function TranslationsSection() {
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
    <>
      <hr className="border-border" />
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Globe size={13} />
          Browse Translations
        </h3>

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
    </>
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
