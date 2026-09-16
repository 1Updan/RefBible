import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Send, Copy, Volume2, VolumeX, RotateCcw,
  BookOpen, ChevronLeft,
  Loader2, AlertCircle
} from 'lucide-react';
import { useAiVault } from '@/contexts/AiVaultContext';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { saveNote } from '@/lib/db';
import { hasStoredConfigs, getAllConfigs } from '@/lib/aiVault';

const MODES = [
  { id: 'context', label: 'Contextual', systemPrompt: 'You are a Bible scholar. Explain the verse in its historical, cultural, and literary context. Be concise but thorough.' },
  { id: 'theology', label: 'Theological', systemPrompt: 'You are a systematic theologian. Analyze the verse for its doctrinal significance, connections to other Scripture, and theological implications.' },
  { id: 'application', label: 'Application', systemPrompt: 'You are a pastoral counselor. Explain how this verse applies to daily Christian living. Be practical, encouraging, and grounded in the text.' },
  { id: 'study', label: 'Study Guide', systemPrompt: 'You are a Bible study leader. Provide an outline with: 1) Main point, 2) Key cross-references, 3) Word studies, 4) Discussion questions, 5) Application.' },
  { id: 'custom', label: 'Custom', systemPrompt: '' }
] as const;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  createdAt: number;
}

interface AiChatPanelProps {
  verseId?: string;
  reference?: string;
  verseText?: string;
  onClose?: () => void;
}

