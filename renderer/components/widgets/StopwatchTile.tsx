import React from 'react'
import { motion } from 'motion/react'
import { Timer as TimerIcon, RotateCcw, Play, Pause } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useStopwatch } from '../../hooks/useStopwatch'

export const STOPWATCH_WIDTH = FEATURE_CARD_WIDTH

function formatStopwatch(ms: number): { timeStr: string; msStr: string } {
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  const hundredths = Math.floor((ms % 1000) / 10)

  const hh = String(hours).padStart(2, '0')
  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  const cs = String(hundredths).padStart(2, '0')

  const timeStr = hours > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`
  return { timeStr, msStr: `.${cs}` }
}

export const StopwatchTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { elapsedMs, isRunning, start, pause, reset } = useStopwatch()
  const { timeStr, msStr } = formatStopwatch(elapsedMs)
  const paused = !isRunning && elapsedMs > 0

  return (
    <FeatureCard
      title="Stopwatch"
      icon={<TimerIcon size={15} />}
      accent={accent}
      action={
        <div className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-white/50">
          <TimerIcon size={13} />
          <span>Precision Timer</span>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-between py-2 text-center">
        {/* Large Primary Readout */}
        <div className="my-auto flex flex-col items-center">
          <div className="flex items-baseline font-mono tracking-tight select-all">
            <span className="text-[44px] font-bold leading-none text-white tabular-nums drop-shadow">
              {timeStr}
            </span>
            <span className="text-[24px] font-semibold leading-none text-white/50 tabular-nums">
              {msStr}
            </span>
          </div>

          <span
            className={`text-[13px] font-bold uppercase tracking-widest mt-2 px-3 py-0.5 rounded-full ${
              isRunning
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : paused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-white/40 bg-white/5'
            }`}
          >
            {isRunning ? 'Running' : paused ? 'Paused' : 'Ready'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-3 pt-3 border-t border-white/[0.08] px-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={isRunning ? pause : start}
            className={`flex-1 py-3 px-6 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition-all shadow-md ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {isRunning ? (
              <>
                <Pause size={16} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span>{paused ? 'Resume' : 'Start'}</span>
              </>
            )}
          </motion.button>

          {(isRunning || paused) && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={reset}
              className="py-3 px-5 rounded-xl text-[14px] font-bold bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white border border-white/[0.08] flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </motion.button>
          )}
        </div>
      </div>
    </FeatureCard>
  )
}
