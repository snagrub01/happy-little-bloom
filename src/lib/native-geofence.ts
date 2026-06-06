// JS registers fences only. Native Android handles all transition events and notifications.

import { isNative } from "./native";
import { registerPlugin } from "@capacitor/core";

export interface NativeGeofenceStore {
  id: string;
  lat: number;
  lng: number;
  name: string;
  radius: number; // meters
}

interface NativeGeofencePlugin {
  registerGeofences(options: { fences: NativeGeofenceStore[] }): Promise<void>;
}

const NativeGeofence = registerPlugin<NativeGeofencePlugin>("NativeGeofence");

/**
 * Send the full set of store geofences to the native Android layer.
 * Native code owns transition detection, background execution, and
 * notification display. This function returns immediately after the
 * plugin call resolves — it does NOT subscribe to any callbacks or
 * lifecycle events.
 */
export async function registerNativeGeofences(stores: NativeGeofenceStore[]): Promise<void> {
  if (!isNative()) {
    console.log("[native-geofence] not native — skipping registration");
    return;
  }
  try {
    console.log("[native-geofence] registering " + stores.length + " fences with native layer");
    await NativeGeofence.registerGeofences({ fences: stores });
    console.log("[native-geofence] registration complete");
  } catch (e) {
    console.error("[native-geofence] registration failed", e);
  }
}
