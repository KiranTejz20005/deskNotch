import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { AnimatePresence, motion } from 'motion/react'
import {
  Inbox,
  LayoutGrid,
  Settings2,
  CheckSquare,
  Volume2,
  Timer,
  Clipboard,
  Sun,
  BellOff,
  Bell,
  Thermometer,
} from 'lucide-react'
import { NotchChassis, CHROME_X, CHROME_Y, PAD } from '../components/notch/NotchChassis'
import { AmbientVideo } from '../components/notch/AmbientVideo'
import { CollapsedStatus, type Moment } from '../components/notch/CollapsedStatus'
import { ViewRail, RailButton, type ViewDefinition } from '../components/notch/ViewSwitcher'
import { SettingsPanel, DEFAULT_SETTINGS, DOCK_SCALE, SETTINGS_PANE, type Settings } from '../components/widgets/SettingsPanel'
import { DeskView, DESK_WIDTH, DESK_HEIGHT } from '../components/widgets/DeskView'
import { FEATURE_CARD_WIDTH, FEATURE_CARD_HEIGHT } from '../components/ui/FeatureCard'
import { AppsRow } from '../components/widgets/AppsRow'
import { useFocusLog } from '../hooks/useFocusLog'
import { FileStrip, SHELF_HEIGHT, shelfWidth } from '../components/widgets/FileStrip'
import { CaptureView, CAPTURE_HEIGHT, CAPTURE_WIDTH } from '../components/widgets/CaptureView'
import { DoneView, DONE_HEIGHT, DONE_WIDTH } from '../components/widgets/DoneView'
import { ReminderView, REMINDER_HEIGHT, REMINDER_WIDTH } from '../components/widgets/ReminderView'
import { useReminders, type Reminder } from '../hooks/useReminders'
import type { FileItem } from '../hooks/useFiles'
import { botAvatarPalette } from 'bot-avatars'
import { CompanionTile, COMPANION_WIDTH, COMPANION_OPEN_WIDTH, COMPANION_REMINDER_WIDTH, COMPANION_TIME_WIDTH, type CompanionMode } from '../components/widgets/CompanionTile'
import { MediaTile, TimeTile, TaskTile, MEDIA_WIDTH, TIME_WIDTH, TASK_WIDTH } from '../components/widgets/GlanceTiles'
import { VolumeTile } from '../components/widgets/VolumeTile'
import { StopwatchTile } from '../components/widgets/StopwatchTile'
import { ClipboardTile } from '../components/widgets/ClipboardTile'
import { WeatherTile } from '../components/widgets/WeatherTile'
import { DndTile } from '../components/widgets/DndTile'
import { NotificationTile } from '../components/widgets/NotificationTile'
import { ThermalsTile } from '../components/widgets/ThermalsTile'
import { FocusTile, FOCUS_WIDTH } from '../components/widgets/FocusTile'
import { StatusTile, STATUS_WIDTH, statusShown, type StatusPage } from '../components/widgets/StatusTile'
import { AiOrbs, providerWidth, visibleLimits } from '../components/widgets/AiOrbs'
import { AloneContext, TILE, TILE_GAP } from '../components/ui/tile'
import { MAX_CARDS } from '../lib/glance'
import { onStoreChange } from '../lib/store'
import { usePhoto } from '../hooks/usePhoto'
import { useNowPlaying } from '../hooks/useNowPlaying'
import { useDominantColor } from '../hooks/useDominantColor'
import { useWallpaperColor } from '../hooks/useWallpaperColor'
import { useTimer } from '../hooks/useTimer'
import { useTasks } from '../hooks/useTasks'
import { useAiLimits } from '../hooks/useAiLimits'
import { usePrivacy } from '../hooks/usePrivacy'
import { useHeadphones } from '../hooks/useHeadphones'
import { useWeather } from '../hooks/useWeather'
import { useBattery } from '../hooks/useBattery'
import { useBluetoothBattery } from '../hooks/useBluetoothBattery'
import { useScreenTime } from '../hooks/useScreenTime'

