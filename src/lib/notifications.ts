/**
 * Compatibility shim — DO NOT add new logic here.
 *
 * All real notification logic now lives in `./notification-service`.
 * This file re-exports the legacy function names so existing callers
 * (geofence engine, Reminders page) continue to work while routing
 * everything through the single NotificationService source of truth.
 */
import {
  triggerImmediateNotification,
  scheduleNotification,
  requestPermission,
  reschedulePendingNotifications as reschedulePending,
  initNotificationService,
} from "./notification-service";

export { reschedulePending as reschedulePendingNotifications };

/** Ensure channel exists (delegates to service init). */
export async function ensureNotificationChannel(): Promise<void> {
  await initNotificationService();
}

/** Request OS permission to display notifications. */
export async function requestNotificationPermission(): Promise<boolean> {
  return requestPermission();
}

/** Fire a notification right now. */
export async function sendLocalNotification(
  title: string,
  body: string,
  options?: { urgent?: boolean }
): Promise<void> {
  await triggerImmediateNotification(title, body, options);
}

/** Schedule a reminder `delayMinutes` from now. */
export async function scheduleBagReminder(
  delayMinutes: number,
  message: string
): Promise<void> {
  await scheduleNotification({
    title: "🛍️ Bag Au Pair Reminder",
    body: message,
    at: Date.now() + delayMinutes * 60_000,
    tag: "bag",
  });
}

/**
 * Schedule a recurring wash reminder. We register a single concrete
 * occurrence; the geofence/UI layers can re-call this to extend.
 * (Capacitor's `every` field is unreliable across OEMs — we prefer
 * explicit re-scheduling via the reconciliation engine.)
 */
export async function scheduleWashReminder(everyDays: number = 14): Promise<void> {
  const WASH_ID = 777001;
  await scheduleNotification({
    id: WASH_ID,
    title: "🧺 Time to Wash Your Bags",
    body: `It's been ${everyDays} days — time to wash your canvas grocery bags!`,
    at: Date.now() + everyDays * 24 * 60 * 60 * 1000,
    tag: "wash",
  });
}
