interface CrossReferenceChipProps {
  reference: string
  onClick: () => void
}

export function CrossReferenceChip({ reference, onClick }: CrossReferenceChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-chip-bg text-accent hover:bg-chip-hover transition-colors duration-150 cursor-pointer"
    >
      {reference}
    </button>
  )
}
