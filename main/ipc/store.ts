/** Generic get/set over the persisted store. */
import { BrowserWindow, ipcMain } from 'electron'
import { readStore, writeStore, type StoreShape } from '../store'
import { syncNotchWindows } from '../display'
import { checkAndApplyFullscreenState } from '../fullscreen'
import { applyContentProtection } from './system'

/** Tells every notch but `except` that `key` changed, so a notch on another
 *  display shows the same tasks, settings and shelf, and its next save does
 *  not put back what it had. */
export const announceStore = (key: keyof StoreShape, value: unknown, except?: Electron.WebContents) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.webContents !== except) window.webContents.send('store:changed', key, value)
  }
}

export function registerStoreIpc() {
  ipcMain.handle('store:get', (_event, key: keyof StoreShape) => readStore()[key])

  ipcMain.handle('store:set', (event, key: keyof StoreShape, value: unknown) => {
    // A notch that took an announced value saves it straight back; stopping
    // here is what keeps that from echoing between windows forever.
    if (JSON.stringify(readStore()[key]) === JSON.stringify(value)) return true
    writeStore({ ...readStore(), [key]: value } as StoreShape)
    announceStore(key, value, event.sender)
    if (key === 'settings') {
      syncNotchWindows()
      checkAndApplyFullscreenState()
      applyContentProtection()
    }
    return true
  })
}
