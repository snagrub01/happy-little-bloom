import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState, K } from "@/lib/storage";
import { DEFAULT_REMINDERS, type HomeLocation, type RemindersSettings, type SavedStore } from "@/lib/types";
import { ensureNotificationPermission, notify, scheduleReminder } from "@/lib/notifications";
import { feetBetween, watchPosition } from "@/lib/geo";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders · Bag Au Pair" },
      { name: "description", content: "Configure your bag, coupon, and canvas-wash reminders." },
    ],
  }),
  component: RemindersPage,
});

const COOLDOWN_MS = 30 * 60 * 1000; // don't refire same store within 30 min
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function RemindersPage() {
  const [settings, setSettings] = useLocalState<RemindersSettings>(K.reminders, DEFAULT_REMINDERS);
  const [home] = useLocalState<HomeLocation | null>(K.home, null);
  const [stores, setStores] = useLocalState<SavedStore[]>(K.stores, []);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [tracking, setTracking] = useState(false);

  const storesRef = useRef(stores);
  storesRef.current = stores;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Ask for permission on mount if reminders enabled
  useEffect(() => {
    if (settings.enabled && perm === "default") {
      ensureNotificationPermission().then(setPerm);
    }
  }, [settings.enabled, perm]);

  // Watch position whenever enabled & we have stores + permission
  useEffect(() => {
    if (!settings.enabled || perm !== "granted" || stores.length === 0) {
      setTracking(false);
      return;
    }
    setTracking(true);
    const stop = watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const now = Date.now();
        const current = storesRef.current;
        for (const s of current) {
          const dist = feetBetween(here, s);
          const inside = dist <= s.triggerFeet;
          const cool = !s.lastFiredAt || now - s.lastFiredAt > COOLDOWN_MS;
          if (inside && cool) {
            fireBagSequence(s.name, settingsRef.current);
            setStores((prev) =>
              prev.map((p) => (p.id === s.id ? { ...p, lastFiredAt: now } : p)),
            );
          }
        }
      },
      () => setTracking(false),
    );
    return () => { stop(); setTracking(false); };
  }, [settings.enabled, perm, stores.length, setStores]);

  // Wash reminder check (runs on mount & once per minute while page open)
  useEffect(() => {
    function checkWash() {
      const s = settingsRef.current;
      if (!s.enabled) return;
      const interval = s.washWeeks * WEEK_MS;
      const last = s.washLastFiredAt ?? 0;
      if (Date.now() - last >= interval) {
        notify("Wash your canvas bags 🧼", "It's time to clean your reusable bags.", "bap-wash");
        setSettings({ ...s, washLastFiredAt: Date.now() });
      }
    }
    checkWash();
    const id = window.setInterval(checkWash, 60_000);
    return () => window.clearInterval(id);
  }, [setSettings]);

  async function toggleEnabled(next: boolean) {
    if (next) {
      const p = await ensureNotificationPermission();
      setPerm(p);
    }
    setSettings({ ...settings, enabled: next });
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set how and when Bag Au Pair nudges you.
      </p>

      {/* Master toggle */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={"grid h-10 w-10 place-items-center rounded-xl " + (settings.enabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}>
              {settings.enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-semibold">Reminders</div>
              <div className="text-xs text-muted-foreground">
                {settings.enabled ? (tracking ? "Watching your location…" : statusText(home, stores, perm)) : "Turned off"}
              </div>
            </div>
          </div>
          <Switch checked={settings.enabled} onChange={toggleEnabled} />
        </div>
        {perm === "denied" && settings.enabled && (
          <p className="mt-3 text-xs text-destructive">
            Notifications are blocked. Enable them in your browser settings for this site.
          </p>
        )}
      </section>

      {/* Secondary reminder delay */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Second nudge delay</h2>
          <span className="text-sm font-semibold text-primary">{settings.secondaryDelayMin} min</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A follow-up "don't forget your bags" reminder fires this many minutes after the first.
        </p>
        <input
          type="range" min={1} max={5} step={1}
          value={settings.secondaryDelayMin}
          onChange={(e) => setSettings({ ...settings, secondaryDelayMin: Number(e.target.value) })}
          className="mt-3 w-full accent-[var(--primary)]"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>1 min</span><span>5 min</span></div>
      </section>

      {/* Coupon delay */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Coupon reminder</h2>
          <span className="text-sm font-semibold text-primary">{settings.couponDelayMin} min</span>
        </div>
        <p className="text-xs text-muted-foreground">
          "Check for coupons" fires this many minutes after the first bag reminder.
        </p>
        <input
          type="range" min={1} max={30} step={1}
          value={settings.couponDelayMin}
          onChange={(e) => setSettings({ ...settings, couponDelayMin: Number(e.target.value) })}
          className="mt-3 w-full accent-[var(--primary)]"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>1 min</span><span>30 min</span></div>
      </section>

      {/* Wash schedule */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Wash canvas bags</h2>
          <span className="text-sm font-semibold text-primary">
            every {settings.washWeeks} {settings.washWeeks === 1 ? "week" : "weeks"}
          </span>
        </div>
        <input
          type="range" min={1} max={4} step={1}
          value={settings.washWeeks}
          onChange={(e) => setSettings({ ...settings, washWeeks: Number(e.target.value) })}
          className="mt-3 w-full accent-[var(--primary)]"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>1 wk</span><span>4 wks</span></div>
      </section>

      {/* Test button */}
      <button
        onClick={async () => {
          const p = await ensureNotificationPermission();
          setPerm(p);
          if (p !== "granted") {
            alert(
              p === "denied"
                ? "Notifications are blocked. Enable them in your browser settings for this site."
                : "Please allow notifications to test the reminder.",
            );
            return;
          }
          fireBagSequence("Test Store", settingsRef.current);
        }}
        className="mt-5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium"
      >
        Test reminder now
      </button>

      <p className="mt-5 rounded-xl bg-secondary px-3 py-2.5 text-xs text-secondary-foreground">
        ℹ️ Heads-up: location-triggered reminders only work while this app is open in your
        browser. For true background reminders when your phone is locked, the app needs to
        be built as a native iOS/Android app (Capacitor) — coming next.
      </p>
    </AppShell>
  );
}

function fireBagSequence(storeName: string, s: RemindersSettings) {
  // Primary
  notify("Don't forget your bags! 🛍️", `You're near ${storeName}.`, "bap-bag-1");
  // Secondary
  scheduleReminder(
    s.secondaryDelayMin * 60_000,
    "Still don't forget your bags!",
    `Heading into ${storeName}?`,
    "bap-bag-2",
  );
  // Coupon
  scheduleReminder(
    s.couponDelayMin * 60_000,
    "Check your coupons 🎟️",
    `Any deals or coupons for ${storeName}?`,
    "bap-coupon",
  );
}

function statusText(
  home: HomeLocation | null,
  stores: SavedStore[],
  perm: NotificationPermission,
) {
  if (perm !== "granted") return "Allow notifications to enable alerts";
  if (!home) return "Set a home location in Stores";
  if (stores.length === 0) return "Add at least one watched store";
  return "Ready";
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "relative h-7 w-12 rounded-full transition-colors " +
        (checked ? "bg-primary" : "bg-secondary")
      }
    >
      <span
        className={
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}
