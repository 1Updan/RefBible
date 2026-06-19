import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext } from './theme'
import type { Theme } from './theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('refbible-theme') as Theme) || 'light'
    }
    return 'light'
  })

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('refbible-theme', t)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
