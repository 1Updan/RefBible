import { useCallback, useState } from 'react'

interface Preferences {
  fontSize: number
  showKJV: boolean
  showNASB: boolean
}

const STORAGE_KEY = 'refbible-prefs'

function loadPrefs(): Preferences {
  if (typeof window === 'undefined') {
    return { fontSize: 19, showKJV: true, showNASB: true }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Preferences
  } catch {
    // ignore parse errors
  }
  return { fontSize: 19, showKJV: true, showNASB: true }
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

  return { prefs, update }
}
