import { isNative } from "./native";
import { registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  "BackgroundGeolocation"
);

export interface NativeLocation {
  latitude: number;
  longitude: number;
}

type LocationCallback = (loc: NativeLocation) => void;

let watcherId: string | null = null;
let locationCount = 0;
let lastTickAt = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastCallback: LocationCallback | null = null;

/**
 * Start a native background-geolocation watcher. Continues running when the
 * app is backgrounded or the screen is locked via the Android foreground
 * service (triggered by passing `backgroundTitle` / `backgroundMessage`).
 *
 * IMPORTANT: This function is idempotent and MUST NOT be called repeatedly
 * on every resume — re-registering the watcher tears down the foreground
 * service and reverts the WebView to standard background-throttled state.
 */
export async function startNativeWatcher(onLocation: LocationCallback): Promise<boolean> {
  if (!isNative()) {
    console.log("[native-geofence] not native — skipping native watcher");
    return false;
  }

  // Allow callback to be swapped without restarting the watcher
  lastCallback = onLocation;

  if (watcherId) {
    console.log("[native-service] watcher already running id=" + watcherId + " — reusing");
    return true;
  }

  try {
    console.log("[native-service] registering BackgroundGeolocation watcher (foreground service)");
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        // Setting backgroundMessage triggers the Android foreground service
        // + persistent notification + wake-lock that keeps the WebView
        // process alive while the screen is locked.
        backgroundMessage:
          "Bag Au Pair is watching for your stores in the background.",
        backgroundTitle: "Bag Au Pair — Active",
        requestPermissions: true,
        stale: false,
        distanceFilter: 10, // meters — tighter for more frequent heartbeats
      },
      (location, error) => {
        if (error) {
          console.warn("[js-callback] watcher error", error);
          return;
        }
        if (!location) return;
        locationCount++;
        lastTickAt = Date.now();
        console.log(
          "[js-callback] bg location #" + locationCount +
            " lat=" + location.latitude.toFixed(5) +
            " lon=" + location.longitude.toFixed(5) +
            " t=" + new Date(lastTickAt).toISOString()
        );
        try {
          lastCallback?.({ latitude: location.latitude, longitude: location.longitude });
        } catch (e) {
          console.error("[js-callback] handler threw", e);
        }
      }
    );
    console.log("[native-service] watcher registered id=" + watcherId);

    // Heartbeat proves the JS bridge is responsive — if you see locations
    // in logcat but NO heartbeats here, the WebView is suspended.
    if (!heartbeatTimer) {
      heartbeatTimer = setInterval(() => {
        const since = lastTickAt ? Math.round((Date.now() - lastTickAt) / 1000) : -1;
        console.log(
          "[native-service] heartbeat alive=true count=" + locationCount +
            " lastLocSec=" + since
        );
      }, 30_000);
    }

    return true;
  } catch (e) {
    console.error("[native-service] failed to register watcher", e);
    return false;
  }
}

export async function stopNativeWatcher() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (!watcherId) return;
  try {
    console.log("[native-service] removing watcher id=" + watcherId);
    await BackgroundGeolocation.removeWatcher({ id: watcherId });
  } catch (e) {
    console.warn("[native-service] removeWatcher failed", e);
  }
  watcherId = null;
  lastCallback = null;
}

/** Update the callback without restarting the native watcher / foreground service. */
export function updateNativeWatcherCallback(cb: LocationCallback) {
  lastCallback = cb;
}

export function isNativeWatcherRunning(): boolean {
  return watcherId !== null;
}
