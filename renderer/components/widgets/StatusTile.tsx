import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Camera, Mic } from 'lucide-react'
import { Tile, TileLabel } from '../ui/tile'
import { CAMERA, LOW, LOW_LEVEL, MIC } from '../notch/CollapsedStatus'
import type { PrivacyState } from '../../hooks/usePrivacy'
import type { BatteryState } from '../../hooks/useBattery'
import { useUsage } from '../../hooks/useUsage'

export const STATUS_WIDTH = 176

/** The card's two faces: what is happening, and how hard the machine is working. */
export type StatusPage = 'now' | 'usage'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

/** The phone's charging green, and a quiet grey for a battery just being a battery. */
const CHARGING = '#30D158'
const PLAIN = '#C8C8D0'

/** Whether the battery is worth a row. A desktop reads as full and charging
 *  forever, and a full laptop on the mains has nothing to say either. */
const batteryShown = (battery: BatteryState) => battery.supported && !(battery.level >= 1 && battery.charging)

/** Whether the Right now page has anything to show: the card only joins the
 *  glance when it does, or when it has been flipped to Usage. */
export const statusShown = (privacy: PrivacyState, battery: BatteryState) =>
  privacy.micApps.length > 0 || privacy.cameraApps.length > 0 || batteryShown(battery)

/** One reading: a coloured dot with its icon, what, and a word on what kind. */
const Row: React.FC<{ icon: React.ReactNode; color: string; name: string; note: string }> = ({ icon, color, name, note }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: 12, transition: { duration: 0.18 } }}
    transition={spring}
    className="flex h-[26px] min-w-0 items-center gap-2"
  >
    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full" style={{ background: `${color}2e`, color }}>
      {icon}
    </span>
    <span className="min-w-0 flex-1 truncate text-[12.5px] leading-none text-white/85">{name}</span>
    <span className="shrink-0 text-[9.5px] font-medium leading-none text-white/40">{note}</span>
  </motion.div>
)

/** The three readings, outermost ring first. Each takes a shade of the
 *  companion's colour, light to deep, which the legend names. */
const READINGS = [
  { key: 'cpu', label: 'CPU', shade: 22 },
  { key: 'gpu', label: 'GPU', shade: 0 },
  { key: 'memory', label: 'Memory', shade: -16 },
] as const

/**
 * A colour lighter or darker than `hex` by `delta` points of lightness, in
 * HSL so the hue holds: the companion's orange stays orange, only paler or
 * deeper. White (the photo avatar) can only go darker, to a grey.
 */
const shade = (hex: string, delta: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return `hsl(${Math.round(h * 60)} ${Math.round(s * 100)}% ${Math.round(Math.min(100, Math.max(0, l * 100 + delta)))}%)`
}

/** The rings' box, and their geometry: three 5px strokes, 2px apart, in 60px,
 *  leaving the legend room for "Memory" in full. */
const RINGS = 60
const STROKE = 5
const radius = (index: number) => RINGS / 2 - STROKE / 2 - index * (STROKE + 2)

