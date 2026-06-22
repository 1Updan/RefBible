import { useCallback, useEffect, useRef, useState } from 'react'

export interface SpeechVoice {
  name: string
  uri: string
  lang: string
}

const VOICE_KEY = 'refbible-speech-voice'

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechVoice[]>([])
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(() => {
    return localStorage.getItem(VOICE_KEY) ?? ''
  })
  const speakingRef = useRef(false)
  const pausedRef = useRef(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const load = () => {
      const raw = speechSynthesis.getVoices()
      const filtered = raw
        .filter((v) => v.lang.startsWith('en'))
        .map((v) => ({ name: v.name, uri: v.voiceURI, lang: v.lang }))
      setAvailableVoices(filtered)
      if (!filtered.some((v) => v.uri === selectedVoiceUri)) {
        setSelectedVoiceUri(filtered[0]?.uri ?? '')
      }
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [selectedVoiceUri])

  useEffect(() => {
    localStorage.setItem(VOICE_KEY, selectedVoiceUri)
  }, [selectedVoiceUri])

  const getVoice = useCallback(() => {
    if (!selectedVoiceUri) return null
    return speechSynthesis.getVoices().find((v) => v.voiceURI === selectedVoiceUri) ?? null
  }, [selectedVoiceUri])

  const speak = useCallback((text: string) => {
    speechSynthesis.cancel()
    speakingRef.current = false
    pausedRef.current = false
    setPaused(false)

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 0.9
    utterance.pitch = 1

    utterance.onstart = () => { speakingRef.current = true; setSpeaking(true) }
    utterance.onend = () => { speakingRef.current = false; pausedRef.current = false; setSpeaking(false); setPaused(false) }
    utterance.onerror = () => { speakingRef.current = false; pausedRef.current = false; setSpeaking(false); setPaused(false) }
    utterance.onpause = () => { pausedRef.current = true; setPaused(true) }
    utterance.onresume = () => { pausedRef.current = false; setPaused(false) }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [getVoice])

  const pause = useCallback(() => {
    speechSynthesis.pause()
    pausedRef.current = true
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    speechSynthesis.resume()
    pausedRef.current = false
    setPaused(false)
  }, [])

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    speakingRef.current = false
    pausedRef.current = false
    setSpeaking(false)
    setPaused(false)
  }, [])

  const isActive = useCallback(() => speakingRef.current, [])

  return { speak, pause, resume, stop, speaking, paused, isActive, availableVoices, selectedVoiceUri, setSelectedVoiceUri }
}
