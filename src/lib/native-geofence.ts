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

/**
 * Start a native background-geolocation watcher. Continues running when the
 * app is backgrounded or the screen is locked (Android foreground service /
 * iOS background location updates).
 */
export async function startNativeWatcher(onLocation: LocationCallback): Promise<boolean> {
  if (!isNative()) {
    console.log("[native-geofence] not native — skipping native watcher");
    return false;
  }
  try {
    await stopNativeWatcher();
    console.log("[native-geofence] registering BackgroundGeolocation watcher");
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage:
          "Bag Au Pair is watching for your stores in the background.",
        backgroundTitle: "Bag Au Pair",
        requestPermissions: true,
        stale: false,
        distanceFilter: 20, // meters between updates
      },
      (location, error) => {
        if (error) {
          console.warn("[native-geofence] watcher error", error);
          return;
        }
        if (!location) return;
        console.log(
          "[native-geofence] bg location lat=" +
            location.latitude.toFixed(5) +
            " lon=" +
            location.longitude.toFixed(5)
        );
        onLocation({ latitude: location.latitude, longitude: location.longitude });
      }
    );
    console.log("[native-geofence] watcher registered id=" + watcherId);
    return true;
  } catch (e) {
    console.error("[native-geofence] failed to register watcher", e);
    return false;
  }
}

export async function stopNativeWatcher() {
  if (!watcherId) return;
  try {
    console.log("[native-geofence] removing watcher id=" + watcherId);
    await BackgroundGeolocation.removeWatcher({ id: watcherId });
  } catch (e) {
    console.warn("[native-geofence] removeWatcher failed", e);
  }
  watcherId = null;
}
