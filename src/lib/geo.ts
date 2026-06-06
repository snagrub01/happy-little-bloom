// Geolocation helpers.
export const FEET_PER_METER = 3.28084;

export function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000; // earth radius m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function feetBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return metersBetween(a, b) * FEET_PER_METER;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 15_000,
    });
  });
}

export function watchPosition(
  onUpdate: (p: GeolocationPosition) => void,
  onError?: (e: GeolocationPositionError) => void,
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError?.({
      code: 2,
      message: "Geolocation not supported",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError);
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(onUpdate, onError, {
    enableHighAccuracy: true,
    maximumAge: 10_000,
    timeout: 20_000,
  });
  return () => navigator.geolocation.clearWatch(id);
}
