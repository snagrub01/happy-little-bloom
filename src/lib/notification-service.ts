/**
 * NotificationService — single source of truth for ALL notifications.
 *
 * Architecture:
 *   - OS-scheduled via @capacitor/local-notifications (no JS timers for
 *     final delivery — the Android AlarmManager / iOS UNUserNotification
 *     handles firing even if the app is killed).
 *   - Persistent store in localStorage is the recovery source of truth.
 *   - Reconciliation engine runs on every app launch + resume to re-arm
 *     any OS schedules that were lost (lowmemorykiller, MIUI/SmartPower
 *     aggressive battery management, device reboot, app reinstall).
 *   - Android notification channel `default_notifications` (IMPORTANCE_HIGH)
 *     created exactly once per install, never downgraded.
 *
 * All callers (UI components, geofence engine, reminders page) MUST use
 * this module. They MUST NOT touch @capacitor/local-notifications directly.
 */

import { Capacitor } from "@capacitor/core";
import { isNative } from "./native";
// Eager static import — critical for background-callback paths. A dynamic
// import inside a background-geolocation callback queues a microtask that
// only resolves when the WebView is awake; on Android that means the
// notification doesn't fire until the user touches the UI.
import { LocalNotifications } from "@capacitor/local-notifications";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type NotificationStatus = "active" | "fired" | "cancelled";

export interface StoredNotification {
  id: number;
  title: string;
  body: string;
  /** epoch ms; 0 means "immediate, fire-and-forget" (not persisted as active) */
  scheduledTime: number;
  status: NotificationStatus;
  urgent?: boolean;
  /** optional category for callers to scope queries (e.g. "wash", "bag") */
  tag?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const CHANNEL_ID = "default_notifications";
const CHANNEL_NAME = "App Notifications";
const STORAGE_KEY = "bagaupair:notifications:v1";
const ID_COUNTER_KEY = "bagaupair:notifications:nextId";

/* ------------------------------------------------------------------ */
/* Persistent store (localStorage)                                    */
/* ------------------------------------------------------------------ */

function readStore(): StoredNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(items: StoredNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("[notif-svc] writeStore failed", e);
  }
}

function upsert(n: StoredNotification): void {
  const items = readStore();
  const idx = items.findIndex((x) => x.id === n.id);
  if (idx >= 0) items[idx] = n;
  else items.push(n);
  writeStore(items);
}

function markStatus(id: number, status: NotificationStatus): void {
  const items = readStore();
  const idx = items.findIndex((x) => x.id === id);
  if (idx >= 0) {
    items[idx].status = status;
    writeStore(items);
  }
}

function nextId(): number {
  try {
    const raw = localStorage.getItem(ID_COUNTER_KEY);
    let n = raw ? parseInt(raw, 10) : 1000;
    if (!Number.isFinite(n) || n <= 0) n = 1000;
    n = (n + 1) % 2_000_000_000;
    localStorage.setItem(ID_COUNTER_KEY, String(n));
    return n;
  } catch {
    return Math.floor(Math.random() * 1_000_000) + 1;
  }
}

/* ------------------------------------------------------------------ */
/* Channel + permission                                               */
/* ------------------------------------------------------------------ */

let channelReady = false;
let listenersAttached = false;

async function ensureChannel(): Promise<void> {
  if (!isNative()) return;
  if (channelReady) return;
  try {


    if (!listenersAttached) {
      listenersAttached = true;
      try {
        await LocalNotifications.addListener("localNotificationReceived", (n) => {
          console.log("[notif-svc] OS delivered id=" + n.id);
          markStatus(Number(n.id), "fired");
        });
        await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
          console.log("[notif-svc] action id=" + a.notification.id);
        });
      } catch (e) {
        console.warn("[notif-svc] addListener failed", e);
      }
    }

    if (Capacitor.getPlatform() === "android") {
      // Android does NOT allow downgrading an existing channel's
      // importance, so we only ever call createChannel with HIGH.
      // Subsequent calls with identical config are no-ops.
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: CHANNEL_NAME,
        description: "High-priority alerts (geofence, reminders)",
        importance: 5, // IMPORTANCE_HIGH — heads-up
        visibility: 1, // VISIBILITY_PUBLIC — lock screen
        sound: undefined, // channel default sound
        vibration: true,
        lights: true,
      });
      console.log("[notif-svc] channel ensured id=" + CHANNEL_ID);
    }
    channelReady = true;
  } catch (e) {
    console.warn("[notif-svc] ensureChannel failed", e);
  }
}

