import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { getAllActiveWindows } from '../display'

export interface BluetoothDevice {
  id: string
  name: string
  batteryPercent: number
  kind: 'headphones' | 'mouse' | 'keyboard' | 'controller' | 'unknown'
  connected: boolean
}

let cachedDevice: BluetoothDevice | null = null
let pollInterval: NodeJS.Timeout | null = null

const PS_SCRIPT = `
$res = Get-PnpDevice -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.Class -eq 'Bluetooth' -or $_.Class -eq 'AudioEndpoint' -or $_.Class -eq 'Media' -or $_.Class -eq 'Mouse' -or $_.Class -eq 'Keyboard' } | ForEach-Object {
    $prop = Get-PnpDeviceProperty -InputObject $_ -KeyName '{104EA08D-608B-4710-820C-A728282922A7} 2' -ErrorAction SilentlyContinue
    if ($prop -and $prop.Data -ne $null -and [int]$prop.Data -gt 0) {
        [PSCustomObject]@{
            id = $_.InstanceId
            name = $_.FriendlyName
            batteryPercent = [int]$prop.Data
            class = $_.Class
        }
    }
}
if ($res) {
    @($res) | ConvertTo-Json -Compress
} else {
    "[]"
}
`

function determineKind(name: string, pnpClass: string): 'headphones' | 'mouse' | 'keyboard' | 'controller' | 'unknown' {
  const lower = name.toLowerCase()
  if (
    lower.includes('headphone') ||
    lower.includes('headset') ||
    lower.includes('airpods') ||
    lower.includes('buds') ||
    lower.includes('earphone') ||
    lower.includes('audio') ||
    pnpClass === 'AudioEndpoint'
  ) {
    return 'headphones'
  }
  if (lower.includes('mouse') || pnpClass === 'Mouse') return 'mouse'
  if (lower.includes('keyboard') || pnpClass === 'Keyboard') return 'keyboard'
  if (
    lower.includes('controller') ||
    lower.includes('xbox') ||
    lower.includes('dualsense') ||
    lower.includes('gamepad')
  ) {
    return 'controller'
  }
  return 'unknown'
}

export function fetchBluetoothBattery(): Promise<BluetoothDevice | null> {
  return new Promise((resolve) => {
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${PS_SCRIPT.replace(/\r?\n/g, ' ')}"`,
      { timeout: 8000 },
      (err, stdout) => {
        if (err || !stdout.trim()) {
          cachedDevice = null
          return resolve(null)
        }
        try {
          const parsed = JSON.parse(stdout.trim())
          const rawList: any[] = Array.isArray(parsed) ? parsed : [parsed]

          if (rawList.length === 0) {
            cachedDevice = null
            return resolve(null)
          }

          const devices: BluetoothDevice[] = rawList
            .filter((d) => d && d.name && typeof d.batteryPercent === 'number' && d.batteryPercent > 0)
            .map((d) => ({
              id: String(d.id || d.name),
              name: String(d.name),
              batteryPercent: Math.min(100, Math.max(0, Number(d.batteryPercent))),
              kind: determineKind(String(d.name), String(d.class || '')),
              connected: true,
            }))

          if (devices.length === 0) {
            cachedDevice = null
            return resolve(null)
          }

          // Deterministic priority selection: headphones > mouse > keyboard > controller > unknown
          devices.sort((a, b) => {
            const priority = { headphones: 1, mouse: 2, keyboard: 3, controller: 4, unknown: 5 }
            return priority[a.kind] - priority[b.kind]
          })

          cachedDevice = devices[0]
          return resolve(cachedDevice)
        } catch {
          cachedDevice = null
          return resolve(null)
        }
      }
    )
  })
}

function notifyBluetoothChange(device: BluetoothDevice | null) {
  for (const win of getAllActiveWindows()) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('bluetooth:battery-update', device)
    }
  }
}

export function registerBluetoothIpc() {
  ipcMain.handle('bluetooth:get-battery', async () => {
    if (!cachedDevice) {
      await fetchBluetoothBattery()
    }
    return cachedDevice
  })

  // Slow conservative 30s background refresh
  if (!pollInterval) {
    pollInterval = setInterval(async () => {
      const updated = await fetchBluetoothBattery()
      notifyBluetoothChange(updated)
    }, 30000)
    // Run initial fetch
    fetchBluetoothBattery().then(notifyBluetoothChange).catch(() => {})
  }
}
