import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bluetooth,
  Headphones,
  Wifi,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  Zap,
  Snowflake,
  CloudFog,
  Battery,
} from 'lucide-react'
import { time12 } from '../../lib/time'
import type { NowPlaying } from '../../hooks/useNowPlaying'
import type { TaskStore } from '../../hooks/useTasks'
import type { Timer } from '../../hooks/useTimer'
import { botAvatarPalette } from 'bot-avatars'
import type { Avatar } from '../widgets/SettingsPanel'
import type { ProviderLimits } from '../../hooks/useAiLimits'
import type { PrivacyState } from '../../hooks/usePrivacy'
import type { WeatherData } from '../../hooks/useWeather'
import type { BatteryData } from '../../hooks/useBattery'
import type { BluetoothDevice } from '../../hooks/useBluetoothBattery'
import { useNow } from '../../hooks/useNow'
import { WARNING } from '../widgets/AiOrbs'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

const WEATHER_ICON = {
  sun: Sun,
  cloud: Cloud,
  partly: CloudSun,
  rain: CloudRain,
  storm: Zap,
  snow: Snowflake,
  fog: CloudFog,
}

/** Three bars that only move while audio is playing. */
const Pulse: React.FC = () => (
  <div className="flex items-end gap-[2px] h-[9px]">
    {[0.85, 1.15, 0.95].map((duration, index) => (
      <motion.span
        key={index}
        className="w-[2px] rounded-full bg-white/70"
        animate={{ height: ['30%', '100%', '45%', '30%'] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay: index * 0.1 }}
      />
    ))}
  </div>
)

/** Headphones, a Wi-Fi network or a Bluetooth device that just connected. */
export type Moment = { kind: 'headphones' | 'wifi' | 'bluetooth'; name: string }

const MOMENT_ICON = { headphones: Headphones, wifi: Wifi, bluetooth: Bluetooth }

interface CollapsedStatusProps {
  nowPlaying: NowPlaying | null
  tasks: TaskStore
  timer: Timer
  /** The companion, for its colour (the focus ring); not drawn in the bar. */
  avatar?: Avatar | null
  photo?: string | null
  /** The right side: the time, AI limits, weather, battery, or bluetooth. */
  right: 'time' | 'ai' | 'weather' | 'battery' | 'bluetooth'
  limits: ProviderLimits[]
  privacy: PrivacyState
  /** Something that just connected: the bar gives itself to it for a moment. */
  moment?: Moment | null
  weather?: WeatherData | null
  battery?: BatteryData | null
  bluetooth?: BluetoothDevice | null
}

/** The tool with a session window (Claude), else the first with any reading:
 *  its session and its longer window, for the two rings. */
const windows = (providers: ProviderLimits[]) => {
  const read = providers.flatMap((p) => ('limits' in p ? [p.limits] : []))
  const limits = read.find((l) => l.some((x) => x.label === 'SESSION')) ?? read[0]
  if (!limits) return null
  const session = limits.find((l) => l.label === 'SESSION')
  const long = limits.find((l) => l.label !== 'SESSION')
  return { session: session?.used ?? null, long: long?.used ?? null }
}

const colour = (used: number) => (used >= 80 ? WARNING : 'rgba(255,255,255,0.85)')

/** One ring of the pair: a faint track and the used part over it. */
const Ring: React.FC<{ r: number; used: number }> = ({ r, used }) => (
  <>
    <circle cx="8" cy="8" r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
    <circle
      cx="8"
      cy="8"
      r={r}
      fill="none"
      stroke={colour(used)}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={2 * Math.PI * r}
      strokeDashoffset={2 * Math.PI * r * (1 - Math.min(100, used) / 100)}
    />
  </>
)

/** The Island's privacy colours: orange for the microphone, green for the camera. */
const MIC = '#FF9F0A'
const CAMERA = '#30D158'

