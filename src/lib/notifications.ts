// Notification helpers. Works while the app is OPEN in the browser tab.
// Background/locked-screen notifications require a native build (Capacitor).
//
// On mobile (Android Chrome), `new Notification(...)` throws "Illegal constructor".
// We must use ServiceWorkerRegistration.showNotification() instead. We register a
// minimal notification-only service worker (no caching) to make this work everywhere.

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        // Wait until the SW is active so showNotification() works on first call.
        if (reg.active) return reg;
        await new Promise<void>((resolve) => {
          const sw = reg.installing || reg.waiting;
          if (!sw) return resolve();
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
        });
        return reg;
      })
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  // Kick off SW registration early so it's ready when we fire.
  void getSwRegistration();
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function notify(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions = { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" };
  const reg = await getSwRegistration();
  if (reg) {
    try {
      await reg.showNotification(title, options);
      return;
    } catch {
      /* fall through to constructor */
    }
  }
  try {
    new Notification(title, options);
  } catch {
    /* ignore — mobile browsers throw here; SW path above is the supported route */
  }
}

// Schedule timed reminders relative to "now"
export function scheduleReminder(delayMs: number, title: string, body: string, tag: string) {
  if (delayMs <= 0) {
    void notify(title, body, tag);
    return () => {};
  }
  const id = window.setTimeout(() => { void notify(title, body, tag); }, delayMs);
  return () => window.clearTimeout(id);
}
