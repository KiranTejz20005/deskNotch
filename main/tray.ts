import { app, Menu, nativeImage, Tray, type NativeImage, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { notchWindows } from './display'

let tray: Tray | null = null

export function getTrayIcon(): NativeImage {
  const candidatePaths = [
    path.join(process.cwd(), 'resources', 'icon.ico'),
    path.join(process.cwd(), 'resources', 'icon.png'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(app.getAppPath(), 'resources', 'icon.ico'),
    path.join(app.getAppPath(), 'resources', 'icon.png'),
    path.join(app.getAppPath(), '..', 'resources', 'icon.ico'),
    path.join(import.meta.dirname, '..', 'resources', 'icon.ico'),
    path.join(import.meta.dirname, '..', '..', 'resources', 'icon.ico'),
  ]

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p)
        if (!img.isEmpty()) return img
      } catch {}
    }
  }

  // Fallback 16x16 PNG notch icon so system tray icon is never blank/invisible
  const fallbackBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAwSURBVDhPY2AYBaNgFCx4wIBD8///jwP+x8bGBjAZhmGAKs4Aupn/o2AUjIJRMApGAAIAy+0aGk4n9mMAAAAASUVORK5CYII='
  return nativeImage.createFromDataURL(fallbackBase64)
}

export function createTray(window?: BrowserWindow): Tray {
  if (tray) return tray

  const icon = getTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('deskNotch')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'deskNotch',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show deskNotch',
      click: () => {
        showDeskNotch()
      },
    },
    {
      label: 'Settings',
      click: () => {
        openSettings()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit deskNotch',
      click: () => {
        quitApp()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    showDeskNotch()
  })

  return tray
}

export function showDeskNotch() {
  for (const [, win] of notchWindows()) {
    if (win && !win.isDestroyed()) {
      win.showInactive()
      win.setAlwaysOnTop(true, 'screen-saver')
      win.setVisibleOnAllWorkspaces(true)
      win.setSkipTaskbar(true)
      win.webContents.send('notch:open')
    }
  }
}

export function openSettings() {
  showDeskNotch()
  for (const [, win] of notchWindows()) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('notch:navigate', 'settings')
    }
  }
}

export function destroyTray() {
  if (tray) {
    try {
      tray.destroy()
    } catch {}
    tray = null
  }
}

export function quitApp() {
  destroyTray()
  app.quit()
}
