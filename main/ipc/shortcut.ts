import { ipcMain, globalShortcut, BrowserWindow } from 'electron'
import { readStore, writeStore } from '../store'
import { showDeskNotch } from '../tray'

export const DEFAULT_SHORTCUT = 'Ctrl+Alt+Space'

let activeShortcut: string | null = null

export function showDeskNotchAndOpen() {
  // Show window using existing tray/fullscreen/display logic
  showDeskNotch()

  // Notify renderer to expand/keepOpen deskNotch
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('notch:open')
    }
  })
}

export function validateAccelerator(acc: string): boolean {
  if (!acc || typeof acc !== 'string') return false
  const parts = acc.split('+').map((p) => p.trim())
  if (parts.length < 2) return false // Require at least 1 modifier + 1 key

  const validModifiers = new Set([
    'ctrl',
    'control',
    'alt',
    'option',
    'shift',
    'cmd',
    'command',
    'super',
    'commandorcontrol',
    'cmdorctrl',
  ])

  const modifiers = parts.filter((p) => validModifiers.has(p.toLowerCase()))
  const keys = parts.filter((p) => !validModifiers.has(p.toLowerCase()))

  return modifiers.length >= 1 && keys.length === 1 && keys[0].length > 0
}

export function registerGlobalShortcut(accelerator: string): { success: boolean; shortcut: string; error?: string } {
  const trimmed = (accelerator || '').trim()

  if (!trimmed) {
    if (activeShortcut) {
      try {
        globalShortcut.unregister(activeShortcut)
      } catch {}
      activeShortcut = null
    }
    return { success: true, shortcut: '' }
  }

  if (!validateAccelerator(trimmed)) {
    return {
      success: false,
      shortcut: activeShortcut || DEFAULT_SHORTCUT,
      error: 'Invalid key combination. Must include at least one modifier key (Ctrl, Alt, Shift).',
    }
  }

  // If already registered and same, return success
  if (activeShortcut === trimmed && globalShortcut.isRegistered(trimmed)) {
    return { success: true, shortcut: trimmed }
  }

  const prev = activeShortcut
  if (prev) {
    try {
      globalShortcut.unregister(prev)
    } catch {}
  }

  try {
    const ok = globalShortcut.register(trimmed, () => {
      showDeskNotchAndOpen()
    })

    if (ok && globalShortcut.isRegistered(trimmed)) {
      activeShortcut = trimmed
      return { success: true, shortcut: trimmed }
    }
  } catch (err: any) {
    console.error(`[shortcut] Failed to register ${trimmed}:`, err)
  }

  // Registration failed or occupied by another app: restore previous if valid
  if (prev && validateAccelerator(prev)) {
    try {
      globalShortcut.register(prev, () => {
        showDeskNotchAndOpen()
      })
      activeShortcut = prev
    } catch {}
  } else {
    activeShortcut = null
  }

  return {
    success: false,
    shortcut: activeShortcut || DEFAULT_SHORTCUT,
    error: 'Shortcut unavailable. It is already being used by another application.',
  }
}

export function unregisterAllShortcuts() {
  try {
    globalShortcut.unregisterAll()
  } catch {}
  activeShortcut = null
}

export function registerShortcutIpc() {
  ipcMain.handle('shortcut:get', () => {
    const store = readStore()
    const saved = (store.settings?.keyboardShortcut as string) ?? DEFAULT_SHORTCUT
    const active = activeShortcut ? globalShortcut.isRegistered(activeShortcut) : false
    return {
      shortcut: activeShortcut || saved,
      active,
    }
  })

  ipcMain.handle('shortcut:set', (_evt, newShortcut: string) => {
    const result = registerGlobalShortcut(newShortcut)

    if (result.success) {
      const store = readStore()
      store.settings = { ...store.settings, keyboardShortcut: result.shortcut }
      writeStore(store)
    }

    return result
  })

  ipcMain.handle('shortcut:reset', () => {
    const result = registerGlobalShortcut(DEFAULT_SHORTCUT)
    if (result.success) {
      const store = readStore()
      store.settings = { ...store.settings, keyboardShortcut: DEFAULT_SHORTCUT }
      writeStore(store)
    }
    return result
  })
}
