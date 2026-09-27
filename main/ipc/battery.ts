import { ipcMain } from 'electron'
import { exec } from 'child_process'

export interface BatteryState {
  level: number
  charging: boolean
  isLow: boolean
}

let cachedBattery: BatteryState | null = null

const PS_BATTERY = `
$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
if ($b) {
    [PSCustomObject]@{
        level = [int]$b.EstimatedChargeRemaining
        charging = [bool]($b.BatteryStatus -eq 2 -or $b.BatteryStatus -eq 6 -or $b.BatteryStatus -eq 7 -or $b.BatteryStatus -eq 8)
    } | ConvertTo-Json -Compress
} else {
    "{}"
}
`

export function fetchSystemBattery(): Promise<BatteryState | null> {
  return new Promise((resolve) => {
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${PS_BATTERY.replace(/\r?\n/g, ' ')}"`,
      { timeout: 5000 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve(cachedBattery)
        try {
          const parsed = JSON.parse(stdout.trim())
          if (typeof parsed.level === 'number') {
            const level = Math.min(100, Math.max(0, parsed.level))
            const charging = Boolean(parsed.charging)
            cachedBattery = {
              level,
              charging,
              isLow: level <= 20 && !charging,
            }
            return resolve(cachedBattery)
          }
        } catch {}
        return resolve(cachedBattery)
      }
    )
  })
}

export function registerBatteryIpc() {
  ipcMain.handle('battery:get', async () => {
    return fetchSystemBattery()
  })
}
