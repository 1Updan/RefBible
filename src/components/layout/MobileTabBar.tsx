import { BookOpen, Settings, BookText, Crosshair } from 'lucide-react'

interface MobileTabBarProps {
  activePanel: string
  interlinearEnabled?: boolean
  onTabChange: (tab: 'read' | 'interlinear' | 'references' | 'settings') => void
}

const TABS = [
  { id: 'read' as const, label: 'Read', icon: BookOpen },
  { id: 'interlinear' as const, label: 'Interlinear', icon: BookText },
  { id: 'references' as const, label: 'References', icon: Crosshair },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

export function MobileTabBar({ activePanel, interlinearEnabled, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      className="flex items-center justify-around border-t border-border bg-tab-bar backdrop-blur-xl px-2 pb-1 shrink-0 select-none"
      style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive =
          (id === 'read' && activePanel === 'none') ||
          (id === 'interlinear' && interlinearEnabled) ||
          (id === 'references' && activePanel === 'study') ||
          activePanel === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
              isActive ? 'text-accent' : 'text-text-tertiary'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
