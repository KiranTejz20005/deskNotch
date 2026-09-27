/** Generic get/set over the persisted store. */
import { ipcMain, BrowserWindow } from 'electron'
import { readStore, writeStore, type StoreShape } from '../store'
import { updateNotchWindowPosition } from '../display'
import { checkAndApplyFullscreenState } from '../fullscreen'

export function registerStoreIpc() {
  ipcMain.handle('store:get', (_event, key: keyof StoreShape) => readStore()[key])

  ipcMain.handle('store:set', (_event, key: keyof StoreShape, value: unknown) => {
    const nextStore = { ...readStore(), [key]: value } as StoreShape
    writeStore(nextStore)
    if (key === 'settings') {
      updateNotchWindowPosition()
      checkAndApplyFullscreenState()
    }
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('store:changed', { key, value, store: nextStore })
      }
    })
    return true
  })
}
