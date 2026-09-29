/**
 * Screen time from DeskTime (github.com/ManasJhaMJ/DeskTime), a separate app.
 *
 * DeskTime has no API or pub/sub: it keeps everything in a local SQLite file.
 * So it is read directly, read-only, with the same sum DeskTime's own
 * dashboard and tray use for "screen time today". No DeskTime, no database,
 * no reading: the notch's option stays greyed out with a download link.
 */
import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'

export const DESKTIME_URL = 'https://github.com/ManasJhaMJ/DeskTime/releases/latest'

const dbFile = () => path.join(process.env.APPDATA ?? '', 'DeskTime', 'desktime.db')

/** DeskTime's own query (db.ts dayTotals): active + idle, hidden apps left out. */
const TODAY_SQL = `
  SELECT COALESCE(SUM(u.screen), 0) AS screen FROM (
    SELECT app_id, end_ts - start_ts AS screen FROM sessions WHERE day = ?
    UNION ALL
    SELECT app_id, active + idle FROM daily_totals WHERE day = ?
  ) u JOIN apps a ON a.id = u.app_id JOIN apps e ON e.id = COALESCE(a.merged_into, a.id)
  WHERE e.hidden = 0`

/** DeskTime's day label: late nights before its day-start hour count toward yesterday. */
const dayLabel = (now: Date, dayStartHour: number) => {
  const d = new Date(now)
  if (d.getHours() < dayStartHour) d.setDate(d.getDate() - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export interface ScreenTime {
  installed: boolean
  /** Today's screen time in ms, or null when it could not be read. */
  ms: number | null
}

function readScreenTime(): ScreenTime {
  const file = dbFile()
  if (!fs.existsSync(file)) return { installed: false, ms: null }
  let db: import('node:sqlite').DatabaseSync | undefined
  try {
    // getBuiltinModule, not import: the main bundle's webpack does not know node:sqlite.
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite')
    db = new DatabaseSync(file, { readOnly: true })
    const saved = db.prepare("SELECT value FROM settings WHERE key = 'settings'").get() as { value?: string } | undefined
    const hour = Number(JSON.parse(saved?.value ?? '{}').dayStartHour) || 0
    const day = dayLabel(new Date(), hour)
    const row = db.prepare(TODAY_SQL).get(day, day) as { screen: number }
    return { installed: true, ms: Number(row.screen) }
  } catch (err) {
    // A schema change in a newer DeskTime, or the file mid-migration.
    console.error('[desktime] read failed:', err)
    return { installed: true, ms: null }
  } finally {
    db?.close()
  }
}

export function registerDesktimeIpc() {
  ipcMain.handle('desktime:screen-time', () => readScreenTime())
  ipcMain.handle('desktime:download', () => shell.openExternal(DESKTIME_URL))
}
