import { useEffect, useRef, useState } from 'react'

export interface Timer {
  remaining: number
  remainingMs: number
  /** The full length of the current run, so progress can be drawn. */
  durationMs: number
  isRunning: boolean
  finished: boolean
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
  reset: () => void
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3) // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.8)
  } catch {
    // ignore audio errors
  }
}

function notifyTimerComplete() {
  playChime()
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification('Focus Session Complete! 🎯', {
        body: 'Your timer has ended. Time to take a short break!',
      })
    } else if (Notification.permission !== 'denied') {
      void Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Focus Session Complete! 🎯', {
            body: 'Your timer has ended. Time to take a short break!',
          })
        }
      })
    }
  }
}

export function useTimer(): Timer {
  const [remainingMs, setRemainingMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const deadlineRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isRunning) return
    const tick = () => {
      if (deadlineRef.current === null) return
      const left = Math.max(0, deadlineRef.current - Date.now())
      setRemainingMs(left)
      if (left <= 0) {
        setIsRunning(false)
        setFinished(true)
        deadlineRef.current = null
        notifyTimerComplete()
      }
    }

    tick()
    const id = setInterval(tick, 33)
    return () => clearInterval(id)
  }, [isRunning])

  const start = (seconds: number) => {
    if (seconds <= 0) return
    deadlineRef.current = Date.now() + seconds * 1000
    setRemainingMs(seconds * 1000)
    setDurationMs(seconds * 1000)
    setFinished(false)
    setIsRunning(true)
  }

  const add = (seconds: number) => {
    const base = deadlineRef.current ?? Date.now()
    deadlineRef.current = base + seconds * 1000
    setDurationMs((total) => total + seconds * 1000)
    setRemainingMs(Math.max(0, deadlineRef.current - Date.now()))
    setFinished(false)
    setIsRunning(true)
  }

  const stop = () => {
    if (deadlineRef.current !== null) {
      const left = Math.max(0, deadlineRef.current - Date.now())
      setRemainingMs(left)
      deadlineRef.current = null
    }
    setIsRunning(false)
  }

  const reset = () => {
    deadlineRef.current = null
    setIsRunning(false)
    setFinished(false)
    setRemainingMs(0)
    setDurationMs(0)
  }

  return {
    remaining: Math.ceil(remainingMs / 1000),
    remainingMs,
    durationMs,
    isRunning,
    finished,
    start,
    add,
    stop,
    reset,
  }
}
