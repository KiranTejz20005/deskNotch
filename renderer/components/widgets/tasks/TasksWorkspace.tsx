import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, CheckCircle2, ListTodo, Calendar, ChevronDown, Bell } from 'lucide-react'
import { getTodayStr, getTomorrowStr, type Task, type TaskStore } from '../../../hooks/useTasks'
import type { Timer } from '../../../hooks/useTimer'
import { TaskRow } from './TaskRow'
import { TaskContextMenu } from './TaskContextMenu'
import { FocusDurationSheet } from './FocusDurationSheet'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

interface TasksWorkspaceProps {
  tasks: TaskStore
  timer: Timer
  accent: string
}

export const TasksWorkspace: React.FC<TasksWorkspaceProps> = ({ tasks, timer, accent }) => {
  const [tab, setTab] = useState<'todo' | 'completed'>('todo')
  const [draft, setDraft] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  // Date selection state
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayStr())
  const [showCalendarPopover, setShowCalendarPopover] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Context menu state
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Focus sheet state
  const [focusSheetTask, setFocusSheetTask] = useState<Task | null>(null)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const todayStr = useMemo(() => getTodayStr(), [])
  const tomorrowStr = useMemo(() => getTomorrowStr(), [])

  // Close calendar popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendarPopover(false)
      }
    }
    if (showCalendarPopover) {
      window.addEventListener('mousedown', handleClickOutside)
    }
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showCalendarPopover])

  // In-app notification state
  const [activeNotificationTask, setActiveNotificationTask] = useState<Task | null>(null)

  // Background reminder notification checker
  const notifiedRemindersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const playChime = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioCtx) return
        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.8)
      } catch {}
    }

    const interval = setInterval(() => {
      const now = Date.now()

      tasks.tasks.forEach((t) => {
        if (!t.reminder || t.done || t.reminderNotified) return
        const key = `${t.id}:${t.reminderTimestamp || t.reminder}`
        if (notifiedRemindersRef.current.has(key)) return

        let isDue = false
        if (t.reminderTimestamp) {
          isDue = t.reminderTimestamp <= now
        } else {
          const currentHours = new Date().getHours()
          if (t.reminder.includes('This Evening') && currentHours >= 18) {
            isDue = true
          } else if (t.reminder.includes('Tomorrow Morning') && t.date === todayStr && currentHours >= 9) {
            isDue = true
          }
        }

        if (isDue) {
          notifiedRemindersRef.current.add(key)
          setActiveNotificationTask(t)
          playChime()
          tasks.markReminderNotified(t.id)
          if (typeof Notification !== 'undefined') {
            if (Notification.permission === 'granted') {
              new Notification('Task Reminder 🔔', { body: `Time for: ${t.label}` })
            } else if (Notification.permission !== 'denied') {
              void Notification.requestPermission().then((p) => {
                if (p === 'granted') new Notification('Task Reminder 🔔', { body: `Time for: ${t.label}` })
              })
            }
          }
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [tasks.tasks, todayStr, tasks.markReminderNotified])

  // Filter tasks by currently selected date
  const filteredTasks = useMemo(() => {
    return tasks.tasks.filter((t) => {
      const taskDate = t.date || todayStr
      return taskDate === selectedDateStr
    })
  }, [tasks.tasks, selectedDateStr, todayStr])

  const openTasks = useMemo(() => filteredTasks.filter((t) => !t.done), [filteredTasks])
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.done), [filteredTasks])

  const headerTitle = useMemo(() => {
    if (selectedDateStr === todayStr) return "Today's tasks"
    if (selectedDateStr === tomorrowStr) return "Tomorrow's tasks"
    const [y, m, d] = selectedDateStr.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return `Tasks for ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }, [selectedDateStr, todayStr, tomorrowStr])

  const formattedDateLabel = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
  }, [selectedDateStr])

  const handleAdd = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    tasks.add(trimmed, undefined, selectedDateStr)
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') setDraft('')
  }

  const handleOpenContextMenu = (task: Task, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ x: Math.min(e.clientX - 100, window.innerWidth - 200), y: rect.bottom + 4 })
    setContextMenuTask(task)
  }

  const handleDragStart = (_e: React.DragEvent, index: number) => {
    dragItem.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverItem.current = index
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copy = [...openTasks]
      const [dragged] = copy.splice(dragItem.current, 1)
      copy.splice(dragOverItem.current, 0, dragged)

      // Replace open tasks in main task store preserving order
      const nonFiltered = tasks.tasks.filter((t) => (t.date || todayStr) !== selectedDateStr)
      tasks.reorder([...copy, ...completedTasks, ...nonFiltered])
    }
    dragItem.current = null
    dragOverItem.current = null
  }

  const currentList = tab === 'todo' ? openTasks : completedTasks

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col justify-between select-none">
      {/* 1. Header with Title & Interactive Calendar Button */}
      <div className="flex items-center justify-between px-1 pb-2 relative z-20">
        <h2 className="text-[16px] font-bold tracking-tight text-white/95">{headerTitle}</h2>

        <div className="relative" ref={calendarRef}>
          <button
            type="button"
            onClick={() => setShowCalendarPopover((v) => !v)}
            className="flex items-center gap-1.5 rounded-[8px] bg-white/[0.08] px-2.5 py-1 text-[11.5px] font-semibold text-white/90 hover:bg-white/[0.15] hover:text-white transition-all border border-white/10 shadow-sm"
          >
            <Calendar size={13} className="text-emerald-400" />
            <span>{formattedDateLabel}</span>
            <ChevronDown size={12} className="text-white/40" />
          </button>

          {/* Calendar Date Picker Popover */}
          <AnimatePresence>
            {showCalendarPopover && (
              <motion.div
                data-notch-part="true"
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={spring}
                className="absolute right-0 top-full mt-1.5 w-64 rounded-[14px] border border-white/15 bg-[#1a1a1e]/98 p-3 backdrop-blur-2xl shadow-2xl z-50 text-white"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-[12px] font-bold text-white">Select Date</span>
                  <span className="text-[10px] font-medium text-white/50">
                    {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                {/* Quick Date Pills */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateStr(todayStr)
                      setShowCalendarPopover(false)
                    }}
                    className={`flex-1 rounded-[7px] py-1 text-[11px] font-semibold transition-colors ${
                      selectedDateStr === todayStr ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateStr(tomorrowStr)
                      setShowCalendarPopover(false)
                    }}
                    className={`flex-1 rounded-[7px] py-1 text-[11px] font-semibold transition-colors ${
                      selectedDateStr === tomorrowStr ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>

                {/* Date Picker Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-medium text-white/50">Pick custom date:</label>
                  <input
                    type="date"
                    value={selectedDateStr}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDateStr(e.target.value)
                        setShowCalendarPopover(false)
                      }
                    }}
                    className="w-full rounded-[8px] border border-white/15 bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white outline-none focus:border-white/40 cursor-pointer"
                  />
                </div>

                {/* Day Task Stats */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10.5px] text-white/50 font-medium">
                  <span>To do: {openTasks.length}</span>
                  <span>Completed: {completedTasks.length}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Tabs: To do X / Completed Y */}
      <div className="flex items-center gap-1 rounded-[10px] bg-white/[0.06] p-1 border border-white/[0.08] mb-2.5">
        <button
          type="button"
          onClick={() => setTab('todo')}
          className={`relative flex items-center justify-center gap-1.5 px-3 py-1 text-[12px] font-semibold transition-colors ${
            tab === 'todo' ? 'text-white' : 'text-white/45 hover:text-white/75'
          }`}
        >
          {tab === 'todo' && (
            <motion.span
              layoutId="task-tab-pill"
              transition={spring}
              className="absolute inset-0 rounded-[7px] bg-white/[0.14]"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>To do</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10.5px] tabular-nums font-bold">
              {openTasks.length}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('completed')}
          className={`relative flex items-center justify-center gap-1.5 px-3 py-1 text-[12px] font-semibold transition-colors ${
            tab === 'completed' ? 'text-white' : 'text-white/45 hover:text-white/75'
          }`}
        >
          {tab === 'completed' && (
            <motion.span
              layoutId="task-tab-pill"
              transition={spring}
              className="absolute inset-0 rounded-[7px] bg-white/[0.14]"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>Completed</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10.5px] tabular-nums font-bold">
              {completedTasks.length}
            </span>
          </span>
        </button>
      </div>

      {/* 3. Task List Content */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-none">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${selectedDateStr}-${tab}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-0.5"
          >
            {currentList.length > 0 ? (
              currentList.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  index={idx}
                  task={task}
                  tasks={tasks}
                  accent={accent}
                  isEditing={editingTaskId === task.id}
                  onStartRename={(t) => setEditingTaskId(t.id ?? null)}
                  onOpenFocusSheet={(t) => setFocusSheetTask(t)}
                  onOpenContextMenu={handleOpenContextMenu}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))
            ) : (
              <div className="flex h-36 flex-col items-center justify-center text-center text-white/40">
                {tab === 'todo' ? (
                  <>
                    <CheckCircle2 size={24} className="mb-1.5 text-emerald-400/60" />
                    <p className="text-[13px] font-medium text-white/80">You're all caught up for this date.</p>
                    <p className="mt-0.5 text-[11px]">Add a task below to get started.</p>
                  </>
                ) : (
                  <>
                    <ListTodo size={24} className="mb-1.5 text-white/30" />
                    <p className="text-[13px] font-medium text-white/60">Nothing completed for this date yet.</p>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 4. Bottom Input & Drag Notice */}
      <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.08] pt-2">
        <div className="flex flex-1 items-center gap-2 rounded-[8px] bg-white/[0.045] px-2.5 py-1 border border-white/[0.06] focus-within:border-white/30 focus-within:bg-white/[0.08] transition-colors">
          <Plus size={14} className="text-white/40 shrink-0" />
          <input
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedDateStr === todayStr ? "Add a task..." : `Add a task for ${formattedDateLabel}...`}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-white outline-none placeholder:text-white/35"
            style={{ caretColor: accent }}
          />
        </div>

        {tab === 'todo' && openTasks.length > 1 && (
          <span className="ml-3 shrink-0 text-[10.5px] font-medium text-white/30">
            Drag to reorder
          </span>
        )}
      </div>

      {/* Popovers / Sheets / Notifications */}
      <AnimatePresence>
        {activeNotificationTask && (
          <motion.div
            data-notch-part="true"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={spring}
            className="absolute top-2 left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-[14px] border border-amber-500/30 bg-[#16161a]/98 p-3 backdrop-blur-2xl shadow-[0_16px_36px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bell size={15} className="animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Reminder Due</div>
                <div className="text-[12.5px] font-semibold text-white/95 truncate">{activeNotificationTask.label}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  tasks.toggle(activeNotificationTask.id)
                  setActiveNotificationTask(null)
                }}
                className="rounded-full bg-emerald-500 px-3.5 py-1 text-[11px] font-bold text-black hover:bg-emerald-400 transition-all shadow-md active:scale-95"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => setActiveNotificationTask(null)}
                className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {contextMenuTask && (
          <TaskContextMenu
            task={contextMenuTask}
            tasks={tasks}
            position={menuPos}
            onClose={() => setContextMenuTask(null)}
            onOpenFocusSheet={(t) => setFocusSheetTask(t)}
            onStartRename={(t) => setEditingTaskId(t.id)}
          />
        )}

        {focusSheetTask && (
          <FocusDurationSheet
            task={focusSheetTask}
            timer={timer}
            accent={accent}
            onClose={() => setFocusSheetTask(null)}
            onSaveMinutes={(t, m) => tasks.setMinutes(t.id, m)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