export async function requestPermission(): Promise<boolean> {
  if (isNative()) {
    try {
  
      const res = await LocalNotifications.requestPermissions();
      const granted = res.display === "granted";
      console.log("[notif-svc] native permission display=" + res.display);
      if (granted) await ensureChannel();
      return granted;
    } catch (e) {
      console.warn("[notif-svc] requestPermissions failed", e);
      return false;
    }
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

/* ------------------------------------------------------------------ */
/* OS scheduling primitives                                           */
/* ------------------------------------------------------------------ */

async function osSchedule(n: StoredNotification): Promise<void> {
  if (isNative()) {
    await ensureChannel();

    const payload: any = {
      id: n.id,
      title: n.title,
      body: n.body,
      channelId: CHANNEL_ID,
      extra: { urgent: !!n.urgent, tag: n.tag ?? null },
    };
    // Future-dated → pass schedule.at. Immediate → omit schedule entirely
    // so the OS fires right away.
    if (n.scheduledTime && n.scheduledTime > Date.now() + 500) {
      payload.schedule = { at: new Date(n.scheduledTime), allowWhileIdle: true };
    }
    await LocalNotifications.schedule({ notifications: [payload] });
    console.log(
      "[notif-svc] osSchedule id=" + n.id + " at=" +
        (payload.schedule ? new Date(n.scheduledTime).toISOString() : "now")
    );
    return;
  }

  // Web fallback — only used in browser dev; not part of the production
  // native path. Uses Notifications API directly for immediate; for future
  // we fall back to a single setTimeout (acceptable for PWA dev preview).
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const fire = () => {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification(n.title, {
              body: n.body,
              icon: "/pwa-icon-192.png",
              badge: "/pwa-icon-192.png",
              requireInteraction: !!n.urgent,
            })
          )
          .catch(() => new Notification(n.title, { body: n.body }));
      } else {
        new Notification(n.title, { body: n.body });
      }
      markStatus(n.id, "fired");
    } catch (e) {
      console.warn("[notif-svc] web fire failed", e);
    }
  };
  const delay = n.scheduledTime - Date.now();
  if (delay <= 500) fire();
  else setTimeout(fire, delay);
}

