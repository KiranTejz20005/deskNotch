import React, { useState } from 'react'
import { Bell, BellOff, Moon, Clock } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useDnd } from '../../hooks/useDnd'

export const DND_WIDTH = FEATURE_CARD_WIDTH

export const DndTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { enabled, toggleDnd } = useDnd()
  const [selectedDuration, setSelectedDuration] = useState<string>('30m')

  const durations = ['30m', '1h', '2h', 'Until tomorrow']

  return (
    <FeatureCard
      title="Focus Mode"
      icon={<Moon size={15} />}
      accent={accent}
      action={
        <span
          className={`text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
            enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/50'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </span>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-between py-2 text-center">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl transition-all duration-300 shadow-inner"
            style={{
              background: enabled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${enabled ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            }}
          >
            {enabled ? (
              <BellOff size={28} className="text-emerald-400" />
            ) : (
              <Bell size={28} className="text-white/60" />
            )}
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-white tracking-tight">Do Not Disturb</h3>
            <p className="text-[13px] font-medium text-white/50 mt-0.5">
              {enabled ? 'Notifications and alerts are paused' : 'Notifications are currently allowed'}
            </p>
          </div>
        </div>

        {/* Duration Selection Row */}
        <div className="w-full pt-3 border-t border-white/[0.08] my-2">
          <div className="flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-white/50 mb-2">
            <Clock size={12} />
            <span>Duration</span>
          </div>
          <div className="grid grid-cols-4 gap-2 px-2">
            {durations.map((dur) => {
              const isSelected = selectedDuration === dur
              return (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setSelectedDuration(dur)}
                  className={`py-1.5 px-2 rounded-lg text-[12px] font-medium transition-all ${
                    isSelected
                      ? 'bg-white/20 text-white font-semibold border border-white/20 shadow-sm'
                      : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.09] hover:text-white/80'
                  }`}
                >
                  {dur}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Action Toggle */}
        <div className="w-full px-2">
          <button
            type="button"
            onClick={toggleDnd}
            className={`w-full py-2.5 rounded-xl text-[13.5px] font-bold transition-all shadow-md active:scale-[0.99] ${
              enabled
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {enabled ? 'Turn Off Do Not Disturb' : 'Enable Do Not Disturb'}
          </button>
        </div>
      </div>
    </FeatureCard>
  )
}
