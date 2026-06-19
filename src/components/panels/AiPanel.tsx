import { useState } from 'react'
import { Sparkles, Key, X, AlertCircle } from 'lucide-react'

interface AiPanelProps {
  onClose: () => void
}

export function AiPanel({ onClose }: AiPanelProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('refbible-ai-key') ?? '')
  const [saved, setSaved] = useState(!!localStorage.getItem('refbible-ai-key'))

  const handleSaveKey = () => {
    localStorage.setItem('refbible-ai-key', apiKey)
    setSaved(true)
  }

  const handleClearKey = () => {
    localStorage.removeItem('refbible-ai-key')
    setApiKey('')
    setSaved(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent shrink-0" />
          <span className="text-sm font-semibold text-text-primary">AI Commentary</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-surface text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Key size={14} className="text-text-tertiary" />
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">API Key</h3>
          </div>
          {!saved ? (
            <div className="space-y-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google AI Studio API key"
                className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              >
                Save Key
              </button>
              <p className="text-xs text-text-tertiary flex items-start gap-1.5">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                Your key is stored locally and never sent anywhere except Google AI Studio.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle">
                <span className="text-xs text-text-secondary">Key saved</span>
              </div>
              <button
                type="button"
                onClick={handleClearKey}
                className="text-xs text-danger hover:text-danger/80 transition-colors duration-150 cursor-pointer"
              >
                Clear & Revoke Key
              </button>
            </div>
          )}
        </div>

        {saved && (
          <div className="px-4 py-6 rounded-lg bg-surface-elevated border border-border-subtle text-center">
            <Sparkles size={20} className="text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              Select a verse and use the context menu to get AI commentary.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
