const STORE_KEY = "bagbuddy-stores";
const ZIP_KEY = "bagbuddy-zip";
const ENABLED_KEY = "bagbuddy-enabled-stores";
const RADIUS_KEY = "bagbuddy-radius";
const GEOFENCE_KEY = "bagbuddy-store-geofences";

import type { StoreResult } from "./stores-api";

export interface StoreGeofence {
  storeId: string;
  radiusFeet: number;
}

export function saveStoreData(zip: string, radius: number, stores: StoreResult[], enabled: Set<string>) {
  try {
    localStorage.setItem(ZIP_KEY, zip);
    localStorage.setItem(RADIUS_KEY, String(radius));
    localStorage.setItem(STORE_KEY, JSON.stringify(stores));
    localStorage.setItem(ENABLED_KEY, JSON.stringify([...enabled]));
  } catch {}
}

export function loadStoreData() {
  try {
    const zip = localStorage.getItem(ZIP_KEY) || "";
    const radius = parseInt(localStorage.getItem(RADIUS_KEY) || "5", 10);
    const storesRaw = localStorage.getItem(STORE_KEY);
    const enabledRaw = localStorage.getItem(ENABLED_KEY);
    const stores: StoreResult[] = storesRaw ? JSON.parse(storesRaw) : [];
    const enabled = new Set<string>(enabledRaw ? JSON.parse(enabledRaw) : []);
    return { zip, radius, stores: Array.isArray(stores) ? stores : [], enabled };
  } catch {
    return { zip: "", radius: 5, stores: [] as StoreResult[], enabled: new Set<string>() };
  }
}

export function saveStoreGeofences(geofences: Map<string, number>) {
  try {
    const arr: StoreGeofence[] = [];
    geofences.forEach((radiusFeet, storeId) => {
      arr.push({ storeId, radiusFeet });
    });
    localStorage.setItem(GEOFENCE_KEY, JSON.stringify(arr));
  } catch {}
}

export function loadStoreGeofences(): Map<string, number> {
  try {
    const raw = localStorage.getItem(GEOFENCE_KEY);
    if (!raw) return new Map();
    const arr: StoreGeofence[] = JSON.parse(raw);
    const map = new Map<string, number>();
    arr.forEach((g) => map.set(g.storeId, g.radiusFeet));
    return map;
  } catch {
    return new Map();
  }
}
