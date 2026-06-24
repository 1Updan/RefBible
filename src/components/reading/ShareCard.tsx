import { forwardRef, useMemo } from 'react'

const CARD_BG_COLORS = [
  '#3b3228',
  '#2c3e50',
  '#4a2c2c',
  '#1a3f3f',
  '#2d2d3a',
  '#3d352d',
]

const REF_ICON_PATH = 'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z'

interface ShareCardProps {
  reference: string
  verseText: string
  versionLabel: string
  highlightColor?: string
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ reference, verseText, versionLabel, highlightColor }, ref) {
    const bgColor = useMemo(
      () => CARD_BG_COLORS[Math.floor(Math.random() * CARD_BG_COLORS.length)],
      [],
    )

    return (
      <div
        ref={ref}
        style={{
          width: '420px',
          padding: '32px',
          backgroundColor: bgColor,
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {highlightColor && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: highlightColor,
              borderRadius: '2px 0 0 2px',
            }}
          />
        )}

        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          {versionLabel}
        </div>

        <div
          style={{
            fontFamily: 'Georgia, "Palatino Linotype", serif',
            fontSize: '16px',
            lineHeight: '1.7',
            color: 'rgba(255,255,255,0.92)',
            textAlign: 'left',
            marginBottom: '12px',
          }}
        >
          {verseText}
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            textAlign: 'left',
            marginBottom: '20px',
          }}
        >
          {reference}
        </div>

        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.2)', marginBottom: '14px' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 48 46"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path fill="#a855f7" d={REF_ICON_PATH} />
          </svg>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              letterSpacing: '0.3px',
            }}
          >
            RefBible
          </span>
        </div>
      </div>
    )
  },
)
