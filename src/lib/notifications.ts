/**
 * Foreground-only notification helpers.
 *
 * Background geofence notifications are fired natively by
 * GeofenceReceiver.java — not from this file.
 *
 * This module handles:
 *   - Android notification channel setup (so manual + native-fired
 *     notifications share a single high-importance channel)
 *   - Foreground permission requests (called from UI / app mount)
 *   - Manual / test notifications triggered while the app is open
 *     (Reminders page "Test" button, in-foreground confirmations)
 *
 * It does NOT:
 *   - subscribe to geofence callbacks
 *   - schedule recovery / reconciliation on app restart
 *   - assume it can run from a background JS callback
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNative } from "./native";

const CHANNEL_ID = "default_notifications";
let channelReady = false;

/** Create the Android notification channel (idempotent, foreground only). */
export async function ensureNotificationChannel(): Promise<void> {
  if (channelReady || !isNative()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "App Notifications",
      description: "Bag Au Pair reminders and alerts",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    channelReady = true;
    console.log("[notifications] channel ready: " + CHANNEL_ID);
  } catch (e) {
    console.warn("[notifications] createChannel failed", e);
  }
}

/** Request OS permission to display notifications (foreground only). */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      await ensureNotificationChannel();
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    }
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      const p = await Notification.requestPermission();
      return p === "granted";
    }
  } catch (e) {
    console.warn("[notifications] requestPermission failed", e);
  }
  return false;
}

/**
 * Fire a notification immediately. Intended for foreground use:
 * manual "Test" buttons, in-app confirmations, web fallback.
 * Background geofence transitions are handled natively.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  _options?: { urgent?: boolean }
): Promise<void> {
  try {
    if (isNative()) {
      await ensureNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2_000_000_000),
            title,
            body,
            channelId: CHANNEL_ID,
            smallIcon: "ic_stat_icon",
          },
        ],
      });
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn("[notifications] sendLocalNotification failed", e);
  }
}

/**
 * Schedule a one-shot reminder `delayMinutes` in the future.
 * Triggered from foreground UI actions (e.g. Reminders page). The OS
 * scheduler delivers it later — this file does NOT track or recover
 * pending notifications across restarts.
 */
export async function scheduleBagReminder(
  delayMinutes: number,
  message: string
): Promise<void> {
  try {
    if (!isNative()) return;
    await ensureNotificationChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 2_000_000_000),
          title: "🛍️ Bag Au Pair Reminder",
          body: message,
          channelId: CHANNEL_ID,
          smallIcon: "ic_stat_icon",
          schedule: { at: new Date(Date.now() + delayMinutes * 60_000) },
        },
      ],
    });
  } catch (e) {
    console.warn("[notifications] scheduleBagReminder failed", e);
  }
}

// ---------- Wash reminder (fixed ID 1001, OS-scheduled, persisted) ----------

export const WASH_NOTIF_ID = 1001;
const WASH_SCHEDULED_AT_KEY = "bagbuddy-wash-scheduled-at";

export async function scheduleWashReminderAt(everyDays: number): Promise<void> {
  try {
    const at = new Date(Date.now() + everyDays * 24 * 60 * 60 * 1000);
    if (isNative()) {
      await ensureNotificationChannel();
      await LocalNotifications.cancel({ notifications: [{ id: WASH_NOTIF_ID }] });
      await LocalNotifications.schedule({
        notifications: [
          {
            id: WASH_NOTIF_ID,
            title: "🧺 Time to Wash Your Bags",
            body: `It's been ${everyDays} days — time to wash your canvas grocery bags!`,
            channelId: CHANNEL_ID,
            smallIcon: "ic_stat_icon",
            schedule: { at },
          },
        ],
      });
    }
    localStorage.setItem(WASH_SCHEDULED_AT_KEY, at.toISOString());
  } catch (e) {
    console.warn("[notifications] scheduleWashReminderAt failed", e);
  }
}

export async function cancelWashReminder(): Promise<void> {
  try {
    if (isNative()) {
      await LocalNotifications.cancel({ notifications: [{ id: WASH_NOTIF_ID }] });
    }
    localStorage.removeItem(WASH_SCHEDULED_AT_KEY);
  } catch (e) {
    console.warn("[notifications] cancelWashReminder failed", e);
  }
}

/** Reschedule wash reminder on app launch if it's missing or in the past. */
export async function ensureWashReminderScheduled(everyDays: number): Promise<void> {
  try {
    const raw = localStorage.getItem(WASH_SCHEDULED_AT_KEY);
    if (!raw) {
      await scheduleWashReminderAt(everyDays);
      return;
    }
    const at = new Date(raw);
    if (isNaN(at.getTime()) || at.getTime() <= Date.now()) {
      await scheduleWashReminderAt(everyDays);
    }
  } catch (e) {
    console.warn("[notifications] ensureWashReminderScheduled failed", e);
  }
}

// ---------- Bag-return reminder (fixed ID 1002, OS-scheduled, persisted) ----------

export const BAG_RETURN_NOTIF_ID = 1002;
const BAG_RETURN_KEY = "bagbuddy-bag-return-scheduled-at";

export async function scheduleBagReturnReminder(
  delayMinutes: number,
  opts: { daily?: boolean } = {}
): Promise<void> {
  try {
    const at = new Date(Date.now() + delayMinutes * 60_000);
    if (isNative()) {
      await ensureNotificationChannel();
      await LocalNotifications.cancel({ notifications: [{ id: BAG_RETURN_NOTIF_ID }] });
      await LocalNotifications.schedule({
        notifications: [
          {
            id: BAG_RETURN_NOTIF_ID,
            title: "🚗 Bag Au Pair",
            body: "Time to put your bags back in the car",
            channelId: CHANNEL_ID,
            smallIcon: "ic_stat_icon",
            schedule: opts.daily
              ? { at, repeats: true, every: "day" }
              : { at },
          },
        ],
      });
    }
    localStorage.setItem(BAG_RETURN_KEY, at.toISOString());
  } catch (e) {
    console.warn("[notifications] scheduleBagReturnReminder failed", e);
  }
}

export async function cancelBagReturnReminder(): Promise<void> {
  try {
    if (isNative()) {
      await LocalNotifications.cancel({ notifications: [{ id: BAG_RETURN_NOTIF_ID }] });
    }
    localStorage.removeItem(BAG_RETURN_KEY);
  } catch (e) {
    console.warn("[notifications] cancelBagReturnReminder failed", e);
  }
}

