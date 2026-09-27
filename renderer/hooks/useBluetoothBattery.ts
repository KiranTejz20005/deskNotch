import { useEffect, useState } from 'react'
import type { BluetoothDevice } from '../../main/ipc/bluetooth'

export type { BluetoothDevice }

export function useBluetoothBattery(): BluetoothDevice | null {
  const [device, setDevice] = useState<BluetoothDevice | null>(null)

  useEffect(() => {
    let mounted = true

    // 1. Initial IPC fetch
    window.bridge
      ?.invoke<BluetoothDevice | null>('bluetooth:get-battery')
      .then((dev) => {
        if (mounted) setDevice(dev && dev.connected ? dev : null)
      })
      .catch(() => {})

    // 2. Listen for real-time background updates
    const unsub = window.bridge?.on<BluetoothDevice | null>('bluetooth:battery-update', (updated) => {
      if (mounted) {
        setDevice(updated && updated.connected ? updated : null)
      }
    })

    return () => {
      mounted = false
      unsub?.()
    }
  }, [])

  return device
}