/** One ring: a faint track, and the reading drawn over it clockwise from the top. */
const Ring: React.FC<{ r: number; share: number | null; color: string }> = ({ r, share, color }) => {
  const length = 2 * Math.PI * r
  return (
    <>
      <circle cx={RINGS / 2} cy={RINGS / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
      <motion.circle
        cx={RINGS / 2}
        cy={RINGS / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={length}
        initial={false}
        animate={{ strokeDashoffset: length * (1 - Math.min(1, share ?? 0)), opacity: share == null ? 0 : 1 }}
        transition={spring}
      />
    </>
  )
}

const percent = (share: number | null) => (share == null ? '—' : `${Math.round(share * 100)}%`)

/**
 * CPU, GPU and memory as three rings, one inside the other, the way the
 * Watch draws a day, in shades of the companion's colour; beside them, the
 * legend says which shade is which and how much. A ring stays a track until
 * its reading has arrived.
 */
const UsagePage: React.FC<{ accent: string }> = ({ accent }) => {
  const usage = useUsage(true)
  const shares: Record<(typeof READINGS)[number]['key'], number | null> = {
    cpu: usage?.cpu ?? null,
    gpu: usage?.gpu == null ? null : usage.gpu / 100,
    memory: usage?.memory ?? null,
  }

  return (
    <div className="flex h-full items-center gap-2">
      <svg viewBox={`0 0 ${RINGS} ${RINGS}`} width={RINGS} height={RINGS} className="shrink-0 -rotate-90">
        {READINGS.map((reading, index) => (
          <Ring key={reading.key} r={radius(index)} share={shares[reading.key]} color={shade(accent, reading.shade)} />
        ))}
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        {READINGS.map((reading) => (
          <div key={reading.key} className="flex items-center gap-1.5">
            <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: shade(accent, reading.shade) }} />
            <span className="min-w-0 flex-1 truncate text-[7.5px] font-bold uppercase leading-none tracking-[0.05em] text-white/40">{reading.label}</span>
            <span
              className="shrink-0 text-[10px] font-semibold tabular-nums leading-none"
              style={{ color: shares[reading.key] == null ? 'rgba(255,255,255,0.3)' : shade(accent, reading.shade) }}
            >
              {percent(shares[reading.key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** The apps on the microphone and camera, in the dots' colours, and the battery. */
const NowPage: React.FC<{ privacy: PrivacyState; battery: BatteryState }> = ({ privacy, battery }) => {
  const low = !battery.charging && battery.level <= LOW_LEVEL
  const BatteryIcon = battery.charging ? BatteryCharging : low ? BatteryLow : battery.level < 0.6 ? BatteryMedium : BatteryFull
  const quiet = !statusShown(privacy, battery)

  return (
    <div className="flex flex-col gap-1">
      <AnimatePresence initial={false}>
        {privacy.micApps.length > 0 && (
          <Row key="mic" icon={<Mic size={10} strokeWidth={2.4} />} color={MIC} name={privacy.micApps.join(', ')} note="Microphone" />
        )}
        {privacy.cameraApps.length > 0 && (
          <Row key="camera" icon={<Camera size={10} strokeWidth={2.4} />} color={CAMERA} name={privacy.cameraApps.join(', ')} note="Camera" />
        )}
        {batteryShown(battery) && (
          <Row
            key="battery"
            icon={<BatteryIcon size={11} strokeWidth={2.4} />}
            color={battery.charging ? CHARGING : low ? LOW : PLAIN}
            name={`${Math.round(battery.level * 100)}%`}
            note={battery.charging ? 'Charging' : low ? 'Low' : 'On battery'}
          />
        )}
      </AnimatePresence>
      {/* Seen only in passing: with nothing to say, the card leaves unless it is on Usage. */}
      {quiet && <span className="py-2 text-[12px] text-white/35">All quiet</span>}
    </div>
  )
}

/**
 * The closed bar's edge readings, while the notch is open, with a second face
 * behind them. Right now: a row per app on the microphone or camera and one
 * for the battery, coming and going with what is happening. Usage: how hard
 * the machine is working. The arrow in the corner slides one over the other.
 */
export const StatusTile: React.FC<{
  privacy: PrivacyState
  battery: BatteryState
  /** The companion's colour: the usage rings take their shades from it. */
  accent: string
  page: StatusPage
  onPage: (page: StatusPage) => void
}> = ({ privacy, battery, accent, page, onPage }) => {
  // Usage sits to the right of Right now: going there slides in from the right, coming back from the left.
  const dir = page === 'usage' ? 1 : -1

  return (
    <Tile width={STATUS_WIDTH}>
      <div className="flex h-full flex-col">
        <div className="mb-1.5 flex items-center justify-between">
          <TileLabel>{page === 'now' ? 'Right now' : 'Usage'}</TileLabel>
          <motion.button
            type="button"
            aria-label={page === 'now' ? 'Show usage' : 'Show right now'}
            title={page === 'now' ? 'Usage' : 'Right now'}
            whileTap={{ scale: 0.88 }}
            onClick={(event) => {
              event.stopPropagation()
              onPage(page === 'now' ? 'usage' : 'now')
            }}
            className="-mr-1 -mt-1.5 grid h-[20px] w-[20px] place-items-center rounded-full text-white/40 transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            <ArrowLeftRight size={11} strokeWidth={2.4} />
          </motion.button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              className="h-full"
              initial={{ opacity: 0, x: 16 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 * dir }}
              transition={{ duration: 0.16 }}
            >
              {page === 'now' ? <NowPage privacy={privacy} battery={battery} /> : <UsagePage accent={accent} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Tile>
  )
}
