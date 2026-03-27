const KEY = "bagbuddy-home-location";

export interface HomeLocation {
  lat: number;
  lon: number;
  label: string;
  radiusFeet?: number; // leaving geofence radius in feet (default 500)
}

export function saveHomeLocation(loc: HomeLocation) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {}
}

export function loadHomeLocation(): HomeLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearHomeLocation() {
  localStorage.removeItem(KEY);
}

/**
 * Reverse-geocode coordinates to a human-readable label using Nominatim.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { "User-Agent": "BagAuPair/1.0" } }
    );
    const data = await res.json();
    const addr = data.address;
    if (addr) {
      const parts = [addr.house_number, addr.road, addr.city || addr.town || addr.village].filter(Boolean);
      return parts.join(" ") || data.display_name?.split(",").slice(0, 3).join(",") || "Home";
    }
    return data.display_name?.split(",").slice(0, 3).join(",") || "Home";
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}
