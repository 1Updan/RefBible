import type { ReactNode } from 'react'

interface ShellProps {
  nav: ReactNode
  reading: ReactNode
  sidebar: ReactNode
}

export function DesktopShell({ nav, reading, sidebar }: ShellProps) {
  return (
    <div className="h-screen grid grid-cols-[240px_1fr_340px] overflow-hidden bg-bg" style={{ height: '100dvh' }}>
      <aside className="border-r border-border bg-surface overflow-hidden flex flex-col">
        {nav}
      </aside>
      <main className="overflow-hidden bg-bg flex flex-col min-w-0">
        {reading}
      </main>
      {sidebar && (
        <aside className="border-l border-border bg-surface overflow-hidden flex flex-col">
          {sidebar}
        </aside>
      )}
    </div>
  )
}

export function MobileShell({ reading, tabBar }: { reading: ReactNode; tabBar: ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg" style={{ height: '100dvh' }}>
      <main className="flex-1 overflow-hidden min-h-0">
        {reading}
      </main>
      {tabBar}
    </div>
  )
}
