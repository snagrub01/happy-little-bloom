/**
 * Web Notifications API wrappers (PWA-only).
 *
 * No Capacitor native plugins. All notifications use `new Notification()`
 * after `Notification.requestPermission()`. Scheduled reminders (wash,
 * bag-return) are persisted to localStorage as target timestamps and
 * checked on every app open; if the target time has passed, a Web
 * Notification is fired immediately.
 */

export const WASH_NOTIF_ID = 1001;
export const BAG_RETURN_NOTIF_ID = 1002;

const WASH_TARGET_KEY = "bagaupair-wash-target";
const WASH_DAYS_KEY = "bagaupair-wash-days";
const BAG_RETURN_TARGET_KEY = "bagaupair-bag-return-target";
const BAG_RETURN_MINUTES_KEY = "bagaupair-bag-return-minutes";

/** Request browser notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (typeof Notification === "undefined") {
      console.warn("[notifications] Notification API not available");
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch (e) {
    console.warn("[notifications] requestPermission failed", e);
    return false;
  }
}

/** Fire a Web Notification immediately if permission is granted. */
export async function sendLocalNotification(
  title: string,
  body: string,
  _options?: { urgent?: boolean }
): Promise<void> {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") {
      const granted = await requestNotificationPermission();
      if (!granted) {
        console.warn("[notifications] permission not granted; skipping notification");
        return;
      }
    }
    // Prefer service-worker notification for PWA reliability; fall back to
    // the page-level Notification constructor.
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, { body, icon: "/pwa-icon-192.png", badge: "/pwa-icon-192.png" });
        return;
      } catch {
        // fall through to page-level
      }
    }
    new Notification(title, { body });
  } catch (e) {
    console.warn("[notifications] sendLocalNotification failed", e);
  }
}

// ---------- Wash reminder (target-date in localStorage) ----------

export async function scheduleWashReminderAt(everyDays: number): Promise<void> {
  try {
    const target = Date.now() + everyDays * 24 * 60 * 60 * 1000;
    localStorage.setItem(WASH_TARGET_KEY, String(target));
    localStorage.setItem(WASH_DAYS_KEY, String(everyDays));
    await sendLocalNotification(
      "🧺 Wash reminder set",
      `We will remind you in ${everyDays} days to wash your canvas bags.`
    );
  } catch (e) {
    console.warn("[notifications] scheduleWashReminderAt failed", e);
  }
}

export async function cancelWashReminder(): Promise<void> {
  try {
    localStorage.removeItem(WASH_TARGET_KEY);
    localStorage.removeItem(WASH_DAYS_KEY);
  } catch {}
}

/**
 * On app open: if a wash target date has passed, fire the reminder and
 * roll the target forward by the saved interval.
 */
export async function ensureWashReminderScheduled(everyDays: number): Promise<void> {
  try {
    const raw = localStorage.getItem(WASH_TARGET_KEY);
    if (!raw) {
      const target = Date.now() + everyDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(WASH_TARGET_KEY, String(target));
      localStorage.setItem(WASH_DAYS_KEY, String(everyDays));
      return;
    }
    const target = parseInt(raw, 10);
    if (!Number.isFinite(target)) return;
    if (target <= Date.now()) {
      await sendLocalNotification(
        "Time to Wash Your Bags",
        `It's been ${everyDays} days — time to wash your canvas grocery bags!`
      );
      const next = Date.now() + everyDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(WASH_TARGET_KEY, String(next));
      localStorage.setItem(WASH_DAYS_KEY, String(everyDays));
    }
  } catch (e) {
    console.warn("[notifications] ensureWashReminderScheduled failed", e);
  }
}

export function getWashReminderTarget(): number | null {
  try {
    const raw = localStorage.getItem(WASH_TARGET_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ---------- Bag-return reminder (target-time in localStorage) ----------

export async function scheduleBagReturnReminder(
  delayMinutes: number,
  _opts: { daily?: boolean } = {}
): Promise<void> {
  try {
    const target = Date.now() + delayMinutes * 60_000;
    localStorage.setItem(BAG_RETURN_TARGET_KEY, String(target));
    localStorage.setItem(BAG_RETURN_MINUTES_KEY, String(delayMinutes));
    await sendLocalNotification(
      "🚗 Bag-return reminder set",
      `We will remind you in ${delayMinutes} minutes to put your bags back in the car.`
    );
  } catch (e) {
    console.warn("[notifications] scheduleBagReturnReminder failed", e);
  }
}

export async function cancelBagReturnReminder(): Promise<void> {
  try {
    localStorage.removeItem(BAG_RETURN_TARGET_KEY);
    localStorage.removeItem(BAG_RETURN_MINUTES_KEY);
  } catch {}
}

/** On app open: fire bag-return reminder if target time has passed. */
export async function ensureBagReturnFired(): Promise<void> {
  try {
    const raw = localStorage.getItem(BAG_RETURN_TARGET_KEY);
    if (!raw) return;
    const target = parseInt(raw, 10);
    if (!Number.isFinite(target)) return;
    if (target <= Date.now()) {
      await sendLocalNotification(
        "Time to Put Your Bags Back in the Car",
        "Time to put your reusable bags back in the car."
      );
      localStorage.removeItem(BAG_RETURN_TARGET_KEY);
      localStorage.removeItem(BAG_RETURN_MINUTES_KEY);
    }
  } catch (e) {
    console.warn("[notifications] ensureBagReturnFired failed", e);
  }
}

export function getBagReturnTarget(): number | null {
  try {
    const raw = localStorage.getItem(BAG_RETURN_TARGET_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Legacy helper kept for callers; fires immediately via Web Notification. */
export async function scheduleBagReminder(
  _delayMinutes: number,
  message: string
): Promise<void> {
  await sendLocalNotification("🛍️ Bag Au Pair Reminder", message);
}

export async function ensureNotificationChannel(): Promise<void> {
  // No-op in PWA. Kept for backwards compatibility.
}
