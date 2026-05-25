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

/**
 * Start a native background-geolocation watcher. Continues running when the
 * app is backgrounded or the screen is locked (Android foreground service /
 * iOS background location updates).
 */
export async function startNativeWatcher(onLocation: LocationCallback): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await stopNativeWatcher();
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "Bag Au Pair is watching for your stores in the background.",
        backgroundTitle: "Bag Au Pair",
        requestPermissions: true,
        stale: false,
        distanceFilter: 20, // meters between updates
      },
      (location, error) => {
        if (error) return;
        if (!location) return;
        onLocation({ latitude: location.latitude, longitude: location.longitude });
      }
    );
    return true;
  } catch {
    return false;
  }
}

export async function stopNativeWatcher() {
  if (!watcherId) return;
  try {
    await BackgroundGeolocation.removeWatcher({ id: watcherId });
  } catch {}
  watcherId = null;
}
