/** Every IPC handler the app registers, in one call. */
import { registerStoreIpc } from './store'
import { registerPhotoIpc } from './photo'
import { registerSystemIpc } from './system'
import { registerSettingsIpc } from './settings'
import { registerLimitsIpc } from './limits'
import { registerMediaIpc } from './media'
import { registerFilesIpc } from './files'
import { registerPrivacyIpc } from './privacy'
import { registerAppsIpc } from './apps'
import { registerUsageIpc } from './usage'
import { registerDisplayIpc } from './display'
import { registerBluetoothIpc } from './bluetooth'
import { registerBatteryIpc } from './battery'
import { registerVolumeIpc } from './volume'
import { registerClipboardIpc } from './clipboard'
import { setupDndIpc } from './dnd'
import { setupNotificationsIpc } from './notifications'
import { setupThermalsIpc } from './thermals'
import { registerShortcutIpc } from './shortcut'
import { registerDesktimeIpc } from './desktime'

export function registerIpc() {
  registerStoreIpc()
  registerPhotoIpc()
  registerSystemIpc()
  registerSettingsIpc()
  registerLimitsIpc()
  registerMediaIpc()
  registerFilesIpc()
  registerPrivacyIpc()
  registerAppsIpc()
  registerUsageIpc()
  registerDisplayIpc()
  registerBluetoothIpc()
  registerBatteryIpc()
  registerVolumeIpc()
  registerClipboardIpc()
  setupDndIpc()
  setupNotificationsIpc()
  setupThermalsIpc()
  registerShortcutIpc()
  registerDesktimeIpc()
}
