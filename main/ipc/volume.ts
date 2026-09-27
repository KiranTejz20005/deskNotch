import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'

interface VolumeState {
  volume: number // 0-100
  muted: boolean
}

let cachedState: VolumeState = { volume: 50, muted: false }
let psProcess: ChildProcess | null = null

function initVolumeProcess() {
  if (process.platform !== 'win32') return
  if (psProcess) return

  const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;

namespace AudioEndpoint {
    [ComImport, Guid("BCDE0385-A544-454C-8D2F-40778249A40D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator {
        int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr ppDevices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }
    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice {
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }
    [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioEndpointVolume {
        int RegisterControlChangeNotify(IntPtr pNotify);
        int UnregisterControlChangeNotify(IntPtr pNotify);
        int GetChannelCount(out uint pnChannelCount);
        int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        int SetMasterVolumeLevelScalar(float fLevelScalar, ref Guid pguidEventContext);
        int GetMasterVolumeLevel(out float pfLevelDB);
        int GetMasterVolumeLevelScalar(out float pfLevelScalar);
        int SetMute(bool bMute, ref Guid pguidEventContext);
        int GetMute(out bool pbMute);
    }
    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
    internal class MMDeviceEnumeratorComObject { }

    public class Audio {
        public static float GetVolume() {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                object obj;
                dev.Activate(ref iid, 23, IntPtr.Zero, out obj);
                var endpoint = (IAudioEndpointVolume)obj;
                float vol;
                endpoint.GetMasterVolumeLevelScalar(out vol);
                return vol;
            } catch { return 0.5f; }
        }
        public static bool GetMute() {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                object obj;
                dev.Activate(ref iid, 23, IntPtr.Zero, out obj);
                var endpoint = (IAudioEndpointVolume)obj;
                bool mute;
                endpoint.GetMute(out mute);
                return mute;
            } catch { return false; }
        }
        public static void SetVolume(float vol) {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                object obj;
                dev.Activate(ref iid, 23, IntPtr.Zero, out obj);
                var endpoint = (IAudioEndpointVolume)obj;
                Guid g = Guid.Empty;
                endpoint.SetMasterVolumeLevelScalar(vol, ref g);
            } catch {}
        }
        public static void SetMute(bool mute) {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                object obj;
                dev.Activate(ref iid, 23, IntPtr.Zero, out obj);
                var endpoint = (IAudioEndpointVolume)obj;
                Guid g = Guid.Empty;
                endpoint.SetMute(mute, ref g);
            } catch {}
        }
    }
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.StartsWith("set ")) {
        $v = [float]::Parse($line.Substring(4))
        [AudioEndpoint.Audio]::SetVolume($v)
    } elseif ($line.StartsWith("mute ")) {
        $m = $line.Substring(5) -eq "1"
        [AudioEndpoint.Audio]::SetMute($m)
    }
    $vol = [int]([Math]::Round([AudioEndpoint.Audio]::GetVolume() * 100))
    $mute = [AudioEndpoint.Audio]::GetMute()
    [Console]::Out.WriteLine("STATE:$vol:$mute")
    [Console]::Out.Flush()
}
`

  try {
    psProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    psProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8')
      const lines = text.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('STATE:')) {
          const parts = trimmed.split(':')
          if (parts.length >= 3) {
            const vol = parseInt(parts[1], 10)
            const muted = parts[2] === 'True' || parts[2] === 'true'
            if (!isNaN(vol)) {
              const changed = cachedState.volume !== vol || cachedState.muted !== muted
              cachedState = { volume: Math.max(0, Math.min(100, vol)), muted }
              if (changed) {
                BrowserWindow.getAllWindows().forEach((w) => {
                  if (!w.isDestroyed()) {
                    w.webContents.send('volume:change', cachedState)
                  }
                })
              }
            }
          }
        }
      }
    })

    psProcess.on('exit', () => {
      psProcess = null
    })

    // Poll current state lightly every 2 seconds to catch system-level volume changes
    const checkTimer = setInterval(() => {
      if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
        psProcess.stdin.write('get\n')
      } else {
        clearInterval(checkTimer)
      }
    }, 2000)
  } catch (err) {
    console.error('[deskNotch] Failed to start volume IPC process:', err)
  }
}

export function registerVolumeIpc() {
  initVolumeProcess()

  ipcMain.handle('volume:get', () => {
    if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
      psProcess.stdin.write('get\n')
    }
    return cachedState
  })

  ipcMain.handle('volume:set', (_event, vol: unknown) => {
    const num = typeof vol === 'number' ? Math.max(0, Math.min(100, vol)) : 50
    cachedState.volume = num
    if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
      psProcess.stdin.write(`set ${(num / 100).toFixed(4)}\n`)
    }
    return cachedState
  })

  ipcMain.handle('volume:mute', (_event, muted?: unknown) => {
    const nextMuted = typeof muted === 'boolean' ? muted : !cachedState.muted
    cachedState.muted = nextMuted
    if (psProcess && psProcess.stdin && !psProcess.stdin.destroyed) {
      psProcess.stdin.write(`mute ${nextMuted ? 1 : 0}\n`)
    }
    return cachedState
  })
}