/** The clock, 12-hour, with a small AM/PM. */
const Clock: React.FC = () => {
  const { clock, meridiem } = time12(useNow())
  return (
    <span className="flex items-baseline gap-[3px] whitespace-nowrap font-semibold tabular-nums text-white/75">
      <span className="text-[10.5px]">{clock}</span>
      <span className="text-[8px] text-white/45">{meridiem}</span>
    </span>
  )
}

/**
 * The right of the bar: the chosen reading (time, AI, weather, battery, or bluetooth),
 * then any privacy dots at the very edge.
 */
const Right: React.FC<{
  right: 'time' | 'ai' | 'weather' | 'battery' | 'bluetooth'
  timeOnLeft: boolean
  limits: ProviderLimits[]
  privacy: PrivacyState
  weather?: WeatherData | null
  battery?: BatteryData | null
  bluetooth?: BluetoothDevice | null
}> = ({ right, timeOnLeft, limits, privacy, weather, battery, bluetooth }) => {
  const ai = right === 'ai' ? windows(limits) : null
  const dots = [privacy.camera && CAMERA, privacy.mic && MIC].filter(Boolean) as string[]

  const WeatherIconComponent = weather ? WEATHER_ICON[weather.icon] || Sun : Sun

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      {right === 'weather' && weather ? (
        <span className="flex items-center gap-1">
          <WeatherIconComponent size={12} className={weather.icon === 'sun' ? 'text-amber-400 shrink-0' : 'text-sky-300 shrink-0'} />
          <span className="text-[10.5px] font-semibold tabular-nums text-white/80">{Math.round(weather.temperature)}°</span>
        </span>
      ) : right === 'battery' && battery ? (
        <span className="flex items-center gap-1">
          {battery.charging ? (
            <Zap size={11} className="text-amber-400 fill-amber-400 animate-pulse shrink-0" />
          ) : (
            <Battery size={13} className={battery.isLow ? 'text-rose-400 shrink-0' : 'text-white/75 shrink-0'} />
          )}
          <span className={`text-[10.5px] font-semibold tabular-nums ${battery.isLow ? 'text-rose-400 font-bold' : 'text-white/80'}`}>
            {battery.level}%
          </span>
        </span>
      ) : right === 'bluetooth' && bluetooth && bluetooth.connected ? (
        <span className="flex items-center gap-1">
          {bluetooth.kind === 'headphones' ? (
            <Headphones size={12} className="text-white/75 shrink-0" />
          ) : (
            <Bluetooth size={12} className="text-sky-400 shrink-0" />
          )}
          <span className="text-[10.5px] font-semibold tabular-nums text-white/80">{bluetooth.batteryPercent}%</span>
        </span>
      ) : right === 'ai' && ai ? (
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" className="h-[13px] w-[13px] -rotate-90">
            {ai.long !== null && <Ring r={7} used={ai.long} />}
            {ai.session !== null && <Ring r={3.6} used={ai.session} />}
          </svg>
          <span className="text-[10.5px] font-semibold tabular-nums">
            {ai.session !== null && <span style={{ color: colour(ai.session) }}>{Math.round(ai.session)}%</span>}
            {ai.session !== null && ai.long !== null && <span className="text-white/30"> / </span>}
            {ai.long !== null && <span style={{ color: colour(ai.long) }}>{Math.round(ai.long)}%</span>}
          </span>
        </span>
      ) : (
        !timeOnLeft && <Clock />
      )}
      <AnimatePresence>
        {dots.map((color) => (
          <motion.span
            key={color}
            aria-label={color === MIC ? 'Microphone in use' : 'Camera in use'}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ background: color }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * What the notch says when it is closed.
 *
 * One thing at a time, most urgent first: a focus session running, then
 * music (just the art and a pulse — the title was a status line nobody read),
 * then what is left to do.
 */
const Status: React.FC<CollapsedStatusProps> = ({ nowPlaying, tasks, timer, avatar, right, limits, privacy, weather, battery, bluetooth }) => {
  const focusing = timer.isRunning
  const isPlaying = !focusing && Boolean(nowPlaying?.isPlaying)
  const open = focusing || isPlaying ? 0 : tasks.tasks.filter((task) => !task.done).length
  const idle = !focusing && !isPlaying

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {/* Nothing running and nothing playing: the time takes the left. */}
      <AnimatePresence mode="popLayout">
        {idle && (
          <motion.div
            key="time"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <Clock />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {focusing && (
          <motion.div
            key="focus"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="flex items-center gap-1.5 overflow-hidden"
          >
            {/* The session as a ring, the same shape as the card it came from. */}
            <svg viewBox="0 0 12 12" className="h-[11px] w-[11px] shrink-0 -rotate-90">
              <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
              <motion.circle
                cx="6"
                cy="6"
                r="4.5"
                fill="none"
                stroke={avatar && avatar !== 'photo' ? botAvatarPalette[avatar] : 'white'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 4.5}
                animate={{ strokeDashoffset: 2 * Math.PI * 4.5 * (timer.durationMs ? timer.remainingMs / timer.durationMs : 1) }}
                transition={{ ease: 'linear', duration: 0.3 }}
              />
            </svg>
            <span className="text-[10px] font-semibold tabular-nums text-white/80 whitespace-nowrap">
              {clock(timer.remainingMs)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {isPlaying && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="flex items-center gap-2 min-w-0 overflow-hidden"
          >
            {/* The art, then the title, then the pulse: what, which, and that it
                is still going — the Island's own order. */}
            {nowPlaying?.thumbnailUrl && (
              <img
                src={nowPlaying.thumbnailUrl}
                alt=""
                className="h-[16px] w-[16px] shrink-0 rounded-[4px] object-cover"
              />
            )}
            <Pulse />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {open > 0 && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
            className="flex items-center gap-1 overflow-hidden"
          >
            <span className="w-[5px] h-[5px] rounded-full bg-white/35 shrink-0" />
            <span className="text-[10px] tabular-nums text-white/45 whitespace-nowrap">
              {open}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <Right right={right} timeOnLeft={idle} limits={limits} privacy={privacy} weather={weather} battery={battery} bluetooth={bluetooth} />
    </div>
  )
}

/**
 * Something connecting, the AirPods way: its icon swings in from the left,
 * the name follows, and after a beat the whole thing slides back out and
 * the usual bar returns.
 */
const ConnectedMoment: React.FC<{ moment: Moment }> = ({ moment }) => {
  const Icon = MOMENT_ICON[moment.kind]
  return (
  <motion.div
    className="flex min-w-0 flex-1 items-center gap-2.5"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, x: -8, transition: { duration: 0.18 } }}
  >
    <motion.span
      className="grid shrink-0 text-white"
      initial={{ x: -18, rotate: -25, scale: 0.6 }}
      animate={{ x: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 18 }}
    >
      <Icon size={14} strokeWidth={2.2} />
    </motion.span>
    <motion.span
      className="min-w-0 truncate text-[10.5px] font-semibold text-white/90"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08, duration: 0.2 }}
    >
      {moment.name}
    </motion.span>
    <motion.span
      className="ml-auto shrink-0 text-[10px] font-medium text-white/45"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.14, duration: 0.2 }}
    >
      Connected
    </motion.span>
  </motion.div>
  )
}

/**
 * What the notch says when it is closed: the usual status, or for a moment,
 * something that just happened.
 */
export const CollapsedStatus: React.FC<CollapsedStatusProps> = (props) => (
  <AnimatePresence mode="wait" initial={false}>
    {props.moment ? (
      <ConnectedMoment key={`${props.moment.kind}:${props.moment.name}`} moment={props.moment} />
    ) : (
      <motion.div
        key="status"
        className="flex min-w-0 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
      >
        <Status {...props} />
      </motion.div>
    )}
  </AnimatePresence>
)
