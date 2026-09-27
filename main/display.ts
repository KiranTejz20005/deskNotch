import path from 'path'
import { screen, BrowserWindow, Display } from 'electron'
import { readStore, writeStore } from './store'

const isProd = process.env.NODE_ENV === 'production'

export interface DisplayInfo {
  id: string
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  workArea: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
}

export function getDisplaysInfo(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay()
  const all = screen.getAllDisplays()

  return all.map((d, index) => {
    const isPrimary = d.id === primary.id
    const res = `${d.bounds.width}×${d.bounds.height}`
    const label = `Display ${index + 1} (${res})`
    return {
      id: String(d.id),
      label,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
      isPrimary,
    }
  })
}

export function resolveTargetDisplay(selectedDisplayId?: string): Display {
  const allDisplays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()

  if (!selectedDisplayId || selectedDisplayId === 'primary') {
    return primaryDisplay
  }

  const found = allDisplays.find(
    (d, idx) => String(d.id) === selectedDisplayId || `display-${idx}` === selectedDisplayId
  )
  return found || primaryDisplay
}

let mainWindowRef: BrowserWindow | null = null
let extraWindows: BrowserWindow[] = []

export function setMainWindowForDisplay(win: BrowserWindow) {
  mainWindowRef = win
}

export function getAllActiveWindows(): BrowserWindow[] {
  const list: BrowserWindow[] = []
  if (mainWindowRef && !mainWindowRef.isDestroyed()) list.push(mainWindowRef)
  for (const win of extraWindows) {
    if (win && !win.isDestroyed()) list.push(win)
  }
  return list
}

function positionWindowOnDisplay(win: BrowserWindow, display: Display, STRIP_HEIGHT: number) {
  const newBounds = {
    x: Math.round(display.bounds.x),
    y: Math.round(display.bounds.y),
    width: Math.round(display.bounds.width),
    height: STRIP_HEIGHT,
  }

  win.setMovable(true)
  win.setResizable(true)
  win.setBounds(newBounds)
  win.setPosition(newBounds.x, newBounds.y)
}

function createExtraNotchWindow(display: Display, STRIP_HEIGHT: number): BrowserWindow {
  const win = new BrowserWindow({
    width: Math.round(display.bounds.width),
    height: STRIP_HEIGHT,
    x: Math.round(display.bounds.x),
    y: Math.round(display.bounds.y),
    title: 'deskNotch',
    transparent: true,
    hasShadow: false,
    frame: false,
    resizable: true,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    type: 'toolbar',
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true)
  win.setIgnoreMouseEvents(true, { forward: true })

  if (isProd) {
    win.loadURL('app://./home').catch(() => {})
  } else {
    const port = process.argv[2] || '8888'
    win.loadURL(`http://localhost:${port}/home`).catch(() => {
      win.loadURL('app://./home').catch(() => {})
    })
  }

  return win
}

export function updateNotchWindowPosition(STRIP_HEIGHT: number = 500) {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  const store = readStore()
  const settings = (store.settings ?? {}) as Record<string, unknown>
  const primaryDisplay = screen.getPrimaryDisplay()
  const rawDisplays = screen.getAllDisplays()
  if (rawDisplays.length === 0) return

  const sortedDisplays = [
    primaryDisplay,
    ...rawDisplays.filter((d) => d.id !== primaryDisplay.id).sort((a, b) => a.bounds.x - b.bounds.x),
  ]

  let selectedDisplayId = (settings.selectedDisplayId as string) || 'both'
  if (selectedDisplayId === 'primary') {
    selectedDisplayId = String(primaryDisplay.id)
  }

  if (selectedDisplayId === 'both') {
    // 1. Main window on Primary Display
    positionWindowOnDisplay(mainWindowRef, sortedDisplays[0], STRIP_HEIGHT)

    // 2. Extra windows for Display 1..N
    const targetExtraDisplays = sortedDisplays.slice(1)

    // Clean up excess extra windows
    while (extraWindows.length > targetExtraDisplays.length) {
      const w = extraWindows.pop()
      if (w && !w.isDestroyed()) w.destroy()
    }

    targetExtraDisplays.forEach((disp, idx) => {
      let win = extraWindows[idx]
      if (!win || win.isDestroyed()) {
        win = createExtraNotchWindow(disp, STRIP_HEIGHT)
        extraWindows[idx] = win
      } else {
        positionWindowOnDisplay(win, disp, STRIP_HEIGHT)
      }
    })
  } else {
    // Single display selected -> Destroy all extra windows
    while (extraWindows.length > 0) {
      const w = extraWindows.pop()
      if (w && !w.isDestroyed()) w.destroy()
    }

    const targetDisplay = resolveTargetDisplay(selectedDisplayId)
    positionWindowOnDisplay(mainWindowRef, targetDisplay, STRIP_HEIGHT)
  }

  notifyDisplaysChanged()
}

export function notifyDisplaysChanged() {
  const windows = getAllActiveWindows()
  const info = getDisplaysInfo()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('display:changed', info)
    }
  }
}

export function setupDisplayListeners(STRIP_HEIGHT: number = 500) {
  const handler = () => {
    const store = readStore()
    const settings = (store.settings ?? {}) as Record<string, unknown>
    const selectedDisplayId = settings.selectedDisplayId as string
    if (selectedDisplayId && selectedDisplayId !== 'both' && selectedDisplayId !== 'primary') {
      const allDisplays = screen.getAllDisplays()
      const exists = allDisplays.some(
        (d, idx) => String(d.id) === selectedDisplayId || `display-${idx}` === selectedDisplayId
      )
      if (!exists) {
        writeStore({
          ...store,
          settings: { ...settings, selectedDisplayId: 'both' },
        })
      }
    }
    updateNotchWindowPosition(STRIP_HEIGHT)
  }

  screen.on('display-added', handler)
  screen.on('display-removed', handler)
  screen.on('display-metrics-changed', handler)
}
