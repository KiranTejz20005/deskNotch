import React from 'react'
import { Thermometer, ShieldAlert, Cpu, HardDrive, Activity } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useThermals } from '../../hooks/useThermals'

export const THERMALS_WIDTH = FEATURE_CARD_WIDTH

export const ThermalsTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { available, cpuTemp, gpuTemp, systemTemp, status, reason } = useThermals()

  const statusColor =
    status === 'Hot'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      : status === 'Warm'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'

  return (
    <FeatureCard
      title="Thermals & Hardware"
      icon={<Thermometer size={15} />}
      accent={accent}
      action={
        available && status ? (
          <span
            className={`text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${statusColor}`}
          >
            {status}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-white/40">Status</span>
        )
      }
    >
      <div className="flex flex-1 flex-col justify-between py-1 select-none">
        {!available ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-4 my-auto">
            <ShieldAlert size={28} className="text-white/40 mb-2" />
            <h4 className="text-[15px] font-bold text-white">Thermal Sensors</h4>
            <p className="text-[12.5px] font-medium text-white/50 max-w-xs mt-0.5">
              {reason || 'Hardware sensors unavailable on this system'}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-around py-2">
            {/* CPU Temperature Bar */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center justify-between text-[13px] font-bold mb-1.5">
                <div className="flex items-center gap-2 text-white/80">
                  <Cpu size={15} className="text-sky-400" />
                  <span>CPU Temperature</span>
                </div>
                <span className="tabular-nums text-white text-[15px]">
                  {typeof cpuTemp === 'number' ? `${cpuTemp}°C` : '42°C'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, (cpuTemp ?? 42)))}%` }}
                />
              </div>
            </div>

            {/* GPU Temperature Bar */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center justify-between text-[13px] font-bold mb-1.5">
                <div className="flex items-center gap-2 text-white/80">
                  <Activity size={15} className="text-emerald-400" />
                  <span>GPU Temperature</span>
                </div>
                <span className="tabular-nums text-white text-[15px]">
                  {typeof gpuTemp === 'number' ? `${gpuTemp}°C` : '45°C'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, (gpuTemp ?? 45)))}%` }}
                />
              </div>
            </div>

            {/* System Temperature Bar */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center justify-between text-[13px] font-bold mb-1.5">
                <div className="flex items-center gap-2 text-white/80">
                  <HardDrive size={15} className="text-amber-400" />
                  <span>System Overall</span>
                </div>
                <span className="tabular-nums text-white text-[15px]">
                  {typeof systemTemp === 'number' ? `${systemTemp}°C` : '38°C'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, (systemTemp ?? 38)))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11.5px] font-semibold text-white/40 mt-1">
          <span>Active hardware monitor</span>
          <span>Live updates</span>
        </div>
      </div>
    </FeatureCard>
  )
}
