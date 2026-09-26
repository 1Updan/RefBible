import { BookOpen, Settings, BookText, Crosshair, Sparkles } from 'lucide-react'

interface MobileTabBarProps {
  activePanel: string
  interlinearEnabled?: boolean
  onTabChange: (tab: 'read' | 'interlinear' | 'ai' | 'references' | 'settings') => void
}

const SIDE_TABS_LEFT = [
  { id: 'read' as const, label: 'Read', icon: BookOpen },
  { id: 'interlinear' as const, label: 'Interlinear', icon: BookText },
]

const SIDE_TABS_RIGHT = [
  { id: 'references' as const, label: 'References', icon: Crosshair },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

function SideTab({
  id,
  label,
  Icon,
  isActive,
  onTabChange,
}: {
  id: 'read' | 'interlinear' | 'references' | 'settings'
  label: string
  Icon: typeof BookOpen
  isActive: boolean
  onTabChange: MobileTabBarProps['onTabChange']
}) {
  return (
    <button
      key={id}
      type="button"
      onClick={() => onTabChange(id)}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer min-w-[56px] ${
        isActive ? 'text-accent' : 'text-text-tertiary'
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  )
}

export function MobileTabBar({ activePanel, interlinearEnabled, onTabChange }: MobileTabBarProps) {
  const isActive = (id: string) =>
    (id === 'read' && activePanel === 'none') ||
    (id === 'interlinear' && interlinearEnabled) ||
    (id === 'references' && activePanel === 'study') ||
    (id === 'ai' && activePanel === 'ai') ||
    activePanel === id
  const aiActive = activePanel === 'ai'
  return (
    <nav
      className="flex items-end justify-around bg-tab-bar backdrop-blur-xl px-2 shrink-0 select-none shadow-[0_-12px_32px_-20px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))' }}
    >
      {SIDE_TABS_LEFT.map(({ id, label, icon: Icon }) => (
        <SideTab key={id} id={id} label={label} Icon={Icon} isActive={isActive(id)} onTabChange={onTabChange} />
      ))}
      <button
        key="ai"
        type="button"
        onClick={() => onTabChange('ai')}
        aria-label="AI Analysis"
        className={`flex flex-col items-center gap-0.5 px-3 pt-1 pb-1.5 rounded-2xl transition-all duration-150 cursor-pointer -mt-5 ${
          aiActive ? 'text-white' : 'text-white'
        }`}
      >
        <span
          className={`w-12 h-12 -mt-6 rounded-full flex items-center justify-center shadow-lg transition-all duration-150 active:scale-95 ${
            aiActive
              ? 'bg-accent-hover shadow-accent/40 ring-2 ring-accent/40 ring-offset-2 ring-offset-transparent'
              : 'bg-accent shadow-accent/30'
          }`}
        >
          <Sparkles size={22} className="text-white" />
        </span>
        <span className={`text-[10px] font-semibold leading-tight ${aiActive ? 'text-accent' : 'text-text-tertiary'}`}>
          AI
        </span>
      </button>
      {SIDE_TABS_RIGHT.map(({ id, label, icon: Icon }) => (
        <SideTab key={id} id={id} label={label} Icon={Icon} isActive={isActive(id)} onTabChange={onTabChange} />
      ))}
    </nav>
  )
}
