import { useCallback, useState } from 'react'

interface Preferences {
  fontSize: number
  visibleVersions: string[]
}

const STORAGE_KEY = 'refbible-prefs'

function loadPrefs(): Preferences {
  if (typeof window === 'undefined') {
    return { fontSize: 19, visibleVersions: ['KJV', 'NASB'] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (Array.isArray(parsed.visibleVersions) && parsed.visibleVersions.length > 0) {
        return { fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 19, visibleVersions: parsed.visibleVersions as string[] }
      }
    }
  } catch {
    // ignore parse errors
  }
  localStorage.removeItem(STORAGE_KEY)
  return { fontSize: 19, visibleVersions: ['KJV', 'NASB'] }
}

function savePrefs(prefs: Preferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function useReadingPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs)

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const toggleVersion = useCallback((code: string) => {
    setPrefs((prev) => {
      const set = new Set(prev.visibleVersions)
      if (set.has(code)) {
        if (set.size <= 1) return prev
        set.delete(code)
      } else {
        set.add(code)
      }
      const next = { ...prev, visibleVersions: [...set].sort() }
      savePrefs(next)
      return next
    })
  }, [])

  return { prefs, update, toggleVersion }
}
