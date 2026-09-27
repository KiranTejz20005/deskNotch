import { useEffect, useState } from 'react'

/** Mirrors the types in main/ipc/privacy.ts. */
export interface BluetoothDevice {
  name: string
  /** Percent, for devices that report it; null for the rest. */
  battery: number | null
}

export interface PrivacyState {
  mic: boolean
  camera: boolean
  /** The apps using each device. */
  micApps: string[]
  cameraApps: string[]
  /** The Wi-Fi network, when connected. */
  wifi: { name: string; signal: number } | null
  /** Connected Bluetooth devices. */
  bluetooth: BluetoothDevice[]
}

/** Microphone and camera in use, Wi-Fi and Bluetooth: the edge of the closed bar. */
export function usePrivacy() {
  const [state, setState] = useState<PrivacyState>({ mic: false, camera: false, micApps: [], cameraApps: [], wifi: null, bluetooth: [] })

  useEffect(() => {
    const unsubscribe = window.bridge?.on<PrivacyState>('privacy:state', setState)
    window.bridge
      ?.invoke<PrivacyState>('privacy:get')
      .then(setState)
      .catch(() => {})
    return () => unsubscribe?.()
  }, [])

  return state
}
