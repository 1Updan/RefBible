interface TranslationToggleProps {
  showKJV: boolean
  showNASB: boolean
  onChange: (kjv: boolean, nasb: boolean) => void
}

export function TranslationToggle({ showKJV, showNASB, onChange }: TranslationToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onChange(!showKJV, showNASB)}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
          showKJV
            ? 'bg-surface-elevated text-text-primary shadow-sm'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        KJV
      </button>
      <button
        type="button"
        onClick={() => onChange(showKJV, !showNASB)}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
          showNASB
            ? 'bg-surface-elevated text-text-primary shadow-sm'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        NASB
      </button>
    </div>
  )
}
