import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'

interface DndState {
  enabled: boolean
}

let cachedState: DndState = { enabled: false }
let psProcess: ChildProcess | null = null

function initDndProcess() {
  if (process.platform !== 'win32') return
  if (psProcess) return

  const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;

namespace FocusAssist {
    public class Wnf {
        [DllImport("ntdll.dll")]
        public static extern int NtQueryWnfStateData(ref ulong StateName, IntPtr ChangeStamp, IntPtr Buffer, ref int BufferSize);

        [DllImport("ntdll.dll")]
        public static extern int NtUpdateWnfStateData(ref ulong StateName, byte[] Buffer, int Length, IntPtr MatchingTypeId, IntPtr UserData, int MatchingChangeStamp, int CheckState);

        public static int GetState() {
            ulong stateName = 0xd83063ea3b601435UL;
            int size = 4;
            IntPtr buf = Marshal.AllocHGlobal(size);
            try {
                int res = NtQueryWnfStateData(ref stateName, IntPtr.Zero, buf, ref size);
                if (res == 0 && size > 0) {
                    return Marshal.ReadInt32(buf);
                }
            } catch {} finally {
                Marshal.FreeHGlobal(buf);
            }
            return 0;
        }

        public static bool SetState(int profile) {
            ulong stateName = 0xd83063ea3b601435UL;
            byte[] buf = BitConverter.GetBytes(profile);
            int res = NtUpdateWnfStateData(ref stateName, buf, buf.Length, IntPtr.Zero, IntPtr.Zero, 0, 0);
            return res == 0;
        }
    }
}
"@
Add-Type -TypeDefinition $code

function Output-State {
    $val = [FocusAssist.Wnf]::GetState()
    $enabled = $val -gt 0
    Write-Output "STATE:$enabled"
}

Output-State

$reader = [Console]::In
while ($null -ne ($line = $reader.ReadLine())) {
    $line = $line.Trim()
    if ($line.StartsWith("SET:")) {
        $parts = $line.Split(":")
        if ($parts.Length -ge 2) {
            $wantOn = [bool]::Parse($parts[1])
            $targetProfile = if ($wantOn) { 1 } else { 0 }
            [FocusAssist.Wnf]::SetState($targetProfile) | Out-Null
            Start-Sleep -Milliseconds 50
            Output-State
        }
    } elseif ($line -eq "GET") {
        Output-State
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
        if (trimmed.startsWith('STATE:')) {
          const isEnabled = trimmed.substring(6).toLowerCase() === 'true'
          cachedState = { enabled: isEnabled }
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('dnd:change', cachedState)
            }
          })
        }
      }
    })

    psProcess.on('exit', () => {
      psProcess = null
    })
  } catch (err) {
    console.error('Failed to spawn DND worker:', err)
  }
}

export function setupDndIpc() {
  initDndProcess()

  ipcMain.handle('dnd:get', () => {
    if (psProcess && psProcess.stdin) {
      psProcess.stdin.write('GET\n')
    }
    return cachedState
  })

  ipcMain.handle('dnd:toggle', (_evt, targetEnabled?: boolean) => {
    const nextState = typeof targetEnabled === 'boolean' ? targetEnabled : !cachedState.enabled
    if (psProcess && psProcess.stdin) {
      psProcess.stdin.write(`SET:${nextState}\n`)
    }
    cachedState = { enabled: nextState }
    return cachedState
  })
}
