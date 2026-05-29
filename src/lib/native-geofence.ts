// JS registers fences only. Native Android handles all transition events and notifications.

import { isNative } from "./native";
import { registerPlugin } from "@capacitor/core";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import { toast } from "sonner";

export interface NativeGeofenceStore {
  id: string;
  lat: number;
  lng: number;
  name: string;
  radius: number; // meters
}

interface PermissionStatus {
  fine: boolean;       // ACCESS_FINE_LOCATION
  background: boolean; // ACCESS_BACKGROUND_LOCATION
}

interface NativeGeofencePlugin {
  registerGeofences(options: { fences: NativeGeofenceStore[] }): Promise<void>;
  checkPermissions(): Promise<PermissionStatus>;
}

const NativeGeofence = registerPlugin<NativeGeofencePlugin>("NativeGeofence");

function openAppSettings() {
  NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails }).catch((e) =>
    console.error("[native-geofence] failed to open app settings", e)
  );
}

function showPermissionAlert(missing: PermissionStatus) {
  const needs: string[] = [];
  if (!missing.fine) needs.push("precise location");
  if (!missing.background) needs.push("background location (Allow all the time)");

  toast.error("Location permission required", {
    description:
      `Bag Au Pair needs ${needs.join(" and ")} to send store reminders. ` +
      `Open app settings and choose "Allow all the time" under Permissions → Location.`,
    duration: 15000,
    action: {
      label: "Open Settings",
      onClick: openAppSettings,
    },
  });
}

/**
 * Send the full set of store geofences to the native Android layer.
 * Native code owns transition detection, background execution, and
 * notification display. This function returns immediately after the
 * plugin call resolves — it does NOT subscribe to any callbacks or
 * lifecycle events.
 *
 * Before registering, verifies BOTH ACCESS_FINE_LOCATION and
 * ACCESS_BACKGROUND_LOCATION are granted. If either is missing,
 * registration is aborted and the user is shown an alert with a
 * button to open app settings.
 */
export async function registerNativeGeofences(stores: NativeGeofenceStore[]): Promise<void> {
  if (!isNative()) {
    console.log("[native-geofence] not native — skipping registration");
    return;
  }

  let perms: PermissionStatus;
  try {
    perms = await NativeGeofence.checkPermissions();
  } catch (e) {
    console.error("[native-geofence] permission check failed", e);
    perms = { fine: false, background: false };
  }

  if (!perms.fine || !perms.background) {
    console.warn(
      "[geofence] missing permissions, aborting registration " +
        `(fine=${perms.fine}, background=${perms.background})`
    );
    showPermissionAlert(perms);
    return;
  }

  console.log(`[geofence] permissions OK, registering ${stores.length} fences`);

  try {
    await NativeGeofence.registerGeofences({ fences: stores });
    console.log("[native-geofence] registration complete");
  } catch (e) {
    console.error("[native-geofence] registration failed", e);
  }
}
