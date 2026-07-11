import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Android's System WebView does not implement the Web Speech API.
// Shim it so code referencing `speechSynthesis` / `SpeechSynthesisUtterance` doesn't crash on load.
if (typeof window !== 'undefined') {
  const w = window as any
  if (typeof w.speechSynthesis === 'undefined') {
    w.speechSynthesis = {
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      speak: () => {},
      cancel: () => {},
      pause: () => {},
      resume: () => {},
    }
  }
  if (typeof w.SpeechSynthesisUtterance === 'undefined') {
    w.SpeechSynthesisUtterance = class {
      text: string
      voice: any
      rate: number = 1
      pitch: number = 1
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      onpause: (() => void) | null = null
      onresume: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
  }
}

;(window as any).__diagErrors = []
window.addEventListener('error', (e) => {
  ;(window as any).__diagErrors.push(
    'ERR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno,
  )
  console.error('GLOBAL_ERROR:', e.message, e.filename, e.lineno, e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  ;(window as any).__diagErrors.push(
    'REJ: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)),
  )
  console.error('UNHANDLED_REJECTION:', e.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
