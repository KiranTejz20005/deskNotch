import { useEffect, useRef, useState } from 'react'
import { onStoreChange } from '../lib/store'

export type Task = {
  id: string
  label: string
  done: boolean
  reminder?: string | null
  reminderTimestamp?: number | null // epoch ms target
  reminderNotified?: boolean
  minutes?: number
  date?: string // YYYY-MM-DD
}

export function computeReminderTimestamp(reminder: string | null): number | null {
  if (!reminder) return null
  const now = Date.now()
  if (reminder.startsWith('Custom:')) {
    const dtStr = reminder.replace('Custom:', '').trim()
    const parsed = new Date(dtStr).getTime()
    if (!isNaN(parsed)) return parsed
  }
  if (reminder.includes('30 Minutes') || reminder === 'In 30 Minutes') {
    return now + 30 * 60 * 1000
  }
  if (reminder.includes('1 Hour') || reminder === 'In 1 Hour') {
    return now + 60 * 60 * 1000
  }
  if (reminder.includes('This Evening')) {
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    if (d.getTime() <= now) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  if (reminder.includes('Tomorrow Morning')) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d.getTime()
  }
  return now + 30 * 60 * 1000 // default fallback
}

export function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getTomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The one copy of the task list.
 *
 * Both views read and write through this, so ticking something in the notch's
 * glance row and opening the Tasks view show the same thing. Two components
 * each loading their own copy would drift apart the moment either changed.
 */
export interface TaskStore {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  add: (label: string, minutes?: number, date?: string) => void
  toggle: (id: string) => void
  remove: (id: string) => void
  rename: (id: string, newLabel: string) => void
  duplicate: (id: string) => void
  setReminder: (id: string, reminder: string | null) => void
  markReminderNotified: (id: string) => void
  setMinutes: (id: string, minutes: number | undefined) => void
  moveToTomorrow: (id: string) => void
  setDate: (id: string, dateStr: string) => void
  reorder: (newTasks: Task[]) => void
}

export function useTasks(): TaskStore {
  const [tasks, setTasks] = useState<Task[]>([])

  // Guards the save effect: without it the empty initial state would overwrite
  // the stored list before the load has come back.
  const loaded = useRef(false)

  useEffect(() => {
    window.bridge
      ?.invoke<Task[]>('store:get', 'todos')
      .then((stored) => {
        const list = (stored ?? []).map((t) => {
          if (t.reminder && !t.reminderTimestamp && !t.reminderNotified) {
            return { ...t, reminderTimestamp: computeReminderTimestamp(t.reminder), reminderNotified: false }
          }
          return t
        })
        setTasks(list)
      })
      .catch(() => setTasks([]))
      .finally(() => {
        loaded.current = true
      })
  }, [])

  useEffect(() => onStoreChange<Task[]>('todos', setTasks), [])

  useEffect(() => {
    if (!loaded.current) return
    void window.bridge?.invoke('store:set', 'todos', tasks)
  }, [tasks])

  const add = (label: string, minutes?: number, date?: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const targetDate = date || getTodayStr()
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), label: trimmed, done: false, minutes, date: targetDate }])
  }

  const toggle = (id: string) =>
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    )

  const remove = (id: string) => setTasks((prev) => prev.filter((task) => task.id !== id))

  const rename = (id: string, newLabel: string) => {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, label: trimmed } : task)))
  }

  const duplicate = (id: string) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const target = prev[idx]
      const copy: Task = { ...target, id: crypto.randomUUID(), label: `${target.label} (Copy)` }
      const updated = [...prev]
      updated.splice(idx + 1, 0, copy)
      return updated
    })
  }

  const setReminder = (id: string, reminder: string | null) => {
    const timestamp = computeReminderTimestamp(reminder)
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, reminder, reminderTimestamp: timestamp, reminderNotified: false } : task))
    )
  }

  const markReminderNotified = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, reminderNotified: true } : task))
    )
  }

  const setMinutes = (id: string, minutes: number | undefined) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, minutes } : task)))
  }

  const moveToTomorrow = (id: string) => {
    const tomorrowStr = getTomorrowStr()
    const reminder = 'Tomorrow Morning (9:00 AM)'
    const timestamp = computeReminderTimestamp(reminder)
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, date: tomorrowStr, reminder, reminderTimestamp: timestamp, reminderNotified: false }
          : task
      )
    )
  }

  const setDate = (id: string, dateStr: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, date: dateStr } : task)))
  }

  const reorder = (newTasks: Task[]) => {
    setTasks(newTasks)
  }

  return {
    tasks,
    setTasks,
    add,
    toggle,
    remove,
    rename,
    duplicate,
    setReminder,
    markReminderNotified,
    setMinutes,
    moveToTomorrow,
    setDate,
    reorder,
  }
}
