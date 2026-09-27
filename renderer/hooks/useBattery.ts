import { useEffect, useState } from 'react'

export interface BatteryData {
  level: number
  charging: boolean
  isLow: boolean
}

export function useBattery(): BatteryData | null {
  const [battery, setBattery] = useState<BatteryData | null>(null)

  useEffect(() => {
    let mounted = true
    let batteryApi: any = null

    const updateFromManager = (mgr: any) => {
      if (!mounted || !mgr) return
      const level = Math.round(mgr.level * 100)
      const charging = Boolean(mgr.charging)
      const isLow = level <= 20 && !charging
      setBattery((prev) => {
        if (prev && prev.level === level && prev.charging === charging && prev.isLow === isLow) {
          return prev
        }
        return { level, charging, isLow }
      })
    }

    const fallbackIpc = async () => {
      try {
        const res = await window.bridge?.invoke<BatteryData | null>('battery:get')
        if (mounted && res && typeof res.level === 'number') {
          setBattery(res)
        }
      } catch {}
    }

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      ;(navigator as any)
        .getBattery()
        .then((mgr: any) => {
          if (!mounted) return
          batteryApi = mgr
          updateFromManager(mgr)

          const handleChange = () => updateFromManager(mgr)
          mgr.addEventListener('chargingchange', handleChange)
          mgr.addEventListener('levelchange', handleChange)
        })
        .catch(() => {
          fallbackIpc()
        })
    } else {
      fallbackIpc()
    }

    // Conservative 30s polling fallback if events miss or IPC is used
    const pollId = setInterval(() => {
      if (batteryApi) {
        updateFromManager(batteryApi)
      } else {
        fallbackIpc()
      }
    }, 30000)

    return () => {
      mounted = false
      clearInterval(pollId)
      if (batteryApi) {
        try {
          batteryApi.removeEventListener('chargingchange', updateFromManager)
          batteryApi.removeEventListener('levelchange', updateFromManager)
        } catch {}
      }
    }
  }, [])

  return battery
}
