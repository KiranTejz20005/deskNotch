import { BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { readStore } from './store'
import { resolveTargetDisplay } from './display'

let watcherProcess: ChildProcess | null = null
let mainWindowRef: BrowserWindow | null = null
let isHiddenByFullscreen = false
let lastRawResult: string = 'false'

const SCRIPT = (parentPid: number) => `
$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class FullscreenCheck {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MONITORINFO {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [DllImport("user32.dll")]
    public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public const uint MONITOR_DEFAULTTONEAREST = 2;

    public static string IsForegroundFullscreen() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "false";

        StringBuilder className = new StringBuilder(256);
        GetClassName(hwnd, className, 256);
        string cls = className.ToString();

        if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd") {
            return "false";
        }

        StringBuilder title = new StringBuilder(256);
        GetWindowText(hwnd, title, 256);
        if (title.ToString() == "deskNotch") {
            return "false";
        }

        RECT rect;
        if (!GetWindowRect(hwnd, out rect)) return "false";

        IntPtr hMonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        MONITORINFO mi = new MONITORINFO();
        mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));

        if (!GetMonitorInfo(hMonitor, ref mi)) return "false";

        bool coversWidth = (rect.Left <= mi.rcMonitor.Left + 2) && (rect.Right >= mi.rcMonitor.Right - 2);
        bool coversHeight = (rect.Top <= mi.rcMonitor.Top + 2) && (rect.Bottom >= mi.rcMonitor.Bottom - 2);
        bool isFullscreen = coversWidth && coversHeight;

        if (isFullscreen) {
            return string.Format("{0},{1},{2},{3}", mi.rcMonitor.Left, mi.rcMonitor.Top, mi.rcMonitor.Right, mi.rcMonitor.Bottom);
        }

        return "false";
    }
}
"@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$last = ""
while ($true) {
  if (-not (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue)) { exit }
  $res = [FullscreenCheck]::IsForegroundFullscreen()
  if ($res -ne $last) {
    Write-Output $res
    $last = $res
  }
  Start-Sleep -Milliseconds 300
}
`

export function startFullscreenWatch(win: BrowserWindow) {
  mainWindowRef = win
  if (process.platform !== 'win32') return

  if (watcherProcess) return

  try {
    watcherProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT(process.pid)], {
      windowsHide: true,
    })

    let buffer = ''
    watcherProcess.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) {
          handleFullscreenChange(trimmed)
        }
      }
    })

    watcherProcess.on('error', (err) => {
      console.error('[fullscreen] watcher error:', err)
    })

    watcherProcess.on('exit', () => {
      watcherProcess = null
    })
  } catch (err) {
    console.error('[fullscreen] failed to start watcher:', err)
  }
}

export function stopFullscreenWatch() {
  if (watcherProcess) {
    watcherProcess.kill()
    watcherProcess = null
  }
}

export function checkAndApplyFullscreenState() {
  handleFullscreenChange(lastRawResult)
}

function handleFullscreenChange(rawResult: string) {
  lastRawResult = rawResult
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  const store = readStore()
  const settings = (store.settings ?? {}) as Record<string, unknown>
  const hideOnFullscreen = settings.hideOnFullscreen !== false

  if (!hideOnFullscreen) {
    if (isHiddenByFullscreen) {
      restoreWindow()
    }
    return
  }

  if (rawResult === 'false') {
    if (isHiddenByFullscreen) {
      restoreWindow()
    }
  } else {
    const parts = rawResult.split(',').map(Number)
    if (parts.length === 4 && !parts.some(isNaN)) {
      const [fsLeft, fsTop, fsRight, fsBottom] = parts

      const selectedDisplayId = (settings.selectedDisplayId as string) || 'primary'
      const targetDisplay = resolveTargetDisplay(selectedDisplayId)

      const targetLeft = targetDisplay.bounds.x
      const targetTop = targetDisplay.bounds.y
      const targetRight = targetDisplay.bounds.x + targetDisplay.bounds.width
      const targetBottom = targetDisplay.bounds.y + targetDisplay.bounds.height

      const isMatch = fsLeft < targetRight && fsRight > targetLeft && fsTop < targetBottom && fsBottom > targetTop

      if (isMatch) {
        if (!isHiddenByFullscreen) {
          hideWindow()
        }
      } else {
        if (isHiddenByFullscreen) {
          restoreWindow()
        }
      }
    }
  }
}

function hideWindow() {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return
  isHiddenByFullscreen = true
  mainWindowRef.hide()
}

function restoreWindow() {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return
  isHiddenByFullscreen = false
  mainWindowRef.showInactive()
  mainWindowRef.setAlwaysOnTop(true, 'screen-saver')
  mainWindowRef.setVisibleOnAllWorkspaces(true)
  mainWindowRef.setSkipTaskbar(true)
}
