export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function sendLocalNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Android PWAs require service worker notifications (new Notification() doesn't work)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
      });
      return;
    } catch (e) {
      // Fall back to standard Notification API
    }
  }

  new Notification(title, {
    body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
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
