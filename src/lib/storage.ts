// Tiny localStorage helpers with SSR safety.
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

import { useEffect, useState } from "react";

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJSON<T>(key, initial));
  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

// Storage keys
export const K = {
  home: "bap.home",            // { lat, lng, label }
  radiusFt: "bap.radiusFt",    // number — store search radius in feet
  stores: "bap.stores",        // saved stores with per-store reminder distance
  list: "bap.list",            // shopping list items
  reminders: "bap.reminders",  // { enabled, secondaryDelayMin, couponDelayMin, washWeeks }
} as const;
