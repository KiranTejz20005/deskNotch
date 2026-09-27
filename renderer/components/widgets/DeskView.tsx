import React from 'react'
import { motion } from 'motion/react'
import { CHROME_X, CHROME_Y } from '../notch/NotchChassis'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import { TasksWorkspace } from './tasks/TasksWorkspace'

/** How the desk arrives: each piece rises in a beat after the last. */
const stage = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 320, damping: 30 } },
}
const staggered = { hidden: {}, shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }

/** The desk's geometry: redesigned Tasks workspace. */
export const DESK_WIDTH = 600 + CHROME_X
export const DESK_HEIGHT = CHROME_Y + 350

interface DeskViewProps {
  tasks: TaskStore
  timer: Timer
  accent: string
}

/**
 * The desk: the Tasks workspace filling the area cleanly.
 */
export const DeskView: React.FC<DeskViewProps> = ({ tasks, timer, accent }) => {
  return (
    <motion.div variants={staggered} initial="hidden" animate="shown" className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-stretch">
        <motion.div variants={stage} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TasksWorkspace tasks={tasks} timer={timer} accent={accent} />
        </motion.div>
      </div>
    </motion.div>
  )
}

