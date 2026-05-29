/**
 * Global app startup initialization.
 *
 * Imported from `src/main.tsx` so it runs at the earliest possible moment —
 * BEFORE React mounts, BEFORE any page or component renders, and without
 * depending on user interaction, route changes, visibilitychange, or focus
 * events. This is critical for native background geolocation: the watcher
 * must be registered as soon as the app process starts so that the Android
 * foreground service is bound and survives the app being backgrounded /
 * the screen being locked / the app being closed.
 */
import { loadStoreData } from "./store-persistence";
import { startGeofenceWatching } from "./geofence";
import { requestNotificationPermission, ensureNotificationChannel, reschedulePendingNotifications } from "./notifications";
import { isNative } from "./native";



let started = false;

export async function initAppServices() {
  if (started) {
    console.log("[startup] initAppServices already called — skipping");
    return;
  }
  started = true;

  console.log("[startup] initAppServices begin (native=" + isNative() + ")");

  // Create the Android notification channel BEFORE requesting permission so
  // that even if permission is granted later (via the Reminders button) the
  // channel already exists and notifications can surface immediately.
  ensureNotificationChannel()
    .then(() => console.log("[startup] notification channel ready"))
    .catch((e) => console.warn("[startup] channel setup error", e));

  // Best-effort permission request — must NOT block geofence startup.
  requestNotificationPermission()
    .then((granted) => console.log("[startup] notification permission granted=" + granted))
    .catch((e) => console.warn("[startup] notification permission error", e));

  // foreground service which keeps GPS alive when the app is closed.
  try {
    const { stores, enabled } = loadStoreData();
    const enabledStores = stores.filter((s) => enabled.has(s.id));
    console.log(
      "[startup] starting geofence watcher with " +
        enabledStores.length +
        " enabled stores"
    );
    await startGeofenceWatching(enabledStores);
    console.log("[startup] geofence watcher started");
  } catch (e) {
    console.error("[startup] failed to start geofence watcher", e);
  }

  // On native, also listen for app resume so that if the OS ever did kill
  // the watcher we re-bind it. This is belt-and-suspenders — the native
  // foreground service should keep it alive on its own.
  if (isNative()) {
    try {
      const { App } = await import("@capacitor/app");
      App.addListener("appStateChange", (state) => {
        console.log("[startup] appStateChange isActive=" + state.isActive);
        if (state.isActive) {
          const { stores, enabled } = loadStoreData();
          const enabledStores = stores.filter((s) => enabled.has(s.id));
          startGeofenceWatching(enabledStores).catch((err) =>
            console.error("[startup] resume restart failed", err)
          );
        }
      });
      App.addListener("resume", () => {
        console.log("[startup] App resume event");
      });
      console.log("[startup] Capacitor App lifecycle listeners attached");
    } catch (e) {
      console.warn("[startup] could not attach App listeners", e);
    }
  }
}
