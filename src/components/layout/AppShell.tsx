import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'

interface DesktopShellProps {
  nav: ReactNode
  reading: ReactNode
  sidebar: ReactNode
  onCloseSidebar?: () => void
}

export function DesktopShell({ nav, reading, sidebar, onCloseSidebar }: DesktopShellProps) {
  const [navOpen, setNavOpen] = useState(true)
  const [navWidth, setNavWidth] = useState(240)
  const [sidebarWidth, setSidebarWidth] = useState(340)
  const [resizing, setResizing] = useState<'nav' | 'sidebar' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startW = useRef(0)

  const handleResizeStart = useCallback((side: 'nav' | 'sidebar') => (e: React.MouseEvent) => {
    e.preventDefault()
    startX.current = e.clientX
    startW.current = side === 'nav' ? navWidth : sidebarWidth
    setResizing(side)
  }, [navWidth, sidebarWidth])

  useEffect(() => {
    if (!resizing) return
    const handleMouseMove = (e: MouseEvent) => {
      if (resizing === 'nav') {
        setNavWidth(Math.max(160, Math.min(400, startW.current + e.clientX - startX.current)))
      } else {
        setSidebarWidth(Math.max(240, Math.min(500, startW.current - (e.clientX - startX.current))))
      }
    }
    const handleMouseUp = () => setResizing(null)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing])

  const gridCols = navOpen ? [`${navWidth}px`, '1fr'] : ['1fr']
  if (sidebar) gridCols.push(`${sidebarWidth}px`)

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] grid overflow-hidden bg-bg relative"
      style={{ gridTemplateColumns: gridCols.join(' ') }}
    >
      {navOpen && (
        <aside className="border-r border-border bg-surface overflow-hidden flex flex-col relative">
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="absolute top-3 right-2 z-30 p-1 rounded-md bg-surface border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all duration-150 cursor-pointer shadow-sm"
            aria-label="Collapse nav sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
          {nav}
        </aside>
      )}

      <main className="overflow-hidden bg-bg flex flex-col min-w-0 min-h-0 relative">
        {!navOpen && (
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="absolute left-0 top-2 z-30 p-1.5 rounded-r-lg bg-surface-elevated border border-border border-l-0 shadow-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all duration-150 cursor-pointer"
            aria-label="Open nav sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        {reading}
      </main>

      {sidebar && (
        <aside className="border-l border-border bg-surface overflow-hidden flex flex-col">
          <div className="flex items-center justify-end px-3 py-1.5 border-b border-border shrink-0">
            <button
              type="button"
              onClick={onCloseSidebar}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all duration-150 cursor-pointer"
              aria-label="Close panel"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {sidebar}
          </div>
        </aside>
      )}

      {navOpen && (
        <div
          onMouseDown={handleResizeStart('nav')}
          className="absolute top-0 bottom-0 z-10 w-1 cursor-col-resize bg-transparent hover:bg-accent/30 active:bg-accent/50 transition-colors duration-150"
          style={{ left: `${navWidth}px` }}
        />
      )}

      {sidebar && (
        <div
          onMouseDown={handleResizeStart('sidebar')}
          className="absolute top-0 bottom-0 z-10 w-1 cursor-col-resize bg-transparent hover:bg-accent/30 active:bg-accent/50 transition-colors duration-150"
          style={{ right: `${sidebarWidth}px` }}
        />
      )}
    </div>
  )
}

export function MobileShell({ reading, tabBar }: { reading: ReactNode; tabBar: ReactNode }) {
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-bg">
      <main className="flex-1 overflow-hidden min-h-0">
        {reading}
      </main>
      {tabBar}
    </div>
  )
}
