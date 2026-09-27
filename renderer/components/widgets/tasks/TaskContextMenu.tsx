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

  const reminderOptions = [
    { label: 'In 30 Minutes', value: 'In 30 Minutes' },
    { label: 'In 1 Hour', value: 'In 1 Hour' },
    { label: 'This Evening', value: 'This Evening' },
    { label: 'Tomorrow Morning', value: 'Tomorrow Morning' },
    { label: 'Clear Reminder', value: null },
  ]

  const handleReminderSelect = (val: string | null) => {
    tasks.setReminder(task.id, val)
    onClose()
  }

  const handleMoveTomorrow = () => {
    tasks.setReminder(task.id, 'Tomorrow Morning')
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
      style={{ top: `${Math.max(36, Math.min(position.y, 160))}px` }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-3 z-50 w-48 rounded-[14px] border border-white/15 bg-[#1a1a1e]/98 p-1.5 backdrop-blur-2xl shadow-2xl text-[12px] font-medium text-white/90"
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

      {/* Remind Me with Submenu */}
      <div
        className="relative"
        onMouseEnter={() => setShowRemindSubmenu(true)}
        onMouseLeave={() => setShowRemindSubmenu(false)}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 hover:bg-white/10 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Bell size={13} className="text-white/70" />
            <span>Remind Me</span>
          </div>
          <ChevronRight size={13} className="text-white/40" />
        </button>

        <AnimatePresence>
          {showRemindSubmenu && (
            <motion.div
              data-notch-part="true"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.12 }}
              className="absolute right-full top-0 mr-1 w-44 rounded-[12px] border border-white/15 bg-[#1a1a1e]/98 p-1.5 backdrop-blur-2xl shadow-2xl z-50"
            >
              {reminderOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleReminderSelect(opt.value)}
                  className="flex w-full items-center justify-between rounded-[7px] px-2.5 py-1.5 text-[11.5px] hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span>{opt.label}</span>
                  {task.reminder === opt.value && opt.value !== null && (
                    <span className="text-[10px] font-bold text-emerald-400">✓</span>
                  )}
                </button>
              ))}
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
