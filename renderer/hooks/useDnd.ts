import { useEffect, useState } from 'react'

export interface DndState {
  enabled: boolean
}

export function useDnd(): { enabled: boolean; toggleDnd: () => void } {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    window.bridge?.invoke<DndState>('dnd:get').then((state) => {
      if (state && typeof state.enabled === 'boolean') {
        setEnabled(state.enabled)
      }
    }).catch(() => {})

    const unsub = window.bridge?.on<DndState>('dnd:change', (state) => {
      if (state && typeof state.enabled === 'boolean') {
        setEnabled(state.enabled)
      }
    })

    return () => unsub?.()
  }, [])

  const toggleDnd = () => {
    const next = !enabled
    setEnabled(next) // Optimistic update
    window.bridge?.invoke<DndState>('dnd:toggle', next).then((state) => {
      if (state && typeof state.enabled === 'boolean') {
        setEnabled(state.enabled)
      }
    }).catch(() => {
      setEnabled(!next) // Revert on failure
    })
  }

  return { enabled, toggleDnd }
}
