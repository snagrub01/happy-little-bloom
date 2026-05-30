// Radar handles all native geofencing and background location — no WebView dependency

import { Radar } from "capacitor-radar";
import { isNative } from "./native";
import { sendLocalNotification } from "./notifications";

const DEVICE_ID_KEY = "bagbuddy-radar-device-id";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      "dev_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {}
  }
  return id;
}

let initialized = false;

/**
 * Initialize Radar SDK, identify the device, start responsive
 * background tracking, and subscribe to geofence entry events.
 * Entry events fire a local notification via notifications.ts.
 */
export async function initialize(): Promise<void> {
  if (!isNative()) {
    console.log("[radar] not native — skipping initialize");
    return;
  }
  if (initialized) {
    console.log("[radar] already initialized");
    return;
  }

  const publishableKey = import.meta.env.VITE_RADAR_KEY as string | undefined;
  if (!publishableKey || publishableKey.trim() === "") {
    console.warn("[radar] VITE_RADAR_KEY not set — skipping Radar initialization");
    return;
  }

  try {
    await (Radar as any).initialize({ publishableKey });
    console.log("[radar] initialized");

    const deviceId = getOrCreateDeviceId();
    await (Radar as any).setUserId({ userId: deviceId });
    console.log("[radar] userId set:", deviceId);

    await (Radar as any).startTracking({ preset: "responsive" });
    console.log("[radar] startTracking responsive");

    (Radar as any).addListener("events", (result: any) => {
      const events = result?.events || [];
      for (const ev of events) {
        if (typeof ev?.type === "string" && ev.type.includes("entry")) {
          const placeName = ev?.place?.name || "Nearby Store";
          sendLocalNotification(
            "🛍️ Don't forget your bags!",
            `You're near ${placeName} — grab your reusable bags!`
          ).catch((e) => console.error("[radar] notify failed", e));
        }
      }
    });

    initialized = true;
  } catch (e) {
    console.error("[radar] initialize failed", e);
  }
}

/** Stop Radar background tracking. */
export async function stop(): Promise<void> {
  if (!isNative()) return;
  try {
    await (Radar as any).stopTracking();
    console.log("[radar] stopped");
  } catch (e) {
    console.error("[radar] stop failed", e);
  }
}
