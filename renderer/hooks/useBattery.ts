import { useEffect, useState } from 'react'

export interface BatteryState {
  level: number
  charging: boolean
  supported: boolean
}

export type BatteryData = BatteryState

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

/** Laptop charge via native main process IPC (or Web Battery API fallback). */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    level: 1,
    charging: false,
    supported: false,
  })

  useEffect(() => {
    let unmounted = false

    // 1. Try Native IPC first (reliable in Electron)
    if (window.bridge?.invoke) {
      window.bridge
        .invoke<BatteryState>('battery:get')
        .then((res) => {
          if (!unmounted && res) setState(res)
        })
        .catch(() => {})

      const unsubscribe = window.bridge.on<BatteryState>('battery:state', (res) => {
        if (!unmounted && res) setState(res)
      })

      return () => {
        unmounted = true
        unsubscribe?.()
      }
    }

    // 2. Fallback to browser navigator.getBattery API if available
    const getBattery = (navigator as Navigator & {
      getBattery?: () => Promise<BatteryManager>
    }).getBattery

    if (!getBattery) return

    let battery: BatteryManager | null = null

    const sync = () => {
      if (!battery || unmounted) return
      setState({ level: battery.level, charging: battery.charging, supported: true })
    }

    getBattery()
      .then((mgr) => {
        if (unmounted) return
        battery = mgr
        sync()
        battery.addEventListener('levelchange', sync)
        battery.addEventListener('chargingchange', sync)
      })
      .catch(() => {})

    return () => {
      unmounted = true
      battery?.removeEventListener('levelchange', sync)
      battery?.removeEventListener('chargingchange', sync)
    }
  }, [])

  return state
}
