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
import { initNotificationService } from "./notification-service";
import { isNative } from "./native";

let started = false;

export async function initAppServices() {
  if (started) {
    console.log("[startup] initAppServices already called — skipping");
    return;
  }
  started = true;

  console.log("[startup] initAppServices begin (native=" + isNative() + ")");

  // Single entry point: creates Android channel, requests permission
  // (non-blocking), runs reconciliation engine, attaches lifecycle
  // listeners for resume-time re-reconciliation.
  initNotificationService()
    .then(() => console.log("[startup] notification service ready"))
    .catch((e) => console.warn("[startup] notif service init error", e));


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

  // On native, listen for resume ONLY to log + reconcile (notifications
  // service does its own resume hooks). DO NOT restart the native watcher
  // here — re-registering the BackgroundGeolocation watcher tears down the
  // Android foreground service and reverts to background-throttled mode,
  // which is exactly the bug that caused notifications to only fire after
  // the user tapped the UI.
  if (isNative()) {
    try {
      const { App } = await import("@capacitor/app");
      App.addListener("appStateChange", (state) => {
        console.log("[startup] appStateChange isActive=" + state.isActive);
        // Intentionally NO startGeofenceWatching() call here. The native
        // foreground service is persistent and survives backgrounding.
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
