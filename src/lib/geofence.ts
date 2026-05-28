import type { StoreResult } from "./stores-api";
import { sendLocalNotification, requestNotificationPermission } from "./notifications";
import { loadReminderSettings } from "./reminder-persistence";
import { loadHomeLocation } from "./home-location";
import { loadWorkLocation } from "./work-location";
import { loadStoreGeofences } from "./store-persistence";
import { gentleVibrate } from "./vibration";
import { isNative } from "./native";
import { startNativeWatcher, stopNativeWatcher } from "./native-geofence";

const STATE_KEY = "bagbuddy-geofence-state";

interface PersistedState {
  wasAtHome: boolean;
  wasAtWork: boolean;
  leavingHomeNotified: boolean;
  leavingWorkNotified: boolean;
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {}
  return defaultState();
}
function defaultState(): PersistedState {
  return { wasAtHome: false, wasAtWork: false, leavingHomeNotified: false, leavingWorkNotified: false };
}
function saveState(s: PersistedState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
}

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

const DEFAULT_LEAVING_RADIUS_FEET = 500;
function getLeavingThresholdMiles(radiusFeet?: number): number {
  return (radiusFeet || DEFAULT_LEAVING_RADIUS_FEET) / 5280;
}

function handleLocation(latitude: number, longitude: number, enabledStores: StoreResult[]) {
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
      const homeThreshold = getLeavingThresholdMiles(home.radiusFeet);
      const distHome = distanceMiles(latitude, longitude, home.lat, home.lon);

      if (distHome <= homeThreshold && !homeNotified) {
        homeNotified = true;
        const delayMin = parseInt(settings.bagOut.timing, 10) || 5;
        const delayMs = delayMin * 60 * 1000;

        bagOutTimer = setTimeout(() => {
          sendLocalNotification("🚗 Put your bags back!", `You've been home for ${delayMin} minutes — time to put your reusable bags back in the car!`);
          bagOutTimer = null;
        }, delayMs);
      }

      if (distHome > homeThreshold * 3 && homeNotified) {
        homeNotified = false;
        if (bagOutTimer) { clearTimeout(bagOutTimer); bagOutTimer = null; }
      }
    }
  }

  // --- Leaving Home reminder ---
  if (settings.leavingHome.enabled) {
    const home = loadHomeLocation();
    if (home) {
      const homeThreshold2 = getLeavingThresholdMiles(home.radiusFeet);
      const distHome = distanceMiles(latitude, longitude, home.lat, home.lon);
      if (distHome <= homeThreshold2) {
        if (!state.wasAtHome || state.leavingHomeNotified) {
          state.wasAtHome = true;
          state.leavingHomeNotified = false;
          dirty = true;
        }
      }
      if (distHome > homeThreshold2 * 3 && state.wasAtHome && !state.leavingHomeNotified) {
        state.leavingHomeNotified = true;
        state.wasAtHome = false;
        dirty = true;
        sendLocalNotification(
          "🛍️ Open Bag Au Pair?",
          "You're leaving home — open Bag Au Pair so your store reminders are ready!",
          { urgent: true }
        );
      }
    }
  }

  // --- Leaving Work reminder ---
  if (settings.leavingWork.enabled) {
    const work = loadWorkLocation();
    if (work) {
      const workThreshold = getLeavingThresholdMiles(work.radiusFeet);
      const distWork = distanceMiles(latitude, longitude, work.lat, work.lon);
      if (distWork <= workThreshold) {
        if (!state.wasAtWork || state.leavingWorkNotified) {
          state.wasAtWork = true;
          state.leavingWorkNotified = false;
          dirty = true;
        }
      }
      if (distWork > workThreshold * 3 && state.wasAtWork && !state.leavingWorkNotified) {
        state.leavingWorkNotified = true;
        state.wasAtWork = false;
        dirty = true;
        sendLocalNotification(
          "🛍️ Open Bag Au Pair?",
          "Leaving work — stopping at the store? Open Bag Au Pair so your reminders are ready!",
          { urgent: true }
        );
      }
    }
  }

  if (dirty) saveState(state);
}

export async function startGeofenceWatching(enabledStores: StoreResult[]) {
  const settings = loadReminderSettings();
  const hasStores = enabledStores.length > 0 && settings.bagIn.enabled;
  const hasLeavingHome = settings.leavingHome.enabled && !!loadHomeLocation();
  const hasLeavingWork = settings.leavingWork.enabled && !!loadWorkLocation();
  const hasBagOut = settings.bagOut.enabled && !!loadHomeLocation();
  if (!hasStores && !hasLeavingHome && !hasLeavingWork && !hasBagOut) {
    console.log("[geofence] no triggers enabled — stopping watcher");
    await stopGeofenceWatching();
    return;
  }

  console.log(
    "[geofence] startGeofenceWatching stores=" +
      enabledStores.length +
      " leavingHome=" +
      hasLeavingHome +
      " leavingWork=" +
      hasLeavingWork +
      " bagOut=" +
      hasBagOut
  );

  await stopGeofenceWatching();
  requestNotificationPermission();

  // Prefer native background geolocation when running inside Capacitor.
  if (isNative()) {
    const ok = await startNativeWatcher(({ latitude, longitude }) => {
      handleLocation(latitude, longitude, enabledStores);
    });
    if (ok) {
      console.log("[geofence] using NATIVE background watcher");
      return;
    }
    console.warn("[geofence] native watcher failed, falling back to web");
  }

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
  await stopNativeWatcher();
  notifiedStoreIds.clear();
  secondaryTimers.forEach((t) => clearTimeout(t));
  secondaryTimers.clear();
  homeNotified = false;
  if (bagOutTimer) {
    clearTimeout(bagOutTimer);
    bagOutTimer = null;
  }
}
