export interface StoreResult {
  id: string;
  name: string;
  distance: string;
  address: string;
  lat: number;
  lon: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
    "addr:city"?: string;
    shop?: string;
  };
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function geocodeZipCode(zip: string): Promise<{ lat: number; lon: number }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`,
    { headers: { "User-Agent": "BagAuPair/1.0" } }
  );
  const data: NominatimResult[] = await res.json();
  if (!data.length) throw new Error("Zip code not found");
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

export async function findNearbyStores(
  lat: number,
  lon: number,
  radiusMiles: number
): Promise<StoreResult[]> {
  const radiusMeters = Math.round(radiusMiles * 1609.34);

  const query = `
    [out:json][timeout:10];
    (
      node["shop"="supermarket"](around:${radiusMeters},${lat},${lon});
      way["shop"="supermarket"](around:${radiusMeters},${lat},${lon});
      node["shop"="grocery"](around:${radiusMeters},${lat},${lon});
      way["shop"="grocery"](around:${radiusMeters},${lat},${lon});
      node["shop"="convenience"](around:${radiusMeters},${lat},${lon});
      way["shop"="convenience"](around:${radiusMeters},${lat},${lon});
    );
    out center;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) throw new Error("Store search failed");

  const data = await res.json();
  const elements: OverpassElement[] = data.elements || [];

  const stores: StoreResult[] = elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat ?? 0;
      const elLon = el.lon ?? el.center?.lon ?? 0;
      const dist = haversineDistance(lat, lon, elLat, elLon);
      const street = el.tags?.["addr:street"] || "";
      const num = el.tags?.["addr:housenumber"] || "";
      const city = el.tags?.["addr:city"] || "";
      const address = [num, street, city].filter(Boolean).join(" ") || "Address unavailable";

      return {
        id: String(el.id),
        name: el.tags!.name!,
        distance: `${dist.toFixed(1)} mi`,
        address,
        lat: elLat,
        lon: elLon,
      };
    })
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

  return stores;
}
