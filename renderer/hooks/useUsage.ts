import { useEffect, useState } from 'react'

/** Mirrors Usage in main/ipc/usage.ts. */
export interface Usage {
  /** Shares, 0–1. */
  cpu: number
  memory: number
  /** Percent, or null until the counter has answered. */
  gpu: number | null
}

/** The machine's load, polled while `enabled`. Asking is what keeps main's
 *  sampler running; a page that stops asking lets it stop too. */
export function useUsage(enabled: boolean) {
  const [usage, setUsage] = useState<Usage | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const read = () =>
      window.bridge
        ?.invoke<Usage>('usage:get')
        .then((next) => !cancelled && setUsage(next))
        .catch(() => {})
    void read()
    const timer = setInterval(read, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled])

  return usage
}
