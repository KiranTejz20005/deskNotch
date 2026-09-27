import React from 'react'
import { motion } from 'motion/react'
import { Volume2, Volume1, VolumeX, Headphones } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useVolume } from '../../hooks/useVolume'

export const VOLUME_WIDTH = FEATURE_CARD_WIDTH

export const VolumeTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { volume, muted, setVolume, toggleMute } = useVolume()

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setVolume(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setVolume(volume + 5)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setVolume(volume - 5)
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      toggleMute()
    }
  }

  const effectiveLevel = muted ? 0 : volume
  const Icon = muted || effectiveLevel === 0 ? VolumeX : effectiveLevel < 50 ? Volume1 : Volume2

  return (
    <FeatureCard
      title="Volume Control"
      icon={<Volume2 size={15} />}
      accent={accent}
      action={
        <span className="text-[13px] font-extrabold tabular-nums text-white bg-white/10 px-3 py-0.5 rounded-full border border-white/10">
          {muted ? 'Muted' : `${volume}%`}
        </span>
      }
    >
      <div
        className="flex flex-1 flex-col justify-between py-2 select-none outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-2 my-auto">
          <button
            type="button"
            onClick={toggleMute}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.06] border border-white/10 shadow-inner hover:bg-white/[0.12] transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            <Icon size={32} style={{ color: muted ? 'rgba(255,255,255,0.4)' : accent }} />
          </button>
          <div className="text-center">
            <span className="text-[28px] font-extrabold text-white tabular-nums">
              {muted ? 'Muted' : `${volume}%`}
            </span>
            <p className="text-[12.5px] font-medium text-white/50">
              {muted ? 'Audio is currently muted' : 'Master output volume'}
            </p>
          </div>
        </div>

        {/* Volume Slider Section */}
        <div className="w-full space-y-2 px-2">
          <div className="relative flex items-center h-6">
            <input
              type="range"
              min={0}
              max={100}
              value={effectiveLevel}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Volume level"
            />
            {/* Custom Track Background */}
            <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden relative border border-white/10">
              <motion.div
                className="h-full rounded-full origin-left"
                style={{ backgroundColor: muted ? 'rgba(255,255,255,0.3)' : accent }}
                animate={{ width: `${effectiveLevel}%` }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
              />
            </div>
            {/* Slider Thumb Indicator */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow-lg pointer-events-none border border-black/20"
              animate={{ left: `calc(${effectiveLevel}% - 10px)` }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-white/40 px-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Output Device & Mute Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] px-2 mt-2">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-white/60">
            <Headphones size={15} className="text-white/40" />
            <span>Output: Default Speakers / Headphones</span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className={`px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all shadow-sm ${
              muted
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </div>
    </FeatureCard>
  )
}
