export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendLocalNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
  });
}

export function scheduleBagReminder(delayMinutes: number, message: string) {
  const ms = delayMinutes * 60 * 1000;
  setTimeout(() => {
    sendLocalNotification("🛍️ BagBuddy Reminder", message);
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
