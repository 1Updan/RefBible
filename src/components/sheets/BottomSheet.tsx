import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [maxHeight, setMaxHeight] = useState('75vh')
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const keyboardHeight = window.innerHeight - vv.height
      if (keyboardHeight > 0) {
        setMaxHeight(`${Math.max(vv.height * 0.85, 200)}px`)
      } else {
        setMaxHeight('75vh')
      }
    }

    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-scrim animate-[fadeIn_200ms_ease]" onClick={onClose} role="presentation" />
      <div
        ref={sheetRef}
        className="relative bg-surface-elevated rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_200ms_ease-out]"
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
