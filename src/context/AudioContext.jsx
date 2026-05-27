import React, { createContext, useContext, useState, useRef, useCallback } from 'react'

const AudioContext = createContext(null)

export function useAudio() {
  return useContext(AudioContext)
}

export function AudioProvider({ children }) {
  const [muted, setMuted] = useState(false)
  const audioCtxRef = useRef(null)

  // Initialize Web Audio API lazily on first user interaction
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const playThud = useCallback(() => {
    if (muted) return
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }, [muted, getAudioCtx])

  const announce = useCallback((text) => {
    if (muted) return
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    // Optional: pick a specific voice
    // const voices = window.speechSynthesis.getVoices()
    // const voice = voices.find(v => v.name.includes('Google UK English Male')) || voices[0]
    // if (voice) utterance.voice = voice

    utterance.rate = 1.1 // Slightly faster
    utterance.pitch = 1.0
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  }, [muted])

  return (
    <AudioContext.Provider value={{ muted, setMuted, playThud, announce }}>
      {children}
    </AudioContext.Provider>
  )
}
