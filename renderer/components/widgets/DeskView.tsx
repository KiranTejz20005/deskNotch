import React, { useState } from 'react'
import { motion } from 'motion/react'
import { CompanionTile, type CompanionSleeps } from './CompanionTile'
import { CHROME_X, CHROME_Y } from '../notch/NotchChassis'
import type { ProviderLimits } from '../../hooks/useAiLimits'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import type { useFocusLog } from '../../hooks/useFocusLog'
import type { Avatar } from './SettingsPanel'
import { TasksWorkspace } from './tasks/TasksWorkspace'

/** How the desk arrives: each piece rises in a beat after the last. */
const stage = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 320, damping: 30 } },
}
const staggered = { hidden: {}, shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }

/** The desk's geometry: the companion card and the list beside it, a glance card tall. */
export const DESK_WIDTH = 696 + CHROME_X
export const DESK_HEIGHT = CHROME_Y + 350

interface DeskViewProps {
  avatar: Avatar
  photo: string | null
  tasks: TaskStore
  timer: Timer
  minutes: number
  onMinutes: (m: number) => void
  /** The companion's colour, so the desk and the glance agree. */
  accent: string
  limits: ProviderLimits[] | null
  log: ReturnType<typeof useFocusLog>
  track: string | null
  playing: boolean
  sleeps: CompanionSleeps
}

/**
 * The desk: the same companion card as the glance, always in Focus, since the
 * desk is where the work happens, beside the redesigned Tasks workspace.
 */
export const DeskView: React.FC<DeskViewProps> = ({ avatar, photo, tasks, timer, minutes, onMinutes, accent, limits, track, playing, sleeps }) => {
  const [lengths, setLengths] = useState(false)
  return (
    <motion.div variants={staggered} initial="hidden" animate="shown" className="flex h-full flex-col">
      {/* The list fills the row so its overflow scrolls; the scene keeps its own height. */}
      <div className="flex min-h-0 flex-1 items-stretch gap-8">
        <motion.div variants={stage} className="shrink-0 self-start">
          <CompanionTile
            avatar={avatar}
            photo={photo}
            tasks={tasks}
            timer={timer}
            limits={limits ?? []}
            track={track}
            playing={playing}
            mode="focus"
            sleeps={sleeps}
            minutes={minutes}
            onMinutes={onMinutes}
            open={lengths}
            onToggle={() => setLengths((o) => !o)}
          />
        </motion.div>
        <motion.div variants={stage} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TasksWorkspace tasks={tasks} timer={timer} accent={accent} />
        </motion.div>
      </div>
    </motion.div>
  )
}
