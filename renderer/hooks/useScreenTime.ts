import { useEffect, useState } from 'react'

export interface ScreenTime {
  /** ScreenWise is on this PC: its database exists. */
  installed: boolean
  /** Today's screen time in ms, as ScreenWise counts it; null when unreadable. */
  ms: number | null
}

/** Today's screen time from ScreenWise. Always checked once (Settings needs to
 *  know it is installed); re-read every minute only while `live`. */
export function useScreenTime(live: boolean): ScreenTime {
  const [state, setState] = useState<ScreenTime>({ installed: false, ms: null })
  useEffect(() => {
    const read = () =>
      window.bridge
        ?.invoke<ScreenTime>('desktime:screen-time')
        .then(setState)
        .catch(() => {})
    read()
    // ScreenWise writes every 15s; a minute is plenty for an h/m reading.
    const timer = live ? setInterval(read, 60_000) : undefined
    return () => clearInterval(timer)
  }, [live])
  return state
}

/** "3h 44m", or "12m" under an hour. */
export const formatScreenTime = (ms: number) => {
  const minutes = Math.floor(ms / 60_000)
  const h = Math.floor(minutes / 60)
  return h ? `${h}h ${minutes % 60}m` : `${minutes}m`
}
