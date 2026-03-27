import type { StoreResult } from "./stores-api";
import { sendLocalNotification, requestNotificationPermission, scheduleBagReminder } from "./notifications";
import { loadReminderSettings } from "./reminder-persistence";
import { loadHomeLocation } from "./home-location";
import { loadWorkLocation } from "./work-location";
import { loadStoreGeofences } from "./store-persistence";
import { gentleVibrate } from "./vibration";

let watchId: number | null = null;
let notifiedStoreIds = new Set<string>();
let secondaryTimers = new Map<string, ReturnType<typeof setTimeout>>();
let homeNotified = false;
let bagOutTimer: ReturnType<typeof setTimeout> | null = null;
let wasAtHome = false;
let wasAtWork = false;
let leavingHomeNotified = false;
let leavingWorkNotified = false;

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
    default: return 0.05; // ~250ft
  }
}

function getStoreThresholdMiles(storeId: string, geofences: Map<string, number>, fallbackTiming: string): number {
  const customFeet = geofences.get(storeId);
  if (customFeet !== undefined) {
    return customFeet / 5280;
  }
  return getThresholdMiles(fallbackTiming);
}

const DEFAULT_LEAVING_RADIUS_FEET = 500;

function getLeavingThresholdMiles(radiusFeet?: number): number {
  return (radiusFeet || DEFAULT_LEAVING_RADIUS_FEET) / 5280;
}

export function startGeofenceWatching(enabledStores: StoreResult[]) {
  if (!("geolocation" in navigator)) return;
  stopGeofenceWatching();

  if (enabledStores.length === 0) return;

  requestNotificationPermission();

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const settings = loadReminderSettings();
      const geofences = loadStoreGeofences();

      // --- Store proximity alerts ---
      if (settings.bagIn.enabled) {
        for (const store of enabledStores) {
          const threshold = getStoreThresholdMiles(store.id, geofences, settings.bagIn.timing);
          const dist = distanceMiles(latitude, longitude, store.lat, store.lon);

          if (dist <= threshold && !notifiedStoreIds.has(store.id)) {
            notifiedStoreIds.add(store.id);
            sendLocalNotification(
              "🛍️ Don't forget your bags!",
              `You're near ${store.name} — grab your reusable bags!`
            );

            // Coupon app reminder — vibrate only
            if (settings.couponReminder.enabled) {
              gentleVibrate();
              sendLocalNotification(
                "🏷️ Check for coupons!",
                `You're entering ${store.name} — open their app to check this week's deals!`
              );
            }

            // Secondary follow-up reminder
            if (settings.secondaryReminder.enabled) {
              const delay = settings.secondaryReminder.delayMinutes * 60 * 1000;
              const timer = setTimeout(() => {
                sendLocalNotification(
                  "🛍️ Bag Reminder (follow-up)",
                  `Just checking — did you grab your bags for ${store.name}?`
                );
                secondaryTimers.delete(store.id);
              }, delay);
              secondaryTimers.set(store.id, timer);
            }
          }

          // Reset notification if user moves away
          if (dist > threshold * 3 && notifiedStoreIds.has(store.id)) {
            notifiedStoreIds.delete(store.id);
          }
        }
      }

      // --- Home arrival → bag-return reminder ---
      if (settings.bagOut.enabled) {
        const home = loadHomeLocation();
        if (home) {
          const distHome = distanceMiles(latitude, longitude, home.lat, home.lon);

          if (distHome <= HOME_THRESHOLD_MILES && !homeNotified) {
            homeNotified = true;
            const delayMin = parseInt(settings.bagOut.timing, 10) || 5;
            const delayMs = delayMin * 60 * 1000;

            bagOutTimer = setTimeout(() => {
              sendLocalNotification(
                "🚗 Put your bags back!",
                `You've been home for ${delayMin} minutes — time to put your reusable bags back in the car!`
              );
              bagOutTimer = null;
            }, delayMs);
          }

          // Reset when user leaves home area
          if (distHome > HOME_THRESHOLD_MILES * 3 && homeNotified) {
            homeNotified = false;
            if (bagOutTimer) {
              clearTimeout(bagOutTimer);
              bagOutTimer = null;
            }
          }
        }
      }

      // --- Leaving Home reminder ---
      if (settings.leavingHome.enabled) {
        const home = loadHomeLocation();
        if (home) {
          const distHome = distanceMiles(latitude, longitude, home.lat, home.lon);
          if (distHome <= HOME_THRESHOLD_MILES) {
            wasAtHome = true;
            leavingHomeNotified = false;
          }
          if (distHome > HOME_THRESHOLD_MILES * 3 && wasAtHome && !leavingHomeNotified) {
            leavingHomeNotified = true;
            wasAtHome = false;
            sendLocalNotification(
              "🛍️ Heading out?",
              "Don't forget to open Bag Au Pair before you shop!"
            );
          }
        }
      }

      // --- Leaving Work reminder ---
      if (settings.leavingWork.enabled) {
        const work = loadWorkLocation();
        if (work) {
          const distWork = distanceMiles(latitude, longitude, work.lat, work.lon);
          if (distWork <= HOME_THRESHOLD_MILES) {
            wasAtWork = true;
            leavingWorkNotified = false;
          }
          if (distWork > HOME_THRESHOLD_MILES * 3 && wasAtWork && !leavingWorkNotified) {
            leavingWorkNotified = true;
            wasAtWork = false;
            sendLocalNotification(
              "🛍️ Leaving work?",
              "Stopping at the store on the way home? Open Bag Au Pair so your reminders are ready!"
            );
          }
        }
      }
    },
    undefined,
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

export function stopGeofenceWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  notifiedStoreIds.clear();
  secondaryTimers.forEach((t) => clearTimeout(t));
  secondaryTimers.clear();
  homeNotified = false;
  wasAtHome = false;
  wasAtWork = false;
  leavingHomeNotified = false;
  leavingWorkNotified = false;
  if (bagOutTimer) {
    clearTimeout(bagOutTimer);
    bagOutTimer = null;
  }
}
