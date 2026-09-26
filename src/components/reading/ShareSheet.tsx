import { useCallback, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { ShareCard } from './ShareCard'
import { HIGHLIGHT_COLORS } from '@/lib/highlights'
import { Clipboard, Share2 } from 'lucide-react'

interface ShareSheetProps {
  reference: string
  verseText: string
  verses?: { verseId: string; num: number; text: string }[]
  versionLabel: string
  highlightColors?: string[]
  onClose: () => void
}

type SharePlatform = {
  id: string
  label: string
  color: string
  type: 'url' | 'copy' | 'native'
  getUrl?: (text: string) => string
}

const SHARE_OPTIONS: SharePlatform[] = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', type: 'url', getUrl: (t) => `https://wa.me/?text=${encodeURIComponent(t)}` },
  { id: 'telegram', label: 'Telegram', color: '#0088CC', type: 'url', getUrl: (t) => `https://t.me/share/url?url=${encodeURIComponent('https://refbible.app')}&text=${encodeURIComponent(t)}` },
  { id: 'twitter', label: 'X', color: '#000000', type: 'url', getUrl: (t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}` },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', type: 'url', getUrl: (t) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(t)}&u=${encodeURIComponent('https://refbible.app')}` },
  { id: 'message', label: 'Message', color: '#34C759', type: 'url', getUrl: (t) => `sms:&body=${encodeURIComponent(t)}` },
  { id: 'copy', label: 'Copy', color: '#3A3A3C', type: 'copy' },
  { id: 'more', label: 'More', color: '#3A3A3C', type: 'native' },
]

function PlatformIcon({ id }: { id: string }) {
  const cls = 'w-5 h-5'

  switch (id) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="white" className={cls}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill="white" className={cls}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0m4.962 7.224c.1-.002.321.023.465.14a.5.5 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635"/>
        </svg>
      )
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="white" className={cls}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="white" className={cls}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    case 'message':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      )
    case 'copy':
      return <Clipboard size={20} color="white" />
    case 'more':
      return <Share2 size={20} color="white" />
    default:
      return null
  }
}

export function ShareSheet({ reference, verseText, verses, versionLabel, highlightColors, onClose }: ShareSheetProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const highlightColor = highlightColors && highlightColors.length > 0
    ? HIGHLIGHT_COLORS.find((c) => c.id === highlightColors[0])?.bg
    : undefined

  const shareText = `${versionLabel}\n\n${verseText}\n\n${reference} — RefBible`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [shareText])

  const handleNative = useCallback(async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'verse.png', { type: 'image/png' })
      if (navigator.share) {
        await navigator.share({ files: [file], title: reference, text: shareText })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `refbible-${reference.replace(/\s+/g, '-')}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // user cancelled or share failed
    }
    setSharing(false)
  }, [reference, shareText])

  const handleShare = useCallback(async (platform: SharePlatform) => {
    if (platform.type === 'native') {
      await handleNative()
    } else if (platform.type === 'copy') {
      await handleCopy()
    } else if (platform.type === 'url' && platform.getUrl) {
      const a = document.createElement('a')
      a.href = platform.getUrl(shareText)
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
    }
  }, [shareText, handleNative, handleCopy])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="animate-[scaleIn_200ms_ease-out]">
          <ShareCard
            ref={cardRef}
            reference={reference}
            verseText={verseText}
            verses={verses}
            versionLabel={versionLabel}
            highlightColor={highlightColor}
          />
        </div>
      </div>

      <div className="bg-surface-elevated rounded-t-2xl px-4 pt-5 pb-8">
        <div className="flex justify-center gap-3 flex-wrap px-2">
          {SHARE_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleShare(s)}
              disabled={sharing}
              className="flex flex-col items-center gap-1.5 transition-all duration-150 hover:scale-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: copied && s.id === 'copy' ? '#34C759' : s.color }}
              >
                {s.id === 'copy' && copied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <PlatformIcon id={s.id} />
                )}
              </div>
              <span className="text-[10px] text-text-secondary font-medium whitespace-nowrap">
                {s.id === 'copy' && copied ? 'Copied!' : s.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-sm text-text-secondary hover:text-text-primary py-2 mt-2 transition-colors duration-150 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  )
}
