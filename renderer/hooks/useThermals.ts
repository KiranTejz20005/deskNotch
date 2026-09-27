import { useEffect, useState } from 'react'
import type { ThermalState } from '../../main/ipc/thermals'

export function useThermals(): ThermalState {
  const [state, setState] = useState<ThermalState>({
    available: false,
    reason: 'Loading thermal readings...',
  })

  useEffect(() => {
    window.bridge?.invoke<ThermalState>('thermals:get').then((res) => {
      if (res && typeof res.available === 'boolean') {
        setState(res)
      }
    }).catch(() => {})

    const unsub = window.bridge?.on<ThermalState>('thermals:change', (res) => {
      if (res && typeof res.available === 'boolean') {
        setState(res)
      }
    })

    return () => unsub?.()
  }, [])

  return state
}
