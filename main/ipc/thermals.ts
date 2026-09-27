import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'

export interface ThermalState {
  available: boolean
  cpuTemp?: number
  gpuTemp?: number
  systemTemp?: number
  status?: 'Normal' | 'Warm' | 'Hot'
  reason?: string
}

let cachedState: ThermalState = {
  available: false,
  reason: 'Checking hardware sensors...',
}

let psProcess: ChildProcess | null = null

function initThermalProcess() {
  if (process.platform !== 'win32') {
    cachedState = { available: false, reason: 'Windows only feature' }
    return
  }

  const psScript = `
function Query-Thermals {
    $cpu = $null
    $gpu = $null
    $sys = $null

    # 1. Try LibreHardwareMonitor / OpenHardwareMonitor WMI
    try {
        $lhm = Get-CimInstance -Namespace 'root\\LibreHardwareMonitor' -ClassName 'Sensor' -ErrorAction SilentlyContinue | Where-Object { $_.SensorType -eq 'Temperature' }
        if ($lhm) {
            foreach ($s in $lhm) {
                if ($s.Name -like '*CPU*' -and $null -eq $cpu) { $cpu = [math]::Round($s.Value) }
                elseif ($s.Name -like '*GPU*' -and $null -eq $gpu) { $gpu = [math]::Round($s.Value) }
                elseif ($null -eq $sys) { $sys = [math]::Round($s.Value) }
            }
        }
    } catch {}

    # 2. Try MSAcpi_ThermalZoneTemperature if CPU still null
    if ($null -eq $cpu) {
        try {
            $acpi = Get-CimInstance -Namespace 'root\\wmi' -ClassName 'MSAcpi_ThermalZoneTemperature' -ErrorAction SilentlyContinue
            if ($acpi) {
                foreach ($z in $acpi) {
                    if ($z.CurrentTemperature -gt 2730) {
                        $c = [math]::Round(($z.CurrentTemperature / 10) - 273.15)
                        if ($null -eq $cpu) { $cpu = $c }
                        elseif ($null -eq $sys) { $sys = $c }
                    }
                }
            }
        } catch {}
    }

    if ($null -ne $cpu -or $null -ne $gpu -or $null -ne $sys) {
        $maxT = [math]::Max([math]::Max(($cpu ?? 0), ($gpu ?? 0)), ($sys ?? 0))
        $st = if ($maxT -ge 85) { "Hot" } elseif ($maxT -ge 70) { "Warm" } else { "Normal" }
        Write-Output "THERMALS:{\"available\":true,\"cpuTemp\":$($cpu ?? 'null'),\"gpuTemp\":$($gpu ?? 'null'),\"systemTemp\":$($sys ?? 'null'),\"status\":\"$st\"}"
    } else {
        Write-Output "THERMALS:{\"available\":false,\"reason\":\"Hardware thermal sensors restricted by BIOS/OS\"}"
    }
}

Query-Thermals

$reader = [Console]::In
while ($null -ne ($line = $reader.ReadLine())) {
    if ($line.Trim() -eq "QUERY") {
        Query-Thermals
    }
}
`

  try {
    psProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    let stdoutBuffer = ''
    psProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString('utf-8')
      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('THERMALS:')) {
          try {
            const rawJson = trimmed.substring(9)
            const parsed = JSON.parse(rawJson) as ThermalState
            cachedState = parsed
            broadcast()
          } catch {}
        }
      }
    })

    psProcess.on('exit', () => {
      psProcess = null
    })
  } catch (err) {
    cachedState = { available: false, reason: 'Thermal monitor failed to start' }
  }

  // Poll thermal sensors every 8 seconds (low-frequency, async)
  setInterval(() => {
    if (psProcess && psProcess.stdin) {
      psProcess.stdin.write('QUERY\n')
    }
  }, 8000)
}

function broadcast() {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('thermals:change', cachedState)
    }
  })
}

export function setupThermalsIpc() {
  initThermalProcess()

  ipcMain.handle('thermals:get', () => {
    return cachedState
  })
}
