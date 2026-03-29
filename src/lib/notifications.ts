export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function sendLocalNotification(title: string, body: string, options?: { urgent?: boolean }) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const isUrgent = options?.urgent ?? false;

  // Android PWAs require service worker notifications (new Notification() doesn't work)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const notifOptions: NotificationOptions & { actions?: Array<{ action: string; title: string }>; requireInteraction?: boolean; tag?: string; renotify?: boolean; urgency?: string } = {
        body,
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
      };

      if (isUrgent) {
        // High-priority notification that persists on screen & lock screen
        notifOptions.requireInteraction = true;
        notifOptions.tag = "bagaupair-urgent-" + Date.now();
        notifOptions.renotify = true;
        notifOptions.vibrate = [300, 100, 300, 100, 300]; // strong pattern
        notifOptions.actions = [
          { action: "open", title: "✅ Yes, Open App" },
          { action: "dismiss", title: "❌ No" },
        ];
      }

      await registration.showNotification(title, notifOptions);
      return;
    } catch (e) {
      // Fall back to standard Notification API
    }
  }

  new Notification(title, {
    body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    requireInteraction: isUrgent,
  });
}

export function scheduleBagReminder(delayMinutes: number, message: string) {
  const ms = delayMinutes * 60 * 1000;
  setTimeout(() => {
    sendLocalNotification("🛍️ Bag Au Pair Reminder", message);
  }, ms);
}

export function scheduleWashReminder() {
  // Every 14 days in ms
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
  setInterval(() => {
    sendLocalNotification(
      "🧺 Time to Wash Your Bags",
      "It's been 2 weeks — time to wash your canvas grocery bags!"
    );
  }, TWO_WEEKS);
}
