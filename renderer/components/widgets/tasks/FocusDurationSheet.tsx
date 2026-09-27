import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Clock, X } from 'lucide-react'
import type { Task } from '../../../hooks/useTasks'
import type { Timer } from '../../../hooks/useTimer'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

interface FocusDurationSheetProps {
  task: Task
  timer: Timer
  accent: string
  onClose: () => void
  onSaveMinutes: (task: Task, minutes: number) => void
}

export const FocusDurationSheet: React.FC<FocusDurationSheetProps> = ({
  task,
  timer,
  accent,
  onClose,
  onSaveMinutes,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(task.minutes ?? 25)
  const [customInput, setCustomInput] = useState<string>(String(task.minutes ?? 25))

  const presets = [15, 25, 45, 60]

  const handlePresetSelect = (m: number) => {
    setSelectedMinutes(m)
    setCustomInput(String(m))
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomInput(val)
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 180) {
      setSelectedMinutes(parsed)
    }
  }

  const handleStart = () => {
    onSaveMinutes(task, selectedMinutes)
    timer.start(selectedMinutes)
    onClose()
  }

  const handleSave = () => {
    onSaveMinutes(task, selectedMinutes)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 8 }}
      transition={spring}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-x-2 bottom-2 top-2 z-30 flex flex-col justify-between overflow-hidden rounded-[16px] border border-white/15 bg-[#141418]/95 p-4 backdrop-blur-xl shadow-2xl"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
            <Clock size={15} style={{ color: accent }} />
            <span>Focus duration</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        <p className="mt-1 truncate text-[12px] font-medium text-white/60">{task.label}</p>

        {/* Preset Chips */}
        <div className="mt-3.5 flex items-center justify-between rounded-[10px] bg-white/[0.06] p-1 border border-white/[0.08]">
          {presets.map((m) => {
            const active = selectedMinutes === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => handlePresetSelect(m)}
                className={`relative flex-1 py-1 text-[12px] font-semibold transition-colors ${
                  active ? 'text-black font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="focus-preset-pill"
                    transition={spring}
                    className="absolute inset-0 rounded-[7px] bg-white shadow-sm"
                  />
                )}
                <span className="relative z-10">{m}m</span>
              </button>
            )
          })}
        </div>

        {/* Custom Input */}
        <div className="mt-3 flex items-center justify-between text-[12px] text-white/70">
          <span>Custom</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={180}
              value={customInput}
              onChange={handleCustomChange}
              className="w-14 rounded-[7px] border border-white/15 bg-white/[0.08] px-2 py-0.5 text-center text-[12px] font-semibold text-white outline-none focus:border-white/40"
            />
            <span className="text-[11px] text-white/40">min</span>
          </div>
        </div>

        <p className="mt-2.5 text-[10.5px] leading-snug text-white/40">
          Your timer starts when you begin focusing on this task.
        </p>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] px-3 py-1 text-[12px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-[8px] bg-white/[0.1] px-3.5 py-1 text-[12px] font-medium text-white hover:bg-white/[0.18] transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="rounded-[8px] px-4 py-1 text-[12px] font-semibold text-black transition-transform active:scale-95 shadow-md"
            style={{ backgroundColor: accent }}
          >
            Start
          </button>
        </div>
      </div>
    </motion.div>
  )
}
