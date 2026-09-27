import type { Settings } from '../components/widgets/SettingsPanel'

/** The glance holds this many cards at most — past it the notch spans the screen. */
export const MAX_CARDS = 4

/**
 * How many cards settings put in the glance.
 * Max 4 cards allowed at a time.
 */
export const cardCount = (settings: Settings, aiCards: number) =>
  (settings.showAvatar ? 1 : 0) +
  (settings.showMusic ? 1 : 0) +
  (settings.showTasks && !settings.showFocus ? 1 : 0) +
  (settings.showVolume ? 1 : 0) +
  (settings.showStopwatch ? 1 : 0) +
  (settings.showClipboard ? 1 : 0) +
  (settings.showWeather ? 1 : 0) +
  (settings.showDnd ? 1 : 0) +
  (settings.showNotifications ? 1 : 0) +
  (settings.showThermals ? 1 : 0) +
  (settings.showFocus ? 1 : 0) +
  (settings.showStatus ? 1 : 0) +
  (settings.showAiUsage ? aiCards : 0)
