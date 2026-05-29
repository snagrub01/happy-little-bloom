import { isNative } from "./native";
import { Capacitor } from "@capacitor/core";

/**
 * Notification service layer.
 *
 * All notification triggering in the app MUST go through the functions
 * exported from this module. The service is UI-independent: it is
 * initialized once at app startup from `src/lib/startup.ts` and never
 * relies on a component being mounted or visible.
 *
 * Channel ID is intentionally a stable constant so that rebuilds / app
 * upgrades reuse the same Android channel (Android does not allow
 * downgrading an existing channel's importance, so we only ever create
 * it with IMPORTANCE_HIGH and never mutate it afterwards).
 */
const CHANNEL_ID = "default_notifications";


let channelReady = false;
let receiverAttached = false;

/**
 * Ensure the Android notification channel exists. Android 8+ silently drops
 * notifications whose channelId isn't registered, so this must run before
 * any schedule() call. Memoized — safe to call repeatedly.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (!isNative()) return;
  if (channelReady) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Attach receive listener once so we can confirm OS delivery in logs.
    if (!receiverAttached) {
      receiverAttached = true;
      try {
        await LocalNotifications.addListener("localNotificationReceived", (n) => {
          console.log("[notifications] OS delivered id=" + n.id + " title=" + n.title);
        });
        await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
          console.log("[notifications] action performed id=" + a.notification.id);
        });
      } catch (e) {
        console.warn("[notifications] addListener failed", e);
      }
    }

    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "App Notifications",
        description: "High-priority alerts (store proximity, bag and wash reminders)",
        importance: 5, // IMPORTANCE_HIGH — heads-up notifications
        visibility: 1, // VISIBILITY_PUBLIC — show on lock screen
        sound: undefined, // use channel default system sound
        vibration: true,
        lights: true,
      });
      console.log("[notifications] android channel ensured id=" + CHANNEL_ID);
    }
    channelReady = true;
  } catch (e) {
    console.warn("[notifications] ensureNotificationChannel failed", e);
  }
}


/**
 * Request permission to display local notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const res = await LocalNotifications.requestPermissions();
      const granted = res.display === "granted";
      console.log("[notifications] native permission display=" + res.display);
      if (granted) await ensureNotificationChannel();
      return granted;
    } catch (e) {
      console.warn("[notifications] requestPermissions failed", e);
      return false;
    }
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Simple monotonic 32-bit-safe id counter.
let nextId = Math.floor(Math.random() * 100000) + 1;
function genId(): number {
  nextId = (nextId + 1) % 2_000_000_000;
  return nextId;
}

/**
 * Display a notification immediately. On native, omits schedule.at so the OS
 * fires it right away; uses the registered channel so it surfaces on Android.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  options?: { urgent?: boolean }
) {
  const isUrgent = options?.urgent ?? false;
  console.log("[notifications] sendLocalNotification title=" + title + " urgent=" + isUrgent + " native=" + isNative());

  if (isNative()) {
    try {
      await ensureNotificationChannel();
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const id = genId();
      console.log("[notifications] native scheduling id=" + id);
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId: CHANNEL_ID,
            // No schedule.at → fires immediately.
            extra: { urgent: isUrgent },
          },
        ],
      });
      console.log("[notifications] native schedule() returned ok id=" + id);
      return;
    } catch (e: any) {
      console.error(
        "[notifications] native schedule FAILED: " +
          (e?.message || e) +
          " code=" +
          (e?.code || "n/a")
      );
      // fall through to web fallback
    }
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const notifOptions: NotificationOptions & {
        actions?: Array<{ action: string; title: string }>;
        requireInteraction?: boolean;
        tag?: string;
        renotify?: boolean;
        vibrate?: number[];
      } = {
        body,
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
      };

      if (isUrgent) {
        notifOptions.requireInteraction = true;
        notifOptions.tag = "bagaupair-urgent-" + Date.now();
        notifOptions.renotify = true;
        notifOptions.vibrate = [300, 100, 300, 100, 300];
        notifOptions.actions = [
          { action: "open", title: "✅ Yes, Open App" },
          { action: "dismiss", title: "❌ No" },
        ];
      }

      await registration.showNotification(title, notifOptions);
      return;
    } catch {
      // fall through
    }
  }

  new Notification(title, {
    body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    requireInteraction: isUrgent,
  });
}

/**
 * Schedule a notification to fire `delayMinutes` from now.
 */
export async function scheduleBagReminder(delayMinutes: number, message: string) {
  const ms = delayMinutes * 60 * 1000;
  const at = new Date(Date.now() + ms);

  if (isNative()) {
    try {
      await ensureNotificationChannel();
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const id = genId();
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: "🛍️ Bag Au Pair Reminder",
            body: message,
            channelId: CHANNEL_ID,
            schedule: { at },
          },
        ],
      });
      console.log("[notifications] scheduled future id=" + id + " at=" + at.toISOString());
      return;
    } catch (e: any) {
      console.error("[notifications] scheduleBagReminder failed: " + (e?.message || e));
    }
  }

  setTimeout(() => {
    sendLocalNotification("🛍️ Bag Au Pair Reminder", message);
  }, ms);
}

/**
 * Schedule a recurring wash reminder every `everyDays` days.
 */
export async function scheduleWashReminder(everyDays: number = 14) {
  if (isNative()) {
    try {
      await ensureNotificationChannel();
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const WASH_ID = 777001;
      try {
        await LocalNotifications.cancel({ notifications: [{ id: WASH_ID }] });
      } catch {}
      const at = new Date(Date.now() + everyDays * 24 * 60 * 60 * 1000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: WASH_ID,
            title: "🧺 Time to Wash Your Bags",
            body: `It's been ${everyDays} days — time to wash your canvas grocery bags!`,
            channelId: CHANNEL_ID,
            schedule: { at, every: "day", count: 365, repeats: false },
          },
        ],
      });
      return;
    } catch (e: any) {
      console.error("[notifications] scheduleWashReminder failed: " + (e?.message || e));
    }
  }

  const ms = everyDays * 24 * 60 * 60 * 1000;
  setInterval(() => {
    sendLocalNotification(
      "🧺 Time to Wash Your Bags",
      `It's been ${everyDays} days — time to wash your canvas grocery bags!`
    );
  }, ms);
}

/* ------------------------------------------------------------------ */
/* Public service-layer API                                           */
/* ------------------------------------------------------------------ */
/* These are the ONLY entry points UI / geofence code should use to   */
/* trigger notifications. They are thin, stable aliases over the      */
/* implementation above so callers never reach into Capacitor         */
/* directly and never depend on component lifecycle.                  */

/** Fire a notification right now (status bar + heads-up). */
export const triggerImmediateNotification = (
  title: string,
  body: string,
  options?: { urgent?: boolean }
) => sendLocalNotification(title, body, options);

/** Schedule a notification `delayMinutes` from now. */
export const scheduleNotification = (delayMinutes: number, message: string) =>
  scheduleBagReminder(delayMinutes, message);

/**
 * Re-arm any pending notifications after app restart. The native
 * scheduler persists schedules across restarts on its own, but we
 * call this on startup so the channel is guaranteed to exist before
 * any future-dated alarm fires, and to give us a clear log marker.
 */
export async function reschedulePendingNotifications(): Promise<void> {
  if (!isNative()) return;
  try {
    await ensureNotificationChannel();
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    console.log(
      "[notifications] reschedulePending: " + pending.notifications.length + " pending"
    );
  } catch (e: any) {
    console.warn("[notifications] reschedulePending failed: " + (e?.message || e));
  }
}

