import React, { useState } from 'react'
import type { TaskStore } from '../../hooks/useTasks'

/**
 * A task typed straight into a glance card. Enter adds it, Escape or clicking
 * away closes it, so the card is never left in an editing state. The field
 * grows line by line as the words wrap (Shift+Enter is not a new line: a task
 * is one thought), and scrolls past a few lines.
 */
export const QuickAdd: React.FC<{ tasks: TaskStore; onDone: () => void; className?: string }> = ({ tasks, onDone, className = '' }) => {
  const [draft, setDraft] = useState('')

  return (
    <textarea
      autoFocus
      rows={1}
      value={draft}
      maxLength={200}
      placeholder="Add a task"
      onChange={(event) => setDraft(event.target.value.replace(/\n/g, ' '))}
      onClick={(event) => event.stopPropagation()}
      onBlur={onDone}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          tasks.add(draft)
          onDone()
        }
        if (event.key === 'Escape') onDone()
      }}
      className={`max-h-[64px] w-full min-w-0 resize-none overflow-y-auto break-words bg-transparent text-[13px] font-medium leading-snug text-white outline-none [field-sizing:content] [scrollbar-width:none] placeholder:text-white/30 ${className}`}
    />
  )
}
