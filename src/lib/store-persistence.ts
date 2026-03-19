const STORE_KEY = "bagbuddy-stores";
const ZIP_KEY = "bagbuddy-zip";
const ENABLED_KEY = "bagbuddy-enabled-stores";
const RADIUS_KEY = "bagbuddy-radius";

import type { StoreResult } from "./stores-api";

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
