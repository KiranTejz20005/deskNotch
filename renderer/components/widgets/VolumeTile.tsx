import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Volume2, Volume1, VolumeX, Headphones, Speaker, Sparkles } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useVolume } from '../../hooks/useVolume'

export const VOLUME_WIDTH = FEATURE_CARD_WIDTH

export const VolumeTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { volume, muted, setVolume, toggleMute } = useVolume()
  const [isHovered, setIsHovered] = useState(false)

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
  const Icon = muted || effectiveLevel === 0 ? VolumeX : effectiveLevel < 40 ? Volume1 : Volume2

  const presets = [
    { label: 'Off', val: 0 },
    { label: '25%', val: 25 },
    { label: '50%', val: 50 },
    { label: '75%', val: 75 },
    { label: '100%', val: 100 },
  ]

  return (
    <FeatureCard
      title="Volume Control"
      icon={<Speaker size={15} className="text-white/80" />}
      accent={accent}
      action={
        <motion.button
          type="button"
          onClick={toggleMute}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`text-[12px] font-bold px-3 py-1 rounded-full transition-all duration-300 flex items-center gap-1.5 border ${
            muted
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${muted ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
          {muted ? 'Muted' : `${volume}%`}
        </motion.button>
      }
    >
      <div
        className="flex flex-1 flex-col justify-between py-1 select-none outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Hero Audio Visualizer Card */}
        <div className="relative flex flex-col items-center justify-center py-4 my-auto overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
          {/* Glowing Ambient Background */}
          <div
            className="absolute inset-0 opacity-20 transition-opacity duration-500 blur-2xl pointer-events-none"
            style={{
              background: muted
                ? 'radial-gradient(circle, rgba(244,63,94,0.4) 0%, transparent 70%)'
                : `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
            }}
          />

          {/* Interactive Mute Toggle Hero Button */}
          <motion.button
            type="button"
            onClick={toggleMute}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl shadow-xl transition-all duration-300"
            style={{
              background: muted
                ? 'rgba(244, 63, 94, 0.15)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
              border: `1px solid ${muted ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
              boxShadow: muted
                ? '0 0 20px rgba(244, 63, 94, 0.2)'
                : `0 0 25px ${accent}25`,
            }}
            title={muted ? 'Click to Unmute' : 'Click to Mute'}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={muted ? 'muted' : effectiveLevel < 40 ? 'low' : 'high'}
                initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
                transition={{ duration: 0.18 }}
              >
                <Icon
                  size={32}
                  style={{ color: muted ? '#f43f5e' : accent }}
                  className="filter drop-shadow-md"
                />
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Level Percentage & Status Subtitle */}
          <div className="text-center mt-2.5 z-10">
            <motion.span
              key={effectiveLevel}
              initial={{ y: -4, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-[30px] font-black text-white tabular-nums tracking-tight leading-none"
            >
              {muted ? 'Muted' : `${volume}%`}
            </motion.span>
            <p className="text-[12px] font-medium text-white/50 mt-1 flex items-center justify-center gap-1.5">
              <span>{muted ? 'Audio output is paused' : 'Master Volume'}</span>
              {!muted && isHovered && <Sparkles size={12} className="text-amber-400 animate-spin" />}
            </p>
          </div>
        </div>

        {/* Volume Slider & Quick Presets Section */}
        <div className="w-full space-y-3 px-1 my-2">
          {/* Custom Track Container */}
          <div className="relative flex items-center h-7 px-1">
            <input
              type="range"
              min={0}
              max={100}
              value={effectiveLevel}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              aria-label="Volume Slider"
            />
            {/* Track Background */}
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative border border-white/10 backdrop-blur-sm">
              <motion.div
                className="h-full rounded-full origin-left"
                style={{
                  background: muted
                    ? 'rgba(244, 63, 94, 0.4)'
                    : `linear-gradient(90deg, ${accent}88 0%, ${accent} 100%)`,
                }}
                animate={{ width: `${effectiveLevel}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
            {/* Animated Thumb Knob */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white shadow-2xl pointer-events-none border-2 border-black/30 flex items-center justify-center"
              animate={{ left: `calc(${effectiveLevel}% - 12px)` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: muted ? '#f43f5e' : accent }} />
            </motion.div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-5 gap-1.5 px-0.5">
            {presets.map((p) => {
              const isSelected = !muted && volume === p.val
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    if (p.val === 0) {
                      toggleMute()
                    } else {
                      if (muted) toggleMute()
                      setVolume(p.val)
                    }
                  }}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                    isSelected
                      ? 'bg-white text-black shadow-md scale-[1.03]'
                      : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Output Device & Footer Actions */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] px-1 mt-1">
          <div className="flex items-center gap-2 text-[12px] font-medium text-white/60 truncate max-w-[200px]">
            <Headphones size={14} className="text-white/40 shrink-0" />
            <span className="truncate">Default Speakers / Output</span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all duration-200 shadow-sm ${
              muted
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
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
