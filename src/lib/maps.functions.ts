import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function authHeaders() {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !connKey) {
    throw new Error("Google Maps connector is not configured");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Connection-Api-Key": connKey,
  } as const;
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Search grocery stores near a location within a radius (meters).
export const searchNearbyStores = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { lat: number; lng: number; radiusMeters: number }) => {
      if (
        typeof data?.lat !== "number" ||
        typeof data?.lng !== "number" ||
        typeof data?.radiusMeters !== "number"
      ) {
        throw new Error("Invalid coordinates");
      }
      const radius = Math.min(Math.max(data.radiusMeters, 30), 50_000);
      return { lat: data.lat, lng: data.lng, radiusMeters: radius };
    },
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        includedTypes: ["grocery_store", "supermarket"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: data.lat, longitude: data.lng },
            radius: data.radiusMeters,
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Places search failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }>;
    };

    const results: PlaceResult[] = (json.places ?? [])
      .filter((p) => p.location)
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text ?? "Unnamed store",
        address: p.formattedAddress ?? "",
        lat: p.location!.latitude,
        lng: p.location!.longitude,
      }));

    return { results };
  });

// Geocode address (used to set home location by address)
export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data: { address: string }) => {
    if (!data?.address || typeof data.address !== "string") {
      throw new Error("Address required");
    }
    const address = data.address.trim().slice(0, 300);
    if (address.length < 2) throw new Error("Address too short");
    return { address };
  })
  .handler(async ({ data }) => {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(data.address)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Geocode failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    if (json.status !== "OK" || !json.results?.length) {
      throw new Error(`No results for that address (${json.status})`);
    }
    const top = json.results[0];
    return {
      label: top.formatted_address,
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
    };
  });
