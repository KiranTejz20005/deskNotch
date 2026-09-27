import path from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import serve from 'electron-serve'
import { startSmtc, stopSmtc } from './smtc'
import { registerIpc } from './ipc'
import { stopMediaIpc } from './ipc/media'
import { stopPrivacyIpc } from './ipc/privacy'
import { stopUsageIpc } from './ipc/usage'
import { startScreenshotWatch, stopScreenshotWatch } from './ipc/screenshots'
import { readStore } from './store'
import { getAllActiveWindows, resolveTargetDisplay, setMainWindowForDisplay, setupDisplayListeners, updateNotchWindowPosition } from './display'
import { startFullscreenWatch, stopFullscreenWatch } from './fullscreen'
import { createTray, destroyTray, showDeskNotch } from './tray'
import { registerGlobalShortcut, unregisterAllShortcuts, DEFAULT_SHORTCUT } from './ipc/shortcut'

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showDeskNotch()
  })
}

const isProd = process.env.NODE_ENV === 'production'

const STRIP_HEIGHT = 500

if (isProd) {
  serve({ directory: 'app' })
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.devezio.desknotch')
  }

  const initialSettings = (readStore().settings ?? {}) as Record<string, unknown>
  const targetDisplay = resolveTargetDisplay(initialSettings.selectedDisplayId as string)
  const { width: screenWidth, x: screenX, y: screenY } = targetDisplay.bounds

  const mainWindow = new BrowserWindow({
    width: screenWidth,
    height: STRIP_HEIGHT,
    x: screenX,
    y: screenY,
    title: 'deskNotch',
    transparent: true,
    hasShadow: false,
    frame: false,
    resizable: true,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    // A tool window: Windows never lists these on the taskbar or in Alt+Tab,
    // even after it takes focus (plain skipTaskbar can be lost then).
    type: 'toolbar',
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true)
  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  type Rect = { x: number; y: number; width: number; height: number }
  const windowBoundsMap = new Map<number, Rect[]>()
  const windowInteractiveMap = new Map<number, boolean>()
  const windowCursorMap = new Map<number, string>()

  const applyCursorHitTest = () => {
    const { x, y } = screen.getCursorScreenPoint()
    const activeWins = getAllActiveWindows()

    for (const win of activeWins) {
      if (win.isDestroyed() || !win.isVisible()) continue

      const windowBounds = win.getBounds()
      const notchBounds = windowBoundsMap.get(win.id) || []

      const inside = notchBounds.some(
        (r) =>
          x >= windowBounds.x + r.x &&
          x <= windowBounds.x + r.x + r.width &&
          y >= windowBounds.y + r.y &&
          y <= windowBounds.y + r.y + r.height,
      )

      const at = `${x - windowBounds.x},${y - windowBounds.y}`
      if (at !== windowCursorMap.get(win.id)) {
        windowCursorMap.set(win.id, at)
        win.webContents.send('notch:cursor', { x: x - windowBounds.x, y: y - windowBounds.y })
      }

      const interactive = windowInteractiveMap.get(win.id) ?? false
      if (inside !== interactive) {
        windowInteractiveMap.set(win.id, inside)
        win.setIgnoreMouseEvents(!inside, { forward: true })
      }
    }
  }

  setInterval(applyCursorHitTest, 60)

  ipcMain.on('notch:bounds', (event, bounds: Rect[] | Rect) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      windowBoundsMap.set(win.id, Array.isArray(bounds) ? bounds : [bounds])
    }
  })

  ipcMain.on('notch:pinned', (event, isPinned: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) {
      if (isPinned) win.focus()
      else win.blur()
      win.setSkipTaskbar(true)
    }
  })

  ipcMain.on('notch:playback_session', (_event, session: any) => {
    mainWindow.webContents.send('notch:playback_session', session)
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home').catch((err) => console.error('Failed to load prod URL:', err))
  } else {
    const port = process.argv[2] || '8888'
    try {
      await mainWindow.loadURL(`http://localhost:${port}/home`)
    } catch (err) {
      console.error('Dev server load failed, falling back to app://:', err)
      await mainWindow.loadURL('app://./home').catch(() => {})
    }
  }

  registerIpc()
  setMainWindowForDisplay(mainWindow)
  updateNotchWindowPosition(STRIP_HEIGHT)
  setupDisplayListeners(STRIP_HEIGHT)
  startSmtc(mainWindow)
  startScreenshotWatch()
  startFullscreenWatch(mainWindow)
  createTray(mainWindow)

  const savedShortcut = (initialSettings.keyboardShortcut as string) || DEFAULT_SHORTCUT
  registerGlobalShortcut(savedShortcut)
})

const cleanupAndQuit = () => {
  unregisterAllShortcuts()
  destroyTray()
  stopSmtc()
  stopMediaIpc()
  stopPrivacyIpc()
  stopUsageIpc()
  stopScreenshotWatch()
  stopFullscreenWatch()
}

app.on('window-all-closed', () => {
  cleanupAndQuit()
  app.quit()
})

app.on('will-quit', () => {
  cleanupAndQuit()
})
