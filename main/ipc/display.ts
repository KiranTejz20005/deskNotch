import { ipcMain } from 'electron'
import { getDisplaysInfo } from '../display'

export function registerDisplayIpc() {
  ipcMain.handle('display:get-all', () => getDisplaysInfo())
}
