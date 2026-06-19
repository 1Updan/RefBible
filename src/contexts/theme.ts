import { createContext } from 'react'

export type Theme = 'light' | 'sepia' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
})
