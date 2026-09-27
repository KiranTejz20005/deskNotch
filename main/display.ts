import { screen, BrowserWindow, Display } from 'electron'
import { readStore } from './store'

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
    const name = d.label && d.label.trim() ? d.label : `Display ${index + 1}`
    const res = `${d.bounds.width}×${d.bounds.height}`
    const label = isPrimary ? `${name} (Primary · ${res})` : `${name} (${res})`
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

export function setMainWindowForDisplay(win: BrowserWindow) {
  mainWindowRef = win
}

export function updateNotchWindowPosition(STRIP_HEIGHT: number = 500) {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  const store = readStore()
  const settings = (store.settings ?? {}) as Record<string, unknown>
  const selectedDisplayId = (settings.selectedDisplayId as string) || 'primary'
  const targetDisplay = resolveTargetDisplay(selectedDisplayId)

  const newBounds = {
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: STRIP_HEIGHT,
  }

  mainWindowRef.setBounds(newBounds)
  mainWindowRef.setPosition(newBounds.x, newBounds.y)
  notifyDisplaysChanged()
}

export function notifyDisplaysChanged() {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return
  mainWindowRef.webContents.send('display:changed', getDisplaysInfo())
}

export function setupDisplayListeners(STRIP_HEIGHT: number = 500) {
  const handler = () => updateNotchWindowPosition(STRIP_HEIGHT)

  screen.on('display-added', handler)
  screen.on('display-removed', handler)
  screen.on('display-metrics-changed', handler)
}
