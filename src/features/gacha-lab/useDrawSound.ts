import { useEffect, useRef } from 'react'

export function useDrawSound() {
  const audio = useRef<AudioContext | null>(null)
  useEffect(() => () => {
    if (audio.current) void audio.current.close().catch(() => {})
    audio.current = null
  }, [])

  return function playSound() {
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      audio.current ||= new AudioCtor()
      if (audio.current.state === 'suspended') void audio.current.resume().catch(() => {})
      const ctx = audio.current, t = ctx.currentTime + .008, duration = .19
      // Original short filtered-noise slide, with the same frequency and gain envelope.
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'; filter.Q.value = .65
      filter.frequency.setValueAtTime(2600, t)
      filter.frequency.exponentialRampToValueAtTime(450, t + duration)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(.0001, t)
      gain.gain.linearRampToValueAtTime(.12, t + .025)
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration)
      source.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
      source.start(t); source.stop(t + duration)
    } catch { /* Audio failure never prevents a completed draw. */ }
  }
}
