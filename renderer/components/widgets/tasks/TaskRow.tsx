import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Edit3, MoreHorizontal, Play, Bell, Clock, GripVertical } from 'lucide-react'
import type { Task, TaskStore } from '../../../hooks/useTasks'

interface TaskRowProps {
  task: Task
  tasks: TaskStore
  accent: string
  isEditing: boolean
  onStartRename: (task: Task) => void
  onOpenFocusSheet: (task: Task) => void
  onOpenContextMenu: (task: Task, e: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent, index: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  onDrop?: (e: React.DragEvent, index: number) => void
  index: number
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  tasks,
  accent,
  isEditing,
  onStartRename,
  onOpenFocusSheet,
  onOpenContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  index,
}) => {
  const [editValue, setEditValue] = useState(task.label)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    tasks.toggle(task.id)
  }

  const handleFinishRename = () => {
    tasks.rename(task.id, editValue)
    onStartRename({} as Task) // clear editing state
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishRename()
    if (e.key === 'Escape') {
      setEditValue(task.label)
      onStartRename({} as Task)
    }
  }

  return (
    <motion.div
      layout
      draggable={!task.done}
      onDragStart={(e: any) => onDragStart?.(e, index)}
      onDragOver={(e: any) => onDragOver?.(e, index)}
      onDrop={(e: any) => onDrop?.(e, index)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={spring}
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenContextMenu(task, e)
      }}
      className={`group relative flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 border-b border-dashed border-white/[0.07] transition-all duration-200 ${
        task.done ? 'opacity-75 hover:opacity-100' : 'hover:bg-white/[0.05]'
      }`}
    >
      {/* Left: Circle Checkbox & Task Title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {!task.done && (
          <span className="cursor-grab text-white/20 opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing">
            <GripVertical size={13} />
          </span>
        )}

        <button
          type="button"
          aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'}
          onClick={handleToggle}
          className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-all duration-200 ${
            task.done
              ? 'border-white/80 bg-white text-black shadow-sm'
              : 'border-white/30 hover:border-white/80 hover:bg-white/10'
          }`}
        >
          {task.done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
              <Check size={11} strokeWidth={3} className="text-black" />
            </motion.span>
          )}
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 rounded-[6px] bg-white/10 px-2 py-0.5 text-[13px] text-white outline-none focus:ring-1 focus:ring-white/40"
          />
        ) : (
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span
              onClick={() => onStartRename(task)}
              className={`min-w-0 truncate text-[13px] font-medium leading-tight cursor-text transition-colors ${
                task.done ? 'text-white/60 line-through' : 'text-white/90 hover:text-white'
              }`}
            >
              {task.label}
            </span>

            {/* Badges for reminder or set minutes */}
            {(task.reminder || task.minutes) && (
              <div className="mt-0.5 flex items-center gap-2 text-[10.5px] font-medium text-white/40">
                {task.reminder && (
                  <span className="flex items-center gap-1 text-emerald-400/90">
                    <Bell size={10} />
                    <span>{task.reminder}</span>
                  </span>
                )}
                {task.minutes && (
                  <span className="flex items-center gap-1 text-sky-400/90">
                    <Clock size={10} />
                    <span>{task.minutes}m</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions (Play Focus, Edit, More) */}
      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        {!task.done && (
          <button
            type="button"
            title="Start Focus on this task"
            onClick={(e) => {
              e.stopPropagation()
              onOpenFocusSheet(task)
            }}
            className="grid h-6 w-6 place-items-center rounded-[6px] text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Play size={12} fill="currentColor" className="ml-0.5" />
          </button>
        )}

        <button
          type="button"
          title="Edit / Duration"
          onClick={(e) => {
            e.stopPropagation()
            onOpenFocusSheet(task)
          }}
          className="grid h-6 w-6 place-items-center rounded-[6px] text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Edit3 size={12} />
        </button>

        <button
          type="button"
          title="More options"
          onClick={(e) => {
            e.stopPropagation()
            onOpenContextMenu(task, e)
          }}
          className="grid h-6 w-6 place-items-center rounded-[6px] text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </motion.div>
  )
}
