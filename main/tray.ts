import { app, BrowserWindow, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { isCurrentFullscreenMatch, checkAndApplyFullscreenState } from './fullscreen'

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null

export function getTrayIcon(): NativeImage {
  const candidatePaths = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(app.getAppPath(), 'resources', 'icon.ico'),
    path.join(app.getAppPath(), '..', 'resources', 'icon.ico'),
    path.join(import.meta.dirname, '..', 'resources', 'icon.ico'),
    path.join(import.meta.dirname, '..', '..', 'resources', 'icon.ico'),
  ]

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) return img
    }
  }

  return nativeImage.createEmpty()
}

export function createTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow
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
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  if (isCurrentFullscreenMatch()) {
    checkAndApplyFullscreenState()
    return
  }

  mainWindowRef.showInactive()
  mainWindowRef.setAlwaysOnTop(true, 'screen-saver')
  mainWindowRef.setVisibleOnAllWorkspaces(true)
  mainWindowRef.setSkipTaskbar(true)
}

export function openSettings() {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  showDeskNotch()
  mainWindowRef.webContents.send('notch:navigate', 'settings')
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
