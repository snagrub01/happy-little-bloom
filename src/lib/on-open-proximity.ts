/**
 * On-open proximity check.
 *
 * Runs once when the app launches. Asks for location, compares the user's
 * current position against enabled stores, and fires a local notification
 * if any store is within the user's configured radius. Honest PWA behavior:
 * we only do this *when the app is opened* — no background magic.
 */
import { Geolocation } from "@capacitor/geolocation";
import { isNative } from "./native";
import { loadStoreData, loadStoreGeofences } from "./store-persistence";
import { sendLocalNotification } from "./notifications";

const SESSION_KEY = "bagbuddy-onopen-fired";
const DEFAULT_RADIUS_METERS = 500;
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

async function getCurrentPosition(): Promise<{ lat: number; lon: number } | null> {
  try {
    if (isNative()) {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== "granted") {
        console.warn("[on-open] location permission denied");
        return null;
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    }
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
          (err) => {
            console.warn("[on-open] web geolocation denied/failed", err);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  } catch (e) {
    console.warn("[on-open] getCurrentPosition failed", e);
  }
  return null;
}

export async function runOnOpenProximityCheck(): Promise<void> {
  const { stores, enabled } = loadStoreData();
  const enabledStores = stores.filter((s) => enabled.has(s.id));
  console.log(`[on-open] checking location against ${enabledStores.length} stores`);
  if (!enabledStores.length) return;

  const pos = await getCurrentPosition();
  if (!pos) return;

  const radii = loadStoreGeofences();
  const fired = loadFiredSet();

  for (const store of enabledStores) {
    if (fired.has(store.id)) continue;
    const radiusFeet = radii.get(store.id);
    const radiusMeters = radiusFeet ? radiusFeet * FEET_TO_METERS : DEFAULT_RADIUS_METERS;
    const dist = haversineMeters(pos.lat, pos.lon, store.lat, store.lon);
    if (dist <= radiusMeters) {
      console.log(`[on-open] near ${store.name}, firing reminder`);
      await sendLocalNotification(
        "🛍️ Bag Au Pair",
        `Don't forget your bags — you're near ${store.name}`
      );
      fired.add(store.id);
    }
  }

  saveFiredSet(fired);
}
