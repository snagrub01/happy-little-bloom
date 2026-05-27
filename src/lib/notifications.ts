import { isNative } from "./native";

/**
 * Request permission to display local notifications.
 * On native (Capacitor) uses LocalNotifications plugin. On web uses Notification API.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch {
      return false;
    }
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

let nextId = 1;
function genId() {
  // Capacitor needs a 32-bit signed int id
  nextId = (nextId + 1) % 2147483000;
  return Date.now() % 2147480000 + nextId;
}

/**
 * Display a notification immediately. On native this is delivered by the OS
 * (works whether the app is foreground/background/closed). On web it falls
 * back to the Notification API via the service worker.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  options?: { urgent?: boolean }
) {
  const isUrgent = options?.urgent ?? false;
  console.log("[notifications] sendLocalNotification title=" + title + " urgent=" + isUrgent);

  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const id = genId();
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            smallIcon: "ic_stat_icon_config_sample",
            extra: { urgent: isUrgent },
          },
        ],
      });
      console.log("[notifications] native scheduled id=" + id);
      return;
    } catch (e) {
      console.warn("[notifications] native schedule failed", e);
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
 * Schedule a notification to fire `delayMinutes` from now. On native this is
 * handled by the OS — it fires even if the app is closed. On web it falls back
 * to setTimeout (which dies when the tab is closed).
 */
export async function scheduleBagReminder(delayMinutes: number, message: string) {
  const ms = delayMinutes * 60 * 1000;
  const at = new Date(Date.now() + ms);

  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id: genId(),
            title: "🛍️ Bag Au Pair Reminder",
            body: message,
            schedule: { at },
          },
        ],
      });
      return;
    } catch {
      // fall through
    }
  }

  setTimeout(() => {
    sendLocalNotification("🛍️ Bag Au Pair Reminder", message);
  }, ms);
}

/**
 * Schedule a recurring wash reminder every `everyDays` days. On native the OS
 * delivers it whether the app is open or not. On web it uses setInterval
 * (limited — only fires while the tab is alive).
 */
export async function scheduleWashReminder(everyDays: number = 14) {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      // Cancel any previous wash reminder so we don't stack duplicates
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
            schedule: { at, every: "day", count: 365, repeats: false },
          },
        ],
      });
      return;
    } catch {
      // fall through
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
