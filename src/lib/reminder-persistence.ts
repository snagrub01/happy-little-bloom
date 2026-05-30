const KEY = "bagbuddy-reminders";

export interface ReminderSettings {
  bagIn: { enabled: boolean; timing: string };
  secondaryReminder: { enabled: boolean; delayMinutes: number };
  bagOut: { enabled: boolean; timing: string };
  washReminder: { enabled: boolean; timing: string };
  couponReminder: { enabled: boolean };
}

const defaults: ReminderSettings = {
  bagIn: { enabled: true, timing: "arriving" },
  secondaryReminder: { enabled: false, delayMinutes: 3 },
  bagOut: { enabled: true, timing: "5" },
  washReminder: { enabled: true, timing: "14" },
  couponReminder: { enabled: true },
};

export function saveReminderSettings(s: ReminderSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}
