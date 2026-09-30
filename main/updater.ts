/**
 * Updates over the air, from GitHub Releases (electron-builder.yml `publish`).
 *
 * A build published with `--publish always` puts `latest.yml` beside the
 * installer; the installed app reads it, downloads a newer installer in the
 * background, and installs it when the app quits, or at once on Restart to
 * update in Settings. A dev run never checks: there is nothing to replace.
 */
import { app, BrowserWindow, ipcMain } from 'electron'

export type UpdateState =
  | { status: 'dev' | 'store' | 'idle' | 'checking' | 'none' | 'error'; version: string }
  | { status: 'downloading'; version: string; next: string; percent: number }
  | { status: 'ready'; version: string; next: string }

/** How often a running app looks again. */
const EVERY = 6 * 60 * 60 * 1000

/** The Microsoft Store build: the Store installs its updates, so this stays out of its way. */
const store = process.windowsStore === true

let state: UpdateState = { status: store ? 'store' : app.isPackaged ? 'idle' : 'dev', version: app.getVersion() }
let autoUpdater: any = null

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const electronUpdater = require('electron-updater')
  autoUpdater = electronUpdater.default?.autoUpdater ?? electronUpdater.autoUpdater
} catch {}

const publish = (next: UpdateState) => {
  state = next
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('update:state', state)
}

const check = () => {
  if (!app.isPackaged || store || !autoUpdater) return
  void autoUpdater.checkForUpdates().catch(() => publish({ status: 'error', version: app.getVersion() }))
}

export function startUpdater() {
  ipcMain.handle('update:get', () => state)
  ipcMain.handle('update:check', () => check())
  // Silent install, and the app comes back by itself afterwards.
  ipcMain.handle('update:install', () => state.status === 'ready' && autoUpdater?.quitAndInstall(true, true))

  if (!app.isPackaged || store || !autoUpdater) return
  const version = app.getVersion()
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => publish({ status: 'checking', version }))
  autoUpdater.on('update-not-available', () => publish({ status: 'none', version }))
  autoUpdater.on('update-available', (info: { version: string }) =>
    publish({ status: 'downloading', version, next: info.version, percent: 0 }),
  )
  autoUpdater.on('download-progress', (p: { percent: number }) =>
    publish({ status: 'downloading', version, next: state.status === 'downloading' ? state.next : '', percent: Math.round(p.percent) }),
  )
  autoUpdater.on('update-downloaded', (info: { version: string }) => publish({ status: 'ready', version, next: info.version }))
  autoUpdater.on('error', () => publish({ status: 'error', version }))

  // Not at launch, with everything else starting: a minute in, then every six hours.
  setTimeout(check, 60_000)
  setInterval(check, EVERY)
}
