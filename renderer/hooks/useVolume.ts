import { useEffect, useState, useCallback } from 'react'

export interface VolumeState {
  volume: number // 0-100
  muted: boolean
}

export function useVolume() {
  const [state, setState] = useState<VolumeState>({ volume: 50, muted: false })

  useEffect(() => {
    let mounted = true

    window.bridge
      ?.invoke<VolumeState>('volume:get')
      .then((res) => {
        if (mounted && res && typeof res.volume === 'number') {
          setState(res)
        }
      })
      .catch(() => {})

    const unsub = window.bridge?.on<VolumeState>('volume:change', (next) => {
      if (mounted && next && typeof next.volume === 'number') {
        setState(next)
      }
    })

    return () => {
      mounted = false
      unsub?.()
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)))
    setState((prev) => ({ ...prev, volume: clamped, muted: clamped === 0 ? true : prev.muted }))
    void window.bridge?.invoke('volume:set', clamped)
  }, [])

  const toggleMute = useCallback(() => {
    setState((prev) => {
      const nextMuted = !prev.muted
      void window.bridge?.invoke('volume:mute', nextMuted)
      return { ...prev, muted: nextMuted }
    })
  }, [])

  return {
    volume: state.volume,
    muted: state.muted,
    setVolume,
    toggleMute,
  }
}
