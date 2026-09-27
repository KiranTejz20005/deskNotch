import type { Settings } from '../components/widgets/SettingsPanel'

/** The glance holds this many cards at most — past it the notch spans the screen. */
export const MAX_CARDS = 4

/**
 * How many cards a setting would put in the glance, counting the widest case
 * (music playing). The time card only appears when the companion is not
 * there to tell the time; focus takes the task into its own card.
 */
export const cardCount = (settings: Settings, aiCards: number) =>
  (settings.showAvatar ? 1 : 0) +
  (settings.showMusic || !settings.showAvatar ? 1 : 0) +
  (settings.showTasks && !settings.showFocus ? 1 : 0) +
  (settings.showVolume ? 1 : 0) +
  (settings.showStopwatch ? 1 : 0) +
  (settings.showClipboard ? 1 : 0) +
  (settings.showWeather ? 1 : 0) +
  (settings.showDnd ? 1 : 0) +
  (settings.showNotifications ? 1 : 0) +
  (settings.showThermals ? 1 : 0) +
  (settings.showFocus ? 1 : 0) +
  (settings.showAiUsage ? aiCards : 0)
