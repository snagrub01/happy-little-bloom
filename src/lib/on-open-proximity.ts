/**
 * On-open proximity check (PWA, Web Notifications only).
 *
 * Runs once when the app launches:
 *   1. Request Notification permission
 *   2. Get current GPS via navigator.geolocation.getCurrentPosition
 *   3. Load enabled stores from localStorage
 *   4. Haversine distance to each store
 *   5. If within 1800 ft (~550 m), fire a Web Notification
 *   6. sessionStorage flag "bagaupair-fired" prevents duplicate alerts
 */
import { loadStoreData, loadStoreGeofences } from "./store-persistence";
import { requestNotificationPermission, sendLocalNotification } from "./notifications";

const SESSION_KEY = "bagaupair-fired";
const DEFAULT_RADIUS_FEET = 1800;
const FEET_TO_METERS = 0.3048;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadFiredSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveFiredSet(s: Set<string>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s]));
  } catch {}
}

function getCurrentPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("[on-open] geolocation not available");
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        console.log(`[on-open] location: ${p.coords.latitude}, ${p.coords.longitude}`);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      (err) => {
        console.warn("[on-open] geolocation denied/failed", err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export async function runOnOpenProximityCheck(): Promise<void> {
  const granted = await requestNotificationPermission();
  console.log(`[on-open] notification permission granted=${granted}`);
  if (!granted) return;

  const { stores, enabled } = loadStoreData();
  const enabledStores = stores.filter((s) => enabled.has(s.id));
  console.log(`[on-open] checking ${enabledStores.length} enabled stores`);
  if (!enabledStores.length) return;

  const pos = await getCurrentPosition();
  if (!pos) return;

  const radii = loadStoreGeofences();
  const fired = loadFiredSet();

  for (const store of enabledStores) {
    const radiusFeet = radii.get(store.id) ?? DEFAULT_RADIUS_FEET;
    const radiusMeters = radiusFeet * FEET_TO_METERS;
    const dist = haversineMeters(pos.lat, pos.lon, store.lat, store.lon);
    console.log(`[on-open] ${store.name}: ${Math.round(dist)}m (radius ${Math.round(radiusMeters)}m)`);
    if (fired.has(store.id)) continue;
    if (dist <= radiusMeters) {
      console.log(`[on-open] firing notification for ${store.name}`);
      await sendLocalNotification(
        "Bag Au Pair",
        `Don't forget your bags — you're near ${store.name}`
      );
      fired.add(store.id);
    }
  }

  saveFiredSet(fired);
}