/** The places to go, as circles on the dock. Settings is a control, not a
 *  place, so it sits after them with the lock. */
const VIEWS: ViewDefinition[] = [
  { id: 'glance', label: 'Glance', icon: <LayoutGrid size={12} strokeWidth={2.2} /> },
  { id: 'desk', label: 'Tasks', icon: <CheckSquare size={12} strokeWidth={2.2} /> },
  { id: 'files', label: 'Shelf', icon: <Inbox size={12} strokeWidth={2.2} /> },
  { id: 'volume', label: 'Volume', icon: <Volume2 size={12} strokeWidth={2.2} /> },
  { id: 'stopwatch', label: 'Stopwatch', icon: <Timer size={12} strokeWidth={2.2} /> },
  { id: 'clipboard', label: 'Clipboard', icon: <Clipboard size={12} strokeWidth={2.2} /> },
  { id: 'weather', label: 'Weather', icon: <Sun size={12} strokeWidth={2.2} /> },
  { id: 'dnd', label: 'Focus / DND', icon: <BellOff size={12} strokeWidth={2.2} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={12} strokeWidth={2.2} /> },
  { id: 'thermals', label: 'Thermals', icon: <Thermometer size={12} strokeWidth={2.2} /> },
]

/** Each view sets the shell it needs; the notch springs between them. */
const SIZES: Record<string, { width: number; height: number }> = {
  desk: { width: DESK_WIDTH, height: DESK_HEIGHT },
  settings: { width: CHROME_X + 620, height: CHROME_Y + SETTINGS_PANE },
  tasks: { width: DESK_WIDTH, height: DESK_HEIGHT },
  volume: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
  stopwatch: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
  clipboard: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
  weather: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
  dnd: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
  notifications: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
  thermals: { width: FEATURE_CARD_WIDTH, height: FEATURE_CARD_HEIGHT },
}

/** The notch's side padding around the card row. */
const PADDING = PAD
/** The bar, a clear step, the cards, and room below them. */
const GLANCE_HEIGHT = CHROME_Y + TILE

/** The battery levels that each get a warning on the way down, lowest first. */
const LOW_STEPS = [0.1, 0.2]

/** Calls `announce` with a name newly in `names` since the last change. */
function useArrivals(names: string[], announce: (name: string) => void) {
  const key = names.join(';')
  const last = useRef<string[]>([])
  useEffect(() => {
    const arrived = names.find((name) => !last.current.includes(name))
    if (arrived) announce(arrived)
    last.current = names
  }, [key])
}