async function osCancel(ids: number[]): Promise<void> {
  if (!isNative() || ids.length === 0) return;
  try {

    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch (e) {
    console.warn("[notif-svc] osCancel failed", e);
  }
}

async function osPendingIds(): Promise<Set<number>> {
  if (!isNative()) return new Set();
  try {

    const pending = await LocalNotifications.getPending();
    return new Set(pending.notifications.map((p) => Number(p.id)));
  } catch (e) {
    console.warn("[notif-svc] osPendingIds failed", e);
    return new Set();
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Schedule a notification to fire at an absolute or relative time.
 * Persists to local store and registers with the OS scheduler.
 */
export async function scheduleNotification(opts: {
  title: string;
  body: string;
  /** epoch ms OR a Date — required for scheduled (use triggerImmediateNotification for now) */
  at: number | Date;
  urgent?: boolean;
  tag?: string;
  /** optional explicit id to overwrite an existing schedule */
  id?: number;
}): Promise<number> {
  const at = typeof opts.at === "number" ? opts.at : opts.at.getTime();
  const id = opts.id ?? nextId();
  const record: StoredNotification = {
    id,
    title: opts.title,
    body: opts.body,
    scheduledTime: at,
    status: "active",
    urgent: opts.urgent,
    tag: opts.tag,
  };
  // If id was reused, cancel the previous OS schedule first.
  if (opts.id) await osCancel([id]);
  upsert(record);
  try {
    await osSchedule(record);
  } catch (e: any) {
    console.error("[notif-svc] scheduleNotification osSchedule failed: " + (e?.message || e));
  }
  return id;
}

/**
 * Fire a notification immediately. Not persisted as "active" — recorded
 * directly as fired so reconciliation never tries to re-fire it.
 */
export async function triggerImmediateNotification(
  title: string,
  body: string,
  options?: { urgent?: boolean; tag?: string }
): Promise<number> {
  const id = nextId();
  const record: StoredNotification = {
    id,
    title,
    body,
    scheduledTime: 0,
    status: "fired",
    urgent: options?.urgent,
    tag: options?.tag,
  };
  upsert(record);
  try {
    await osSchedule(record);
  } catch (e: any) {
    console.error("[notif-svc] triggerImmediate failed: " + (e?.message || e));
  }
  return id;
}

/** All persisted notifications (any status). */
export function getStoredNotifications(): StoredNotification[] {
  return readStore();
}

/** Pending = active in our store AND scheduled in the OS. */
export async function getPendingNotifications(): Promise<StoredNotification[]> {
  const stored = readStore().filter((n) => n.status === "active");
  if (!isNative()) return stored;
  const osIds = await osPendingIds();
  return stored.filter((n) => osIds.has(n.id));
}

/** Cancel a scheduled notification. */
export async function cancelNotification(id: number): Promise<void> {
  await osCancel([id]);
  markStatus(id, "cancelled");
}

/**
 * Reconciliation engine — call on every app launch and resume.
 *
 *   1. Load stored notifications.
 *   2. Fetch OS-pending ids.
 *   3. For each active stored:
 *        - if scheduledTime is in the past → mark fired (assume OS fired it).
 *        - else if NOT in OS pending → re-register (recovery from kill).
 *   4. Drop stale stored entries older than 30 days.
 */
export async function reschedulePendingNotifications(): Promise<{
  rescheduled: number;
  expired: number;
  pruned: number;
}> {
  await ensureChannel();
  const stored = readStore();
  const osIds = await osPendingIds();
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  let rescheduled = 0;
  let expired = 0;
  let pruned = 0;
  const kept: StoredNotification[] = [];

  for (const n of stored) {
    // prune very old fired/cancelled records
    if (n.status !== "active" && now - n.scheduledTime > THIRTY_DAYS) {
      pruned++;
      continue;
    }
    if (n.status === "active") {
      if (n.scheduledTime > 0 && n.scheduledTime <= now) {
        // The scheduled time passed. Either the OS fired it (no `received`
        // listener fired because the app was killed) or it was missed.
        // Either way, do not re-fire — mark fired so we stop tracking.
        n.status = "fired";
        expired++;
      } else if (isNative() && n.scheduledTime > now && !osIds.has(n.id)) {
        // Missing in the OS scheduler — recover it.
        try {
          await osSchedule(n);
          rescheduled++;
        } catch (e) {
          console.warn("[notif-svc] reschedule failed id=" + n.id, e);
        }
      }
    }
    kept.push(n);
  }
  writeStore(kept);

  console.log(
    "[notif-svc] reconcile: stored=" + stored.length +
      " os=" + osIds.size +
      " rescheduled=" + rescheduled +
      " expired=" + expired +
      " pruned=" + pruned
  );
  return { rescheduled, expired, pruned };
}

/**
 * One-shot init for app startup. Idempotent.
 */
let initialized = false;
export async function initNotificationService(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await ensureChannel();
  // Best-effort permission — never blocks.
  requestPermission()
    .then((g) => console.log("[notif-svc] permission granted=" + g))
    .catch((e) => console.warn("[notif-svc] permission err", e));
  await reschedulePendingNotifications();

  // Lifecycle hooks: re-reconcile on resume / state change.
  if (isNative()) {
    try {
      const { App } = await import("@capacitor/app");
      App.addListener("appStateChange", (state) => {
        if (state.isActive) {
          reschedulePendingNotifications().catch((e) =>
            console.warn("[notif-svc] resume reconcile failed", e)
          );
        }
      });
      App.addListener("resume", () => {
        reschedulePendingNotifications().catch(() => {});
      });
    } catch (e) {
      console.warn("[notif-svc] App listener attach failed", e);
    }
  }
}
