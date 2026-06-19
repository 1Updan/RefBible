import { BookOpen, Search, Bookmark, Settings } from 'lucide-react'

interface MobileTabBarProps {
  activePanel: string
  onTabChange: (tab: 'read' | 'search' | 'saved' | 'settings') => void
}

const TABS = [
  { id: 'read' as const, label: 'Read', icon: BookOpen },
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'saved' as const, label: 'Saved', icon: Bookmark },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

export function MobileTabBar({ activePanel, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      className="flex items-center justify-around border-t border-border bg-tab-bar backdrop-blur-xl px-2 pb-1 shrink-0 select-none"
      style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = (id === 'read' && activePanel === 'none') || activePanel === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
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
