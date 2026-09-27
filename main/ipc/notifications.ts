import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'

export interface SystemNotification {
  id: string
  appName: string
  title: string
  body: string
  timestamp: number
  read: boolean
}

export interface NotificationStoreState {
  available: boolean
  statusText?: string
  notifications: SystemNotification[]
}

let history: SystemNotification[] = []
let available = true
let statusText = 'Listening for Windows notifications'
let psProcess: ChildProcess | null = null

function initNotificationProcess() {
  if (process.platform !== 'win32') {
    available = false
    statusText = 'Windows notification access only'
    return
  }

  const psScript = `
$code = @"
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;

public class WinNotifListener {
    public static string GetNotificationsJson() {
        try {
            var listener = UserNotificationListener.Current;
            var access = listener.GetAccessStatus();
            if (access != UserNotificationListenerAccessStatus.Allowed) {
                return "STATUS:PERMISSION_REQUIRED";
            }
            var toasts = listener.GetNotificationsAsync(NotificationKinds.Toast).AsTask().Result;
            var list = new List<string>();
            foreach (var n in toasts) {
                try {
                    string app = n.AppInfo?.DisplayInfo?.DisplayName ?? "Windows";
                    var binding = n.Notification.Visual.GetBinding(KnownNotificationBindingTexts.ToastGeneric);
                    if (binding != null) {
                        var el = binding.GetTextElements();
                        string title = el.Count > 0 ? el[0].Text : "";
                        string body = el.Count > 1 ? el[1].Text : "";
                        long ts = n.CreationTime.ToUnixTimeMilliseconds();
                        string id = n.Id.ToString();
                        // Escape quotes
                        title = title.Replace("\\\\", "\\\\\\\\").Replace("\"", "\\\"");
                        body = body.Replace("\\\\", "\\\\\\\\").Replace("\"", "\\\"");
                        app = app.Replace("\\\\", "\\\\\\\\").Replace("\"", "\\\"");
                        list.Add(string.Format("{{\"id\":\"{0}\",\"appName\":\"{1}\",\"title\":\"{2}\",\"body\":\"{3}\",\"timestamp\":{4}}}", id, app, title, body, ts));
                    }
                } catch {}
            }
            return "DATA:[" + string.Join(",", list) + "]";
        } catch (Exception ex) {
            return "STATUS:UNAVAILABLE:" + ex.Message.Replace("\r", "").Replace("\n", " ");
        }
    }
}
"@
Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue

$reader = [Console]::In
while ($null -ne ($line = $reader.ReadLine())) {
    $line = $line.Trim()
    if ($line -eq "POLL") {
        $res = [WinNotifListener]::GetNotificationsJson()
        Write-Output $res
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
        if (trimmed.startsWith('STATUS:PERMISSION_REQUIRED')) {
          available = false
          statusText = 'Windows notification access permission required'
          broadcast()
        } else if (trimmed.startsWith('STATUS:UNAVAILABLE:')) {
          available = false
          statusText = trimmed.substring(19)
          broadcast()
        } else if (trimmed.startsWith('DATA:')) {
          try {
            const rawJson = trimmed.substring(5)
            const items = JSON.parse(rawJson) as Array<{ id: string; appName: string; title: string; body: string; timestamp: number }>
            
            let updated = false
            for (const item of items) {
              if (!history.some((existing) => existing.id === item.id)) {
                history.unshift({
                  id: item.id || String(Date.now()),
                  appName: item.appName || 'Windows',
                  title: item.title || 'Notification',
                  body: item.body || '',
                  timestamp: item.timestamp || Date.now(),
                  read: false,
                })
                updated = true
              }
            }

            // Cap history to max 50 items
            if (history.length > 50) {
              history = history.slice(0, 50)
              updated = true
            }

            available = true
            statusText = 'Active'

            if (updated) {
              broadcast()
            }
          } catch {}
        }
      }
    })

    psProcess.on('exit', () => {
      psProcess = null
    })
  } catch (err) {
    available = false
    statusText = 'Notification listener unavailable'
  }

  // Poll notifications at conservative low-frequency (every 12 seconds)
  setInterval(() => {
    if (psProcess && psProcess.stdin && available) {
      psProcess.stdin.write('POLL\n')
    }
  }, 12000)
}

function broadcast() {
  const payload: NotificationStoreState = {
    available,
    statusText,
    notifications: history,
  }
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('notifications:change', payload)
    }
  })
}

export function setupNotificationsIpc() {
  initNotificationProcess()

  ipcMain.handle('notifications:get', () => {
    return {
      available,
      statusText,
      notifications: history,
    } as NotificationStoreState
  })

  ipcMain.handle('notifications:mark-read', (_evt, id: string) => {
    history = history.map((n) => (n.id === id ? { ...n, read: true } : n))
    broadcast()
    return history
  })

  ipcMain.handle('notifications:dismiss', (_evt, id: string) => {
    history = history.filter((n) => n.id !== id)
    broadcast()
    return history
  })

  ipcMain.handle('notifications:clear', () => {
    history = []
    broadcast()
    return history
  })
}
