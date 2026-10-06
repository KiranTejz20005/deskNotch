import { useEffect, useRef, useState } from 'react'
import { onStoreChange } from '../lib/store'
import { time12 } from '../lib/time'

export type Reminder = { id: string; at: number; message: string }

/**
 * Reminders: a time, and an optional line to be reminded of.
 *
 * Stored like the tasks (one list, synced across every notch). A reminder
 * stays in the list until it is dismissed or snoozed, so one that came due
 * while the app was closed is still waiting when it opens.
 */
export interface ReminderStore {
  /** Soonest first. */
  reminders: Reminder[]
  /** The earliest reminder whose time has come, or null. */
  due: Reminder | null
  add: (at: number, message: string) => void
  remove: (id: string) => void
  snooze: (id: string, minutes: number) => void
}

export function useReminders(): ReminderStore {
  const [list, setList] = useState<Reminder[]>([])
  const loaded = useRef(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    window.bridge
      ?.invoke<Reminder[]>('store:get', 'reminders')
      .then((stored) => setList(Array.isArray(stored) ? stored : []))
      .catch(() => setList([]))
      .finally(() => {
        loaded.current = true
        setNow(Date.now())
      })
  }, [])

  useEffect(() => onStoreChange<Reminder[]>('reminders', setList), [])

  useEffect(() => {
    if (!loaded.current) return
    void window.bridge?.invoke('store:set', 'reminders', list)
  }, [list])

  // Wakes when the next one is due rather than polling. A timer paused by
  // sleep fires on wake, so a reminder missed asleep still comes, late.
  useEffect(() => {
    const next = Math.min(...list.map((r) => r.at).filter((at) => at > now))
    if (!Number.isFinite(next)) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(next - Date.now() + 50, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [list, now])

  const reminders = [...list].sort((a, b) => a.at - b.at)
  return {
    reminders,
    due: reminders.find((r) => r.at <= now) ?? null,
    add: (at, message) => setList((prev) => [...prev, { id: crypto.randomUUID(), at, message: message.trim() }]),
    remove: (id) => setList((prev) => prev.filter((r) => r.id !== id)),
    snooze: (id, minutes) => setList((prev) => prev.map((r) => (r.id === id ? { ...r, at: Date.now() + minutes * 60_000 } : r))),
  }
}

/** "14:30" (a time input's value) → the next time the clock shows it: today, or tomorrow if that has passed. */
export const nextAt = (hhmm: string, from = new Date()) => {
  const [h, m] = hhmm.split(':').map(Number)
  const at = new Date(from)
  at.setHours(h, m, 0, 0)
  if (at.getTime() <= from.getTime()) at.setDate(at.getDate() + 1)
  return at.getTime()
}

/** A time input's value for `ms` from now: "14:30". */
export const inputTime = (ms: number) => {
  const d = new Date(Date.now() + ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "3:30 PM", with "Tomorrow" (or, for one missed while closed, "Yesterday")
 *  when it is not today. ponytail: anything older also reads "Yesterday". */
export const whenLabel = (at: number) => {
  const d = new Date(at)
  const { clock, meridiem } = time12(d)
  const day = d.toDateString() === new Date().toDateString() ? '' : at > Date.now() ? 'Tomorrow ' : 'Yesterday '
  return `${day}${clock} ${meridiem}`
}

/** "in 12 min", "in 1 h 5 min", or "now". */
export const untilLabel = (at: number, now = Date.now()) => {
  const minutes = Math.ceil((at - now) / 60_000)
  if (minutes <= 0) return 'now'
  const h = Math.floor(minutes / 60)
  return h ? `in ${h} h${minutes % 60 ? ` ${minutes % 60} min` : ''}` : `in ${minutes} min`
}
