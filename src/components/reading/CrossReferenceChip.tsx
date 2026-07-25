import { memo } from 'react'
import clsx from 'clsx'

interface CrossReferenceChipProps {
  reference: string
  onClick: () => void
  isUserAdded?: boolean
}

export const CrossReferenceChip = memo(function CrossReferenceChip({ reference, onClick, isUserAdded }: CrossReferenceChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer',
        isUserAdded
          ? 'bg-red-50 text-danger border border-red-200 hover:bg-red-100'
          : 'bg-chip-bg text-accent hover:bg-chip-hover',
      )}
    >
      {reference}
    </button>
  )
})