export function AiChatPanel({ verseId, reference, verseText, onClose }: AiChatPanelProps) {
  const { activeConfig, unlock, lock } = useAiVault();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [customPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('context');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  // null = still checking; true = encrypted configs exist but vault is locked
  const [vaultLocked, setVaultLocked] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const responseRef = useRef('');
  const unlistenRef = useRef<(() => void)[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // ── TTS setup ──
  useEffect(() => {
    const update = () => { voicesRef.current = speechSynthesis.getVoices(); };
    update();
    speechSynthesis.onvoiceschanged = update;
    return () => { speechSynthesis.onvoiceschanged = null; speechSynthesis.cancel(); };
  }, []);

  // ── Cleanup listeners on unmount ──
  useEffect(() => {
    return () => { unlistenRef.current.forEach(fn => fn()); };
  }, []);

  const speakText = useCallback((text: string) => {
    if (!text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const savedVoice = localStorage.getItem('refbible-speech-voice');
    if (savedVoice) {
      const voice = voicesRef.current.find(v => v.voiceURI === savedVoice);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = 0.65;
    utterance.onend = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, []);

  const stopSpeech = useCallback(() => {
    speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const saveAsNote = useCallback(async () => {
    const lastAi = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAi || !verseId) return;
    try {
      await saveNote(verseId, `[AI] ${lastAi.content}`);
    } catch (e) {
      console.error('Failed to save as note:', e);
    }
  }, [messages, verseId]);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeConfig || streaming) return;

    // Drop listeners from any previous send first: otherwise every
    // past message's token listener is still alive and each new token
    // gets appended N times (duplicated streamed text).
    unlistenRef.current.forEach(fn => fn());
    unlistenRef.current = [];

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      mode: selectedMode,
      createdAt: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setStreaming(true);
    responseRef.current = '';

    try {
      const mode = MODES.find(m => m.id === selectedMode);
      const systemPrompt = mode?.systemPrompt || customPrompt;
      const combinedPrompt = customPrompt.trim()
        ? `${systemPrompt}\n\nExtra instructions:\n${customPrompt}\n\nVerse: ${reference}\n\n${verseText}`
        : `${systemPrompt}\n\nVerse: ${reference}\n\n${verseText}`;

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        mode: selectedMode,
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Stream tokens
      const sentenceBuffer = { current: '' };

      const unlistenToken = await listen<string>('ai:token', (event) => {
        const token = event.payload;
        responseRef.current += token;

        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: responseRef.current };
          }
          return updated;
        });

        // TTS: speak completed sentences
        sentenceBuffer.current += token;
        const match = sentenceBuffer.current.match(/^(.*?[.!?])(?:\s|$)/s);
        if (match) {
          speakText(match[1]);
          sentenceBuffer.current = sentenceBuffer.current.slice(match[1].length).trimStart();
        }
      });
      unlistenRef.current.push(unlistenToken);

      const unlistenDone = await listen('ai:done', () => {
        if (sentenceBuffer.current.trim()) speakText(sentenceBuffer.current.trim());
        setStreaming(false);
      });
      unlistenRef.current.push(unlistenDone);

      await invoke('ai_query_stream', {
        apiKey: activeConfig.apiKey,
        prompt: combinedPrompt,
        provider: activeConfig.provider,
        endpoint: activeConfig.endpoint || '',
        model: activeConfig.model,
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      let friendly = raw;
      if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
        friendly = 'Rate limit or quota exceeded. Try again later or use a different API key.';
      } else if (raw.includes('401') || raw.includes('unauthorized') || raw.includes('API_KEY_INVALID')) {
        friendly = 'Invalid API key. Check your key in Settings.';
      } else if (raw.includes('404') || raw.includes('model not found')) {
        friendly = 'Model not found. Try a different model.';
      }
      setError(friendly);
      setStreaming(false);
    }
  }, [input, activeConfig, streaming, messages, selectedMode, customPrompt, reference, verseText, speakText]);

  const regenerate = useCallback(() => {
    if (messages.length < 2 || streaming) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(prev => prev.slice(0, -1));
    setInput(lastUser.content);
  }, [messages, streaming]);

  // Distinguish "vault locked" from "nothing configured": configs are
  // encrypted at rest, so a cold start always looks empty until unlocked.
  useEffect(() => {
    if (activeConfig) {
      setVaultLocked(false);
      return;
    }
    let cancelled = false;
    hasStoredConfigs()
      .then((has) => {
        if (!cancelled) setVaultLocked(has);
      })
      .catch(() => {
        if (!cancelled) setVaultLocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConfig]);

  const handleUnlock = useCallback(async () => {
    if (pinInput.length < 4) {
      setPinError('PIN must be at least 4 characters');
      return;
    }
    setPinError(null);
    setUnlocking(true);
    try {
      await unlock(pinInput);
      setPinInput('');
      // PBKDF2 never fails, so a wrong PIN "unlocks" into an empty vault —
      // verify decrypted configs actually appeared.
      const stored = await hasStoredConfigs().catch(() => false);
      const decrypted = stored ? await getAllConfigs().catch(() => []) : [];
      if (stored && decrypted.length === 0) {
        lock();
        setPinError('Incorrect PIN — try again');
      }
    } catch (e) {
      setPinError(e instanceof Error ? e.message : 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  }, [pinInput, unlock, lock]);

  // ── Empty states ──
  if (!verseId || !reference) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Sparkles size={32} className="text-text-tertiary mb-3" />
        <p className="text-sm text-text-secondary">Select a verse to start AI analysis</p>
        <p className="text-xs text-text-tertiary mt-1">Long-press a verse, then tap the AI button</p>
      </div>
    );
  }

  if (!activeConfig) {
    if (vaultLocked === null) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-text-tertiary">Checking AI setup…</p>
        </div>
      );
    }
    if (vaultLocked) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Sparkles size={32} className="text-text-tertiary mb-3" />
          <p className="text-sm text-text-secondary">AI vault is locked</p>
          <p className="text-xs text-text-tertiary mt-1 mb-4">Enter your PIN to unlock your saved provider</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUnlock();
            }}
            placeholder="Enter PIN"
            className="w-full max-w-[220px] px-3 py-2 text-sm text-center rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
          />
          {pinError && <p className="text-xs text-danger mt-2">{pinError}</p>}
          <button
            type="button"
            onClick={handleUnlock}
            disabled={unlocking || pinInput.length < 4}
            className="mt-3 px-6 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            {unlocking ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Sparkles size={32} className="text-text-tertiary mb-3" />
        <p className="text-sm text-text-secondary">AI not configured</p>
        <p className="text-xs text-text-tertiary mt-1">Go to Settings to set up an AI provider</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">AI Analysis</p>
            <p className="text-[10px] text-text-tertiary">{reference}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode selector */}
        <div className="px-3 py-2 border-b border-border bg-surface-elevated flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider shrink-0">Mode:</span>
          <div className="flex gap-1.5">
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 ${
                  selectedMode === mode.id
                    ? 'bg-accent text-white'
                    : 'bg-surface-elevated text-text-secondary border border-border-subtle hover:border-accent/30 hover:text-text-primary'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles size={32} className="text-text-tertiary mb-3" />
              <p className="text-sm text-text-secondary">Start a conversation</p>
              <p className="text-xs text-text-tertiary mt-1">Ask about this verse, request a study guide, or get personal application</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user' ? 'bg-accent/10 text-accent' : 'bg-purple-500/10 text-purple-500'
                }`}>
                  {msg.role === 'user' ? <span className="text-xs font-medium">You</span> : <Sparkles size={14} />}
                </div>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`px-3 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-surface-elevated border border-border-subtle'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'assistant' && msg.content && !streaming && (
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <button onClick={() => copyMessage(msg.content)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors" title="Copy">
                        <Copy size={12} />
                      </button>
                      <button onClick={() => speaking ? stopSpeech() : speakText(msg.content)} className={`p-1.5 rounded-lg transition-colors ${speaking ? 'bg-danger/10 text-danger' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'}`} title={speaking ? 'Stop' : 'Listen'}>
                        {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      </button>
                      <button onClick={regenerate} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors" title="Regenerate">
                        <RotateCcw size={12} />
                      </button>
                      <button onClick={saveAsNote} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors" title="Save as Note">
                        <BookOpen size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {streaming && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Loader2 size={14} className="text-purple-500 animate-spin" />
              </div>
              <div className="bg-surface-elevated border border-border-subtle px-3 py-2 rounded-2xl max-w-[85%]">
                <p className="text-sm leading-relaxed">{responseRef.current || '...'}</p>
                <span className="inline-block w-2 h-4 ml-0.5 bg-accent animate-pulse rounded-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 bg-danger/10 border border-danger/30 mx-3 mb-2 rounded-lg">
            <p className="text-xs text-danger flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2 border-t border-border bg-surface-elevated">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={streaming ? 'Waiting for response...' : 'Ask about this verse...'}
              rows={1}
              className="w-full px-3 py-2 text-sm rounded-xl bg-bg border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150 resize-none"
              disabled={streaming}
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shrink-0"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-text-tertiary text-center mt-1">
            Session-only: conversation clears when you close the app
          </p>
        </div>
      </div>
    </div>
  );
}