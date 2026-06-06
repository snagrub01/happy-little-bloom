// Notification helpers. Works while the app is OPEN in the browser tab.
// Background/locked-screen notifications require a native build (Capacitor).

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notify(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/icon-192.png" });
  } catch {
    /* ignore */
  }
}

// Schedule timed reminders relative to "now"
export function scheduleReminder(delayMs: number, title: string, body: string, tag: string) {
  if (delayMs <= 0) {
    notify(title, body, tag);
    return () => {};
  }
  const id = window.setTimeout(() => notify(title, body, tag), delayMs);
  return () => window.clearTimeout(id);
}
