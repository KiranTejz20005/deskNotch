import { useEffect, useState } from 'react'
import type { NotificationStoreState } from '../../main/ipc/notifications'

export function useNotifications() {
  const [data, setData] = useState<NotificationStoreState>({
    available: true,
    statusText: 'Loading notifications...',
    notifications: [],
  })

  useEffect(() => {
    window.bridge?.invoke<NotificationStoreState>('notifications:get').then((state) => {
      if (state && Array.isArray(state.notifications)) {
        setData(state)
      }
    }).catch(() => {})

    const unsub = window.bridge?.on<NotificationStoreState>('notifications:change', (state) => {
      if (state && Array.isArray(state.notifications)) {
        setData(state)
      }
    })

    return () => unsub?.()
  }, [])

  const markRead = (id: string) => {
    void window.bridge?.invoke('notifications:mark-read', id)
  }

  const dismiss = (id: string) => {
    void window.bridge?.invoke('notifications:dismiss', id)
  }

  const clearAll = () => {
    void window.bridge?.invoke('notifications:clear')
  }

  return {
    ...data,
    markRead,
    dismiss,
    clearAll,
  }
}