export default function HomePage() {
  const nowPlaying = useNowPlaying()
  const albumTint = useDominantColor(nowPlaying?.thumbnailUrl)
  const wallpaperColor = useWallpaperColor()
  const timer = useTimer()
  const tasks = useTasks()
  const reminders = useReminders()
  const focusLog = useFocusLog(timer)
  const [view, setView] = useState('glance')

  // A file dragged over the notch from outside: open Files, where the shelf is
  // waiting to take it.
  const [dragging, setDragging] = useState(false)
  const [shelfCount, setShelfCount] = useState(0)
  useEffect(() => {
    let depth = 0
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth += 1
      setDragging(true)
      setView('files')
    }
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const end = () => {
      depth = 0
      setDragging(false)
    }

    const drop = (event: DragEvent) => {
      end()
      if (event.defaultPrevented || !hasFiles(event)) return
      event.preventDefault()
      const paths = Array.from(event.dataTransfer?.files ?? [])
        .map((file) => window.bridge?.pathOf(file) ?? '')
        .filter(Boolean)
      if (!paths.length) return
      setView('files')
      const taken = !window.dispatchEvent(new CustomEvent('shelf:add', { detail: paths, cancelable: true }))
      if (!taken)
        void window.bridge
          ?.invoke<string[]>('store:get', 'shelf')
          .then((list) => window.bridge?.invoke('store:set', 'shelf', [...(list ?? []).filter((p) => !paths.includes(p)), ...paths]))
    }

    const over = (event: DragEvent) => hasFiles(event) && event.preventDefault()
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    window.addEventListener('dragend', end)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
      window.removeEventListener('dragend', end)
    }
  }, [])
  const [hubOpen, setHubOpen] = useState(false)
  /** Which face the Right now card shows; on Usage it stays even with nothing happening. */
  const [statusPage, setStatusPage] = useState<StatusPage>('now')

  // Moments: something happens while the notch is closed (a screenshot, a
  // focus session ending), so it opens on it by itself for a few seconds.
  const [capture, setCapture] = useState<FileItem | null>(null)
  const [holdOpen, setHoldOpen] = useState(false)
  const [closeKey, setCloseKey] = useState(0)
  const notchOpen = useRef(false)
  const catchScreenshots = useRef(true)
  /** The view to return to once a moment folds away; null when not peeking. */
  const beforePeek = useRef<string | null>(null)
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const peek = (target: string, ms: number) => {
    setView((current) => {
      if (beforePeek.current === null) beforePeek.current = current
      return target
    })
    setHoldOpen(true)
    clearTimeout(release.current)
    release.current = setTimeout(() => setHoldOpen(false), ms)
  }
  useEffect(() => () => clearTimeout(release.current), [])

  useEffect(
    () =>
      window.bridge?.on<string>('screenshot:new', async (file) => {
        if (!catchScreenshots.current || notchOpen.current) return
        const [item] = (await window.bridge?.invoke<FileItem[]>('files:describe', [file])) ?? []
        if (!item) return
        setCapture(item)
        peek('capture', 4500)
      }),
    [],
  )

  useEffect(() => {
    const unsubNav = window.bridge?.on<string>('notch:navigate', (targetView) => {
      if (typeof targetView === 'string') {
        setView(targetView)
      }
    })
    const unsubOpen = window.bridge?.on('notch:open', () => {
      peek(view || 'glance', 6000)
    })
    return () => {
      unsubNav?.()
      unsubOpen?.()
    }
  }, [view])

  const openChanged = (open: boolean) => {
    notchOpen.current = open
    if (!open) {
      setView('glance')
      beforePeek.current = null
      setCapture(null)
    }
  }

  const { photo } = usePhoto()
  const privacy = usePrivacy()
  const headphones = useHeadphones()
  const weather = useWeather()
  const battery = useBattery()
  const bluetooth = useBluetoothBattery()

  const [moment, setMoment] = useState<Moment | null>(null)
  const momentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastHeadphones = useRef(0)
  const warm = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => (warm.current = true), 12000)
    return () => {
      clearTimeout(t)
      clearTimeout(momentTimer.current)
    }
  }, [])

  const show = (next: Moment) => {
    setMoment(next)
    clearTimeout(momentTimer.current)
    momentTimer.current = setTimeout(() => setMoment(null), 1600)
  }

  useEffect(() => {
    if (!headphones) return
    lastHeadphones.current = Date.now()
    show({ kind: 'headphones', name: headphones })
  }, [headphones])

  const wifiName = privacy.wifi?.name ?? null
  const lastWifi = useRef<string | null>(null)
  useEffect(() => {
    if (warm.current && wifiName && wifiName !== lastWifi.current) show({ kind: 'wifi', name: wifiName })
    lastWifi.current = wifiName
  }, [wifiName])

  useArrivals(
    privacy.bluetooth.map((device) => device.name),
    (name) => {
      const charge = privacy.bluetooth.find((device) => device.name === name)?.battery
      const said = Date.now() - lastHeadphones.current < 30000
      if (!warm.current || (said && charge == null)) return
      show({ kind: 'bluetooth', name, detail: charge == null ? undefined : `Connected · ${charge}%` })
    },
  )

  useArrivals(privacy.micApps, (name) => warm.current && show({ kind: 'mic', name, detail: 'Microphone' }))
  useArrivals(privacy.cameraApps, (name) => warm.current && show({ kind: 'camera', name, detail: 'Camera' }))

  const lastCharging = useRef<boolean | null>(null)
  useEffect(() => {
    if (!battery.supported) return
    const charge = `${Math.round(battery.level * 100)}%`
    if (lastCharging.current !== null && battery.charging !== lastCharging.current)
      show(battery.charging ? { kind: 'charging', name: 'Charging', detail: charge } : { kind: 'battery', name: 'On battery', detail: charge })
    lastCharging.current = battery.charging
  }, [battery.supported, battery.charging])

  const warnedAt = useRef(1)
  useEffect(() => {
    if (!battery.supported) return
    if (battery.charging) {
      warnedAt.current = 1
      return
    }
    const step = LOW_STEPS.find((level) => battery.level <= level && warnedAt.current > level)
    if (step === undefined) return
    warnedAt.current = step
    show({ kind: 'battery', name: 'Battery low', detail: `${Math.round(battery.level * 100)}%` })
  }, [battery.supported, battery.charging, battery.level])

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)
  const nothingChosen = !settings.showAvatar && !settings.showMusic && !settings.showTasks && !settings.showFocus
  const collapsedWantsAi = settings.collapsedRight === 'ai'
  const aiLimits = useAiLimits(settings.showAiUsage || nothingChosen || view === 'settings' || collapsedWantsAi)

  useEffect(() => {
    window.bridge
      ?.invoke<Partial<Settings>>('store:get', 'settings')
      .then(async (stored) => {
        const loadedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...stored,
          notchStyle:
            (stored?.notchStyle as string) === 'translucent'
              ? 'glass'
              : (stored?.notchStyle as string) === 'mica'
                ? 'black'
                : (stored?.notchStyle ?? DEFAULT_SETTINGS.notchStyle),
          showFocus: false,
          companionMode:
            ((stored?.companionMode as string) === 'ai'
              ? 'screen'
              : (stored?.companionMode as string) === 'tasks'
                ? 'reminder'
                : stored?.companionMode) ??
            ((Array.isArray((stored as any)?.companionSays) && (stored as any)?.companionSays[0]) as CompanionMode | undefined) ??
            DEFAULT_SETTINGS.companionMode,
        }

        try {
          const actualStartOnBoot = await window.bridge?.invoke<boolean>(
            'settings:start-on-boot',
            stored?.startOnBoot ?? DEFAULT_SETTINGS.startOnBoot,
          )
          if (typeof actualStartOnBoot === 'boolean') {
            loadedSettings.startOnBoot = actualStartOnBoot
          }
        } catch {}

        setSettings(loadedSettings)
      })
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => {
        settingsLoaded.current = true
      })
  }, [])

  useEffect(() => onStoreChange<Settings>('settings', setSettings), [])

  const screenTime = useScreenTime(settings.collapsedRight === 'screen' || (settings.showAvatar && settings.companionMode === 'screen'))
  const collapsedRight = settings.collapsedRight === 'screen' && !screenTime.installed ? 'time' : (settings.collapsedRight ?? 'time')
  const companionMode = settings.companionMode === 'screen' && !screenTime.installed ? 'focus' : settings.companionMode

  const [tucked, setTucked] = useState(false)
  useEffect(() => {
    void window.bridge?.invoke<boolean>('notch:tucked').then((t) => setTucked(Boolean(t)))
    return window.bridge?.on<boolean>('notch:tucked', setTucked)
  }, [])

  useEffect(() => {
    if (!settingsLoaded.current) return
    void window.bridge?.invoke('store:set', 'settings', settings)
    void window.bridge?.invoke('settings:start-on-boot', settings.startOnBoot)
  }, [settings])

  catchScreenshots.current = settings.catchScreenshots ?? true

  const shownViews = VIEWS.filter((v) => !(settings.hiddenViews ?? []).includes(v.id))
  useEffect(() => {
    if (VIEWS.some((v) => v.id === view) && !shownViews.some((v) => v.id === view)) setView(shownViews[0]?.id ?? 'glance')
  }, [settings.hiddenViews, view])

  const chosenApps = settings.appsSide ?? 'auto'
  const dockSideNow = settings.dockSide ?? 'bottom'
  const appsSide = chosenApps === 'auto' || chosenApps === dockSideNow ? (dockSideNow === 'bottom' ? 'right' : 'bottom') : chosenApps

  const isPlayingAudio = Boolean(nowPlaying?.isPlaying)
  const orbTint = '255, 255, 255'

  const shownLimits = settings.showAiUsage || nothingChosen ? visibleLimits(aiLimits, settings.hiddenLimits) : []
  const companionLimits = visibleLimits(aiLimits, settings.hiddenLimits)
  const accent = settings.avatar === 'photo' ? '#ffffff' : botAvatarPalette[settings.avatar]
  const showCompanion = settings.showAvatar && (settings.avatar !== 'photo' || Boolean(photo))

  const [ringing, setRinging] = useState<Reminder | null>(null)
  const rung = useRef(new Set<string>())
  useEffect(() => {
    const due = reminders.due
    if (!due || rung.current.has(`${due.id}@${due.at}`)) return
    rung.current.add(`${due.id}@${due.at}`)
    setRinging(due)
    peek('reminder', 60_000)
  }, [reminders.due?.id, reminders.due?.at])

  const endRing = () => {
    setHoldOpen(false)
    setCloseKey((k) => k + 1)
  }

  const wasFinished = useRef(timer.finished)
  useEffect(() => {
    const showsTimer = view === 'desk' || (view === 'glance' && showCompanion && companionMode === 'focus')
    if (timer.finished && !wasFinished.current && !(notchOpen.current && showsTimer)) peek('done', 6000)
    wasFinished.current = timer.finished
  }, [timer.finished])

  const media = settings.showMusic && nowPlaying?.title ? nowPlaying : null
  const showTaskCard = settings.showTasks && !settings.showFocus
  const showTime = !showCompanion && !media && !showTaskCard && !settings.showFocus && shownLimits.length === 0
  const showStatus = settings.showStatus && (statusShown(privacy, battery) || statusPage === 'usage')

  interface EnabledCard {
    id: string
    width: number
  }

  const allActiveCards: EnabledCard[] = [
    showCompanion
      ? {
          id: 'companion',
          width:
            (hubOpen && companionMode === 'focus' && !timer.isRunning && !(timer.remainingMs > 0 && !timer.finished))
              ? COMPANION_OPEN_WIDTH
              : hubOpen && companionMode === 'reminder'
                ? COMPANION_REMINDER_WIDTH
                : hubOpen && companionMode === 'time'
                  ? COMPANION_TIME_WIDTH
                  : COMPANION_WIDTH,
        }
      : null,
    media ? { id: 'media', width: MEDIA_WIDTH } : null,
    showTime ? { id: 'time', width: TIME_WIDTH } : null,
    showTaskCard ? { id: 'task', width: TASK_WIDTH } : null,
    settings.showFocus ? { id: 'focus', width: FOCUS_WIDTH } : null,
    showStatus ? { id: 'status', width: STATUS_WIDTH } : null,
  ].filter((c): c is EnabledCard => c !== null)

  const visibleGlanceCards = allActiveCards.slice(0, MAX_CARDS)
  const visibleCardIds = new Set(visibleGlanceCards.map((c) => c.id))

  const fixed = visibleGlanceCards.map((c) => c.width)
  const aiShown = shownLimits.slice(0, Math.max(0, MAX_CARDS - fixed.length))
  const widths = [...fixed, ...aiShown.map(providerWidth)]
  const glanceWidth = PADDING * 2 + widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * TILE_GAP

  const size =
    view === 'glance'
      ? { width: Math.max(320, glanceWidth), height: GLANCE_HEIGHT }
      : view === 'files'
        ? { width: shelfWidth(shelfCount), height: CHROME_Y + SHELF_HEIGHT }
        : view === 'desk'
          ? { width: DESK_WIDTH, height: DESK_HEIGHT }
        : view === 'capture'
          ? { width: CAPTURE_WIDTH, height: CHROME_Y + CAPTURE_HEIGHT }
          : view === 'done'
            ? { width: DONE_WIDTH, height: CHROME_Y + DONE_HEIGHT }
          : view === 'reminder'
            ? { width: REMINDER_WIDTH, height: CHROME_Y + REMINDER_HEIGHT }
          : SIZES[view]

  return (
    <React.Fragment>
      <Head>
        <title>DeskNotch</title>
      </Head>
      <div className="w-full h-full flex justify-center items-start pointer-events-none">
        <div className="pointer-events-auto">
          <NotchChassis
            notchStyle={settings.notchStyle}
            bgTint={wallpaperColor}
            ambient={(isOpen) => (
              <AmbientVideo
                active={settings.ambientVideo && settings.showMusic && isOpen && isPlayingAudio && view === 'glance'}
                accent={accent}
              />
            )}
            expandedWidth={size.width}
            expandedHeight={size.height}
            dockSide={settings.dockSide ?? 'bottom'}
            keepOpen={holdOpen}
            belowSide={appsSide}
            below={
              (settings.deskApps ?? 'most') !== 'off' && (settings.appsOn ?? ['files']).includes(view) ? (
                <AppsRow
                  side={appsSide}
                  mode={settings.deskApps ?? 'most'}
                  favorites={settings.favoriteApps ?? []}
                  onFavorites={(ids) => setSettings((s) => ({ ...s, favoriteApps: ids }))}
                />
              ) : undefined
            }
            onOpenChange={openChanged}
            closeKey={closeKey}
            tucked={tucked}
            dockScale={DOCK_SCALE[settings.dockSize ?? 'default'] ?? 1}
            rail={
              view === 'capture' || view === 'done' || view === 'reminder' ? undefined : (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
                  <ViewRail views={shownViews} active={view} onChange={setView} />
                  <RailButton
                    label="Settings"
                    active={view === 'settings'}
                    layoutId="rail-settings"
                    onClick={() => setView((current) => (current === 'settings' ? 'glance' : 'settings'))}
                  >
                    <Settings2 size={12} strokeWidth={2.2} />
                  </RailButton>
                </div>
              )
            }
            expandedContent={
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="h-full"
                >
                  {view === 'glance' ? (
                    <AloneContext.Provider value={widths.length === 1}>
                      <div className={`relative flex h-full items-start ${widths.length === 1 ? 'justify-center' : ''}`} style={{ gap: TILE_GAP }}>
                        {visibleCardIds.has('companion') && (
                          <CompanionTile
                            avatar={settings.avatar}
                            photo={photo}
                            tasks={tasks}
                            reminders={reminders}
                            timer={timer}
                            screenMs={screenTime.ms}
                            track={nowPlaying?.title ?? null}
                            playing={isPlayingAudio}
                            mode={companionMode}
                            sleeps={settings.companionSleeps ?? 'time'}
                            minutes={settings.focusMinutes ?? 25}
                            onMinutes={(m) => setSettings((s) => ({ ...s, focusMinutes: m }))}
                            open={hubOpen}
                            onToggle={() => setHubOpen((o) => !o)}
                          />
                        )}
                        {visibleCardIds.has('media') && media && <MediaTile media={media} tint={albumTint} />}
                        {visibleCardIds.has('time') && <TimeTile />}
                        {visibleCardIds.has('task') && <TaskTile tasks={tasks} accent={accent} timer={timer} onOpenDesk={() => setView('desk')} />}
                        {visibleCardIds.has('focus') && (
                          <FocusTile timer={timer} tasks={settings.showTasks ? tasks : undefined} minutes={settings.focusMinutes ?? 25} />
                        )}
                        {visibleCardIds.has('status') && showStatus && <StatusTile privacy={privacy} battery={battery} accent={accent} page={statusPage} onPage={setStatusPage} />}
                        <AiOrbs providers={aiShown} tint={orbTint} />
                      </div>
                    </AloneContext.Provider>
                  ) : view === 'reminder' && ringing ? (
                    <ReminderView
                      reminder={ringing}
                      avatar={settings.avatar}
                      photo={photo}
                      accent={accent}
                      onSnooze={() => {
                        reminders.snooze(ringing.id, 5)
                        endRing()
                      }}
                      onDismiss={() => {
                        reminders.remove(ringing.id)
                        endRing()
                      }}
                    />
                  ) : view === 'tasks' ? (
                    <DeskView tasks={tasks} timer={timer} accent={accent} />
                  ) : view === 'volume' ? (
                    <div className="flex h-full items-start justify-center">
                      <VolumeTile accent={accent} />
                    </div>
                  ) : view === 'stopwatch' ? (
                    <div className="flex h-full items-start justify-center">
                      <StopwatchTile accent={accent} />
                    </div>
                  ) : view === 'clipboard' ? (
                    <div className="flex h-full items-start justify-center">
                      <ClipboardTile accent={accent} />
                    </div>
                  ) : view === 'weather' ? (
                    <div className="flex h-full items-start justify-center">
                      <WeatherTile accent={accent} />
                    </div>
                  ) : view === 'dnd' ? (
                    <div className="flex h-full items-start justify-center">
                      <DndTile accent={accent} />
                    </div>
                  ) : view === 'notifications' ? (
                    <div className="flex h-full items-start justify-center">
                      <NotificationTile accent={accent} />
                    </div>
                  ) : view === 'thermals' ? (
                    <div className="flex h-full items-start justify-center">
                      <ThermalsTile accent={accent} />
                    </div>
                  ) : view === 'done' ? (
                    <DoneView
                      timer={timer}
                      minutes={settings.focusMinutes ?? 25}
                      avatar={settings.avatar}
                      photo={photo}
                      accent={accent}
                      onDone={() => {
                        setHoldOpen(false)
                        setCloseKey((k) => k + 1)
                      }}
                    />
                  ) : view === 'capture' && capture ? (
                    <CaptureView
                      item={capture}
                      accent={accent}
                      onDone={() => {
                        setHoldOpen(false)
                        setCloseKey((k) => k + 1)
                      }}
                    />
                  ) : view === 'files' ? (
                    <FileStrip accent={accent} dragging={dragging} onCount={setShelfCount} />
                  ) : view === 'settings' ? (
                    <SettingsPanel settings={settings} onChange={setSettings} aiLimits={aiLimits} desktimeInstalled={screenTime.installed} />
                  ) : (
                    <DeskView tasks={tasks} timer={timer} accent={accent} />
                  )}
                </motion.div>
              </AnimatePresence>
            }
          >
            {(isOpen) =>
              !isOpen && (
                <CollapsedStatus
                  nowPlaying={nowPlaying}
                  tasks={tasks}
                  timer={timer}
                  avatar={showCompanion ? settings.avatar : null}
                  photo={photo}
                  right={collapsedRight}
                  screenMs={screenTime.ms}
                  limits={companionLimits}
                  privacy={privacy}
                  battery={battery}
                  moment={moment}
                  weather={weather}
                  bluetooth={bluetooth}
                />
              )
            }
          </NotchChassis>
        </div>
      </div>
    </React.Fragment>
  )
}
