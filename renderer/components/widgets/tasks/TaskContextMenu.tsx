import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Edit3,
  Bell,
  Play,
  Trash2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import type { Task, TaskStore } from '../../../hooks/useTasks'

interface TaskContextMenuProps {
  task: Task
  tasks: TaskStore
  position: { x: number; y: number }
  onClose: () => void
  onOpenFocusSheet: (task: Task) => void
  onStartRename: (task: Task) => void
}

const spring = { type: 'spring' as const, stiffness: 450, damping: 32 }

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  task,
  tasks,
  position,
  onClose,
  onOpenFocusSheet,
  onStartRename,
}) => {
  const [showRemindSubmenu, setShowRemindSubmenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customDateTime, setCustomDateTime] = useState('')

  const reminderOptions = [
    { label: 'In 30 Minutes', value: 'In 30 Minutes' },
    { label: 'In 1 Hour', value: 'In 1 Hour' },
    { label: 'This Evening', value: 'This Evening' },
    { label: 'Tomorrow Morning', value: 'Tomorrow Morning' },
    { label: 'Custom...', value: 'custom' },
    { label: 'Clear Reminder', value: null },
  ]

  const handleReminderSelect = (val: string | null) => {
    if (val === 'custom') {
      setShowCustomPicker(true)
      return
    }
    tasks.setReminder(task.id, val)
    onClose()
  }

  const handleCustomSubmit = () => {
    if (customDateTime) {
      tasks.setReminder(task.id, `Custom:${customDateTime}`)
    }
    onClose()
  }

  const handleMoveTomorrow = () => {
    tasks.moveToTomorrow(task.id)
    onClose()
  }

  return (
    <motion.div
      ref={menuRef}
      data-notch-part="true"
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={spring}
      style={{ top: `${Math.max(12, Math.min(position.y - 50, 45))}px` }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-3 z-50 w-52 rounded-[14px] border border-white/15 bg-[#1a1a1e]/98 p-1.5 backdrop-blur-2xl shadow-2xl text-[12px] font-medium text-white/90 max-h-[300px] overflow-y-auto scrollbar-none"
    >
      <button
        type="button"
        onClick={() => {
          onClose()
          onOpenFocusSheet(task)
        }}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Play size={13} className="text-white/70" />
        <span>Focus</span>
      </button>

      <button
        type="button"
        onClick={() => {
          tasks.toggle(task.id)
          onClose()
        }}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
      >
        {task.done ? <Circle size={13} className="text-white/70" /> : <CheckCircle2 size={13} className="text-white/70" />}
        <span>{task.done ? 'Mark as To do' : 'Mark as Done'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onClose()
          onStartRename(task)
        }}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Edit3 size={13} className="text-white/70" />
        <span>Rename...</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onClose()
          onOpenFocusSheet(task)
        }}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Clock size={13} className="text-white/70" />
        <span>Set Time Limit...</span>
      </button>

      {/* Remind Me with Expandable Submenu (Click to toggle) */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowRemindSubmenu((v) => !v)
          }}
          className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Bell size={13} className="text-white/70" />
            <span>Remind Me</span>
          </div>
          <ChevronRight size={13} className={`text-white/40 transition-transform duration-200 ${showRemindSubmenu ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showRemindSubmenu && (
            <motion.div
              data-notch-part="true"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-0.5 overflow-hidden pl-3 pr-1 py-1 my-0.5 rounded-[8px] bg-white/[0.06] border border-white/[0.08]"
            >
              {showCustomPicker ? (
                <div className="flex flex-col gap-1.5 p-1">
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="w-full rounded-[6px] border border-white/15 bg-white/10 px-1.5 py-1 text-[11px] font-medium text-white outline-none focus:border-white/40 cursor-pointer"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomPicker(false)}
                      className="rounded px-2 py-0.5 text-[10.5px] text-white/50 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      disabled={!customDateTime}
                      className="rounded bg-emerald-500 px-2.5 py-0.5 text-[10.5px] font-bold text-black disabled:opacity-40"
                    >
                      Set
                    </button>
                  </div>
                </div>
              ) : (
                reminderOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleReminderSelect(opt.value)}
                    className="flex w-full items-center justify-between rounded-[6px] px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                  >
                    <span>{opt.label}</span>
                    {task.reminder === opt.value && opt.value !== null && (
                      <span className="text-[10px] font-bold text-emerald-400">✓</span>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={handleMoveTomorrow}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
      >
        <ArrowRight size={13} className="text-white/70" />
        <span>Move to Tomorrow</span>
      </button>

      <button
        type="button"
        onClick={() => {
          tasks.duplicate(task.id)
          onClose()
        }}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Copy size={13} className="text-white/70" />
        <span>Duplicate</span>
      </button>

      <div className="my-1 h-px bg-white/10" />

      <button
        type="button"
        onClick={() => {
          tasks.remove(task.id)
          onClose()
        }}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>
    </motion.div>
  )
}
