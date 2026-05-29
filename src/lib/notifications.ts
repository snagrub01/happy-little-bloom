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
import { LocalNotifications, Importance, Visibility } from "@capacitor/local-notifications";
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
      importance: Importance.High,
      visibility: Visibility.Public,
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

/** Schedule a single wash reminder occurrence (foreground-triggered). */
export async function scheduleWashReminder(everyDays: number = 14): Promise<void> {
  try {
    if (!isNative()) return;
    await ensureNotificationChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 777001,
          title: "🧺 Time to Wash Your Bags",
          body: `It's been ${everyDays} days — time to wash your canvas grocery bags!`,
          channelId: CHANNEL_ID,
          smallIcon: "ic_stat_icon",
          schedule: { at: new Date(Date.now() + everyDays * 24 * 60 * 60 * 1000) },
        },
      ],
    });
  } catch (e) {
    console.warn("[notifications] scheduleWashReminder failed", e);
  }
}
