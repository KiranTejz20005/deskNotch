import { useEffect, useState, useCallback } from 'react'

export interface ClipboardItem {
  id: string
  text: string
  timestamp: number
}

export function useClipboard() {
  const [history, setHistory] = useState<ClipboardItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    window.bridge
      ?.invoke<ClipboardItem[]>('clipboard:get-history')
      .then((res) => {
        if (mounted && Array.isArray(res)) setHistory(res)
      })
      .catch(() => {})

    const unsub = window.bridge?.on<ClipboardItem[]>('clipboard:history-changed', (next) => {
      if (mounted && Array.isArray(next)) setHistory(next)
    })

    return () => {
      mounted = false
      unsub?.()
    }
  }, [])

  const copy = useCallback((item: ClipboardItem) => {
    void window.bridge?.invoke('clipboard:copy', item.text)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 1200)
  }, [])

  const clear = useCallback(() => {
    void window.bridge?.invoke('clipboard:clear')
    setHistory([])
  }, [])

  return {
    history,
    copiedId,
    copy,
    clear,
  }
}
