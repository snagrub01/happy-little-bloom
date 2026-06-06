const KEY = "bagbuddy-work-location";

export interface WorkLocation {
  lat: number;
  lon: number;
  label: string;
  radiusFeet?: number; // leaving geofence radius in feet (default 500)
}

export function saveWorkLocation(loc: WorkLocation) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {}
}

export function loadWorkLocation(): WorkLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearWorkLocation() {
  localStorage.removeItem(KEY);
}
