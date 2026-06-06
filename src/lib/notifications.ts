// Notification helpers. Works while the app is OPEN in the browser tab.
// Background/locked-screen notifications require a native build (Capacitor).
//
// On mobile (Android Chrome), `new Notification(...)` throws "Illegal constructor".
// We must use ServiceWorkerRegistration.showNotification() instead. We register a
// minimal notification-only service worker (no caching) to make this work everywhere.

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function getCurrentNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }

  return Notification.permission;
}

function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/sw.js")
      .then(async () => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export function requestNotificationPermissionFromUserGesture(): Promise<NotificationPermission> {
  const currentPermission = getCurrentNotificationPermission();

  if (currentPermission !== "default") {
    if (currentPermission === "granted") {
      void getSwRegistration();
    }
    return Promise.resolve(currentPermission);
  }

  try {
    const request = Notification.requestPermission();
    return Promise.resolve(request)
      .then((permission) => {
        const resolvedPermission = permission === "default"
          ? getCurrentNotificationPermission()
          : permission;

        if (resolvedPermission === "granted") {
          void getSwRegistration();
        }
        return resolvedPermission;
      })
      .catch(() => getCurrentNotificationPermission());
  } catch {
    return Promise.resolve(getCurrentNotificationPermission());
  }
}

export function prepareNotifications(): void {
  if (getCurrentNotificationPermission() === "granted") {
    void getSwRegistration();
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  const currentPermission = getCurrentNotificationPermission();
  if (currentPermission === "granted") {
    await getSwRegistration();
    return currentPermission;
  }

  const permission = await requestNotificationPermissionFromUserGesture();
  if (permission === "granted") {
    await getSwRegistration();
  }
  return permission;
}

export async function notify(title: string, body: string, tag?: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (getCurrentNotificationPermission() !== "granted") return false;
  const options: NotificationOptions = {
    body,
    tag,
    badge: "/icon-192.png",
    icon: "/icon-192.png",
  };
  const reg = await getSwRegistration();
  if (reg) {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch {
      /* fall through to constructor */
    }
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    /* ignore — mobile browsers throw here; SW path above is the supported route */
    return false;
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
