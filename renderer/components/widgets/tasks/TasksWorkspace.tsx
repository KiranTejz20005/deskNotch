import React, { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, CheckCircle2, ListTodo } from 'lucide-react'
import type { Task, TaskStore } from '../../../hooks/useTasks'
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
  
  // Context menu state
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Focus sheet state
  const [focusSheetTask, setFocusSheetTask] = useState<Task | null>(null)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const openTasks = useMemo(() => tasks.tasks.filter((t) => !t.done), [tasks.tasks])
  const completedTasks = useMemo(() => tasks.tasks.filter((t) => t.done), [tasks.tasks])

  const formattedDate = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
  }, [])

  const handleAdd = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    tasks.add(trimmed)
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
      // Merge reordered open tasks back with completed tasks
      tasks.reorder([...copy, ...completedTasks])
    }
    dragItem.current = null
    dragOverItem.current = null
  }

  const currentList = tab === 'todo' ? openTasks : completedTasks

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col justify-between select-none">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-[16px] font-bold tracking-tight text-white/95">Today's tasks</h2>
        <span className="text-[12px] font-medium text-white/45">{formattedDate}</span>
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
            key={tab}
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
                    <p className="text-[13px] font-medium text-white/80">You're all caught up.</p>
                    <p className="mt-0.5 text-[11px]">Add something new when you're ready.</p>
                  </>
                ) : (
                  <>
                    <ListTodo size={24} className="mb-1.5 text-white/30" />
                    <p className="text-[13px] font-medium text-white/60">Nothing completed yet.</p>
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
            placeholder="Add a task..."
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

      {/* Popovers / Sheets */}
      <AnimatePresence>
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
