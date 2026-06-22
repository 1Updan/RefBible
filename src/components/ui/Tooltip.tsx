import { useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

interface TooltipProps {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearTimers()
    showTimer.current = setTimeout(() => {
      setVisible(true)
      hideTimer.current = setTimeout(() => setVisible(false), 1500)
    }, 500)
  }, [clearTimers])

  const handleMouseLeave = useCallback(() => {
    clearTimers()
    setVisible(false)
  }, [clearTimers])

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      <div
        className={clsx(
          'absolute top-full mt-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 transition-opacity duration-150',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        <div className="px-2 py-1 text-[11px] font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-md whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  )
}

