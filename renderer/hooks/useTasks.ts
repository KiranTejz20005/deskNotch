import { useEffect, useRef, useState } from 'react'

export type Task = {
  id: string
  label: string
  done: boolean
  reminder?: string | null
  minutes?: number
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
  add: (label: string, minutes?: number) => void
  toggle: (id: string) => void
  remove: (id: string) => void
  rename: (id: string, newLabel: string) => void
  duplicate: (id: string) => void
  setReminder: (id: string, reminder: string | null) => void
  setMinutes: (id: string, minutes: number | undefined) => void
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
      .then((stored) => setTasks(stored ?? []))
      .catch(() => setTasks([]))
      .finally(() => {
        loaded.current = true
      })
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    void window.bridge?.invoke('store:set', 'todos', tasks)
  }, [tasks])

  const add = (label: string, minutes?: number) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), label: trimmed, done: false, minutes }])
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
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, reminder } : task)))
  }

  const setMinutes = (id: string, minutes: number | undefined) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, minutes } : task)))
  }

  const reorder = (newTasks: Task[]) => {
    setTasks(newTasks)
  }

  return { tasks, setTasks, add, toggle, remove, rename, duplicate, setReminder, setMinutes, reorder }
}
