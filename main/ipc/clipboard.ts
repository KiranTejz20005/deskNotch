import { ipcMain, clipboard, BrowserWindow } from 'electron'

export interface ClipboardItem {
  id: string
  text: string
  timestamp: number
}

const MAX_ITEMS = 50
let history: ClipboardItem[] = []
let enabled = true
let lastText = ''
let monitorTimer: NodeJS.Timeout | null = null

function checkClipboard() {
  if (!enabled) return
  try {
    const text = clipboard.readText()
    if (!text || text.trim() === '' || text === lastText) return
    lastText = text

    const item: ClipboardItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      timestamp: Date.now(),
    }

    // Filter out duplicates and keep top MAX_ITEMS
    history = [item, ...history.filter((h) => h.text !== text)].slice(0, MAX_ITEMS)

    // Notify renderers of updated history
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) {
        w.webContents.send('clipboard:history-changed', history)
      }
    })
  } catch {}
}

function startMonitoring() {
  if (monitorTimer) return
  monitorTimer = setInterval(checkClipboard, 1500)
}

function stopMonitoring() {
  if (monitorTimer) {
    clearInterval(monitorTimer)
    monitorTimer = null
  }
}

export function registerClipboardIpc() {
  startMonitoring()

  ipcMain.handle('clipboard:get-history', () => history)

  ipcMain.handle('clipboard:copy', (_event, text: unknown) => {
    if (typeof text === 'string' && text.length > 0) {
      clipboard.writeText(text)
      lastText = text
    }
    return true
  })

  ipcMain.handle('clipboard:clear', () => {
    history = []
    lastText = ''
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) {
        w.webContents.send('clipboard:history-changed', history)
      }
    })
    return true
  })

  ipcMain.handle('clipboard:toggle-enabled', (_event, on: unknown) => {
    enabled = Boolean(on)
    if (enabled) {
      startMonitoring()
    } else {
      stopMonitoring()
    }
    return enabled
  })
}
