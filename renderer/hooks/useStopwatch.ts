import { useEffect, useRef, useState, useCallback } from 'react'

export interface StopwatchState {
  isRunning: boolean
  accumulatedMs: number
  startTime: number | null
}

export interface Stopwatch {
  elapsedMs: number
  isRunning: boolean
  start: () => void
  pause: () => void
  reset: () => void
}

export function useStopwatch(): Stopwatch {
  const [isRunning, setIsRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  const loaded = useRef(false)

  // Load persisted state on startup
  useEffect(() => {
    window.bridge
      ?.invoke<StopwatchState | null>('store:get', 'stopwatch')
      .then((saved) => {
        if (saved) {
          setIsRunning(Boolean(saved.isRunning))
          setAccumulatedMs(typeof saved.accumulatedMs === 'number' ? saved.accumulatedMs : 0)
          setStartTime(typeof saved.startTime === 'number' ? saved.startTime : null)
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true
      })
  }, [])

  // Save state on start/pause/reset
  const persistState = useCallback((nextIsRunning: boolean, nextAccMs: number, nextStart: number | null) => {
    if (!loaded.current) return
    void window.bridge?.invoke('store:set', 'stopwatch', {
      isRunning: nextIsRunning,
      accumulatedMs: nextAccMs,
      startTime: nextStart,
    })
  }, [])

  // Timer tick effect: updates UI at ~100ms intervals only while running
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setNow(Date.now())
    }, 100)
    return () => clearInterval(id)
  }, [isRunning])

  const elapsedMs = isRunning && startTime ? Math.max(0, accumulatedMs + (now - startTime)) : accumulatedMs

  const start = useCallback(() => {
    const currentStart = Date.now()
    setNow(currentStart)
    setStartTime(currentStart)
    setIsRunning(true)
    persistState(true, accumulatedMs, currentStart)
  }, [accumulatedMs, persistState])

  const pause = useCallback(() => {
    if (!isRunning || !startTime) return
    const currentNow = Date.now()
    const nextAccMs = Math.max(0, accumulatedMs + (currentNow - startTime))
    setIsRunning(false)
    setStartTime(null)
    setAccumulatedMs(nextAccMs)
    persistState(false, nextAccMs, null)
  }, [isRunning, startTime, accumulatedMs, persistState])

  const reset = useCallback(() => {
    setIsRunning(false)
    setStartTime(null)
    setAccumulatedMs(0)
    persistState(false, 0, null)
  }, [persistState])

  return {
    elapsedMs,
    isRunning,
    start,
    pause,
    reset,
  }
}
