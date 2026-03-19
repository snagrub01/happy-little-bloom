import type { StoreResult } from "./stores-api";
import { sendLocalNotification, requestNotificationPermission } from "./notifications";
import { loadReminderSettings } from "./reminder-persistence";
import { gentleVibrate } from "./vibration";

let watchId: number | null = null;
let notifiedStoreIds = new Set<string>();
let secondaryTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

export function startGeofenceWatching(enabledStores: StoreResult[]) {
  if (!("geolocation" in navigator)) return;
  stopGeofenceWatching();

  if (enabledStores.length === 0) return;

  requestNotificationPermission();

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const settings = loadReminderSettings();

      if (!settings.bagIn.enabled) return;

      const threshold = getThresholdMiles(settings.bagIn.timing);

      for (const store of enabledStores) {
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
}
