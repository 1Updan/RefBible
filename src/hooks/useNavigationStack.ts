import { useCallback, useState } from 'react'

export interface NavEntry {
  verseId: string
  bookId: number
  chapter: number
  scrollOffset: number
  timestamp: number
}

export function useNavigationStack() {
  const [stack, setStack] = useState<NavEntry[]>([])

  const push = useCallback((entry: NavEntry) => {
    setStack((prev) => [...prev, entry].slice(-50))
  }, [])

  const pop = useCallback(() => {
    let popped: NavEntry | null = null
    setStack((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      popped = next.pop() ?? null
      return next
    })
    return popped
  }, [])

  const peek = useCallback(() => {
    return stack.length > 0 ? stack[stack.length - 1] : null
  }, [stack])

  const clear = useCallback(() => setStack([]), [])

  return { stack, push, pop, peek, clear }
}
