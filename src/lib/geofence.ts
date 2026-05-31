import type { StoreResult } from "./stores-api";
import { sendLocalNotification, requestNotificationPermission } from "./notifications";
import { loadReminderSettings } from "./reminder-persistence";
import { loadHomeLocation } from "./home-location";
import { loadStoreGeofences } from "./store-persistence";
import { gentleVibrate } from "./vibration";
// PWA-only foreground geofence watcher using navigator.geolocation.

let webWatchId: number | null = null;
let notifiedStoreIds = new Set<string>();
let secondaryTimers = new Map<string, ReturnType<typeof setTimeout>>();
let homeNotified = false;
let bagOutTimer: ReturnType<typeof setTimeout> | null = null;

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getThresholdMiles(timing: string): number {
  switch (timing) {
    case "0.25mi": return 0.25;
    case "500ft": return 500 / 5280;
    case "arriving":
    default: return 0.05;
  }
}

function getStoreThresholdMiles(storeId: string, geofences: Map<string, number>, fallbackTiming: string): number {
  const customFeet = geofences.get(storeId);
  if (customFeet !== undefined) return customFeet / 5280;
  return getThresholdMiles(fallbackTiming);
}

const DEFAULT_HOME_RADIUS_FEET = 1800;
function getHomeThresholdMiles(radiusFeet?: number): number {
  return (radiusFeet || DEFAULT_HOME_RADIUS_FEET) / 5280;
}

function handleLocation(latitude: number, longitude: number, enabledStores: StoreResult[]) {
  const settings = loadReminderSettings();
  const geofences = loadStoreGeofences();

  // --- Store proximity alerts ---
  if (settings.bagIn.enabled) {
    for (const store of enabledStores) {
      const threshold = getStoreThresholdMiles(store.id, geofences, settings.bagIn.timing);
      const dist = distanceMiles(latitude, longitude, store.lat, store.lon);

      if (dist <= threshold && !notifiedStoreIds.has(store.id)) {
        notifiedStoreIds.add(store.id);
        console.log("[geofence] TRIGGER store=" + store.name + " dist=" + dist.toFixed(3) + "mi threshold=" + threshold.toFixed(3) + "mi");
        sendLocalNotification("🛍️ Don't forget your bags!", `You're near ${store.name} — grab your reusable bags!`)
          .catch((err) => console.error("[geofence] store notify failed", err));

        if (settings.couponReminder.enabled) {
          gentleVibrate();
          sendLocalNotification("🏷️ Check for coupons!", `You're entering ${store.name} — open their app to check this week's deals!`)
            .catch((err) => console.error("[geofence] coupon notify failed", err));
        }

        if (settings.secondaryReminder.enabled) {
          const delay = settings.secondaryReminder.delayMinutes * 60 * 1000;
          const timer = setTimeout(() => {
            sendLocalNotification("🛍️ Bag Reminder (follow-up)", `Just checking — did you grab your bags for ${store.name}?`)
              .catch((err) => console.error("[geofence] secondary notify failed", err));
            secondaryTimers.delete(store.id);
          }, delay);
          secondaryTimers.set(store.id, timer);
        }
      }

      if (dist > threshold * 3 && notifiedStoreIds.has(store.id)) {
        notifiedStoreIds.delete(store.id);
      }
    }
  }

  // --- Home arrival → bag-return reminder ---
  if (settings.bagOut.enabled) {
    const home = loadHomeLocation();
    if (home) {
      const homeThreshold = getHomeThresholdMiles(home.radiusFeet);
      const distHome = distanceMiles(latitude, longitude, home.lat, home.lon);

      if (distHome <= homeThreshold && !homeNotified) {
        homeNotified = true;
        const delayMin = parseInt(settings.bagOut.timing, 10) || 5;
        const delayMs = delayMin * 60 * 1000;

        console.log("[geofence] TRIGGER home-arrival delayMin=" + delayMin);
        bagOutTimer = setTimeout(() => {
          sendLocalNotification("🚗 Put your bags back!", `You've been home for ${delayMin} minutes — time to put your reusable bags back in the car!`)
            .catch((err) => console.error("[geofence] bagOut notify failed", err));
          bagOutTimer = null;
        }, delayMs);
      }

      if (distHome > homeThreshold * 3 && homeNotified) {
        homeNotified = false;
        if (bagOutTimer) { clearTimeout(bagOutTimer); bagOutTimer = null; }
      }
    }
  }
}

export async function startGeofenceWatching(enabledStores: StoreResult[]) {
  const settings = loadReminderSettings();
  const hasStores = enabledStores.length > 0 && settings.bagIn.enabled;
  const hasBagOut = settings.bagOut.enabled && !!loadHomeLocation();
  if (!hasStores && !hasBagOut) {
    console.log("[geofence] no triggers enabled — stopping watcher");
    await stopGeofenceWatching();
    return;
  }

  console.log(
    "[geofence] startGeofenceWatching stores=" + enabledStores.length + " bagOut=" + hasBagOut
  );

  requestNotificationPermission();

  await stopGeofenceWatching();


  if (!("geolocation" in navigator)) {
    console.warn("[geofence] no geolocation API available");
    return;
  }
  console.log("[geofence] starting WEB watchPosition (foreground only)");
  webWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      handleLocation(latitude, longitude, enabledStores);
    },
    (err) => console.warn("[geofence] web watchPosition error", err),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

export async function stopGeofenceWatching() {
  if (webWatchId !== null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
  notifiedStoreIds.clear();
  secondaryTimers.forEach((t) => clearTimeout(t));
  secondaryTimers.clear();
  homeNotified = false;
  if (bagOutTimer) {
    clearTimeout(bagOutTimer);
    bagOutTimer = null;
  }
}
