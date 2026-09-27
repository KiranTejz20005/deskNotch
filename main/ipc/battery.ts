/**
 * Battery IPC Handler
 *
 * Chromium restricts navigator.getBattery() in non-HTTPS Electron apps.
 * This handler uses powerMonitor (for AC/battery power events) and a Win32_Battery
 * PowerShell query to return accurate real-time battery status on Windows.
 */
import { BrowserWindow, ipcMain, powerMonitor } from 'electron'
import { execFile } from 'child_process'

export interface BatteryState {
  level: number
  charging: boolean
  supported: boolean
}

let cachedState: BatteryState = { level: 1, charging: true, supported: false }

const queryBattery = (): Promise<BatteryState> =>
  new Promise((resolve) => {
    // Check power monitor status
    const isOnBattery = powerMonitor.isOnBatteryPower()
    const charging = !isOnBattery

    // Query WMI for battery percentage on Windows
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-WmiObject Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { "$($_.EstimatedChargeRemaining) $($_.BatteryStatus)" })',
      ],
      { windowsHide: true },
      (_err, stdout) => {
        const line = stdout.trim()
        if (!line) {
          // No battery (Desktop PC or unsupported)
          cachedState = { level: 1, charging: true, supported: false }
          resolve(cachedState)
          return
        }

        const [levelStr, statusStr] = line.split(' ')
        const rawLevel = Number(levelStr)
        // BatteryStatus: 2 = Charging / Fully Charged on AC power
        const isCharging = statusStr === '2' || charging
        const level = Number.isFinite(rawLevel) ? Math.min(1, Math.max(0, rawLevel / 100)) : 1

        cachedState = {
          level,
          charging: isCharging,
          supported: true,
        }
        resolve(cachedState)
      },
    )
  })

const broadcastState = async () => {
  const state = await queryBattery()
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('battery:state', state)
  }
}

export function registerBatteryIpc() {
  // Query battery initially
  void queryBattery()

  ipcMain.handle('battery:get', async () => {
    return await queryBattery()
  })

  // Listen to power state changes
  powerMonitor.on('on-battery', () => void broadcastState())
  powerMonitor.on('on-ac', () => void broadcastState())
}
