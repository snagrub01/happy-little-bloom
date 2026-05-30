# Plan: PWA-honest reminders + scheduled notifications

## 1. On-open location proximity check

Create `src/lib/on-open-proximity.ts` with `runOnOpenProximityCheck()`:
- Use `@capacitor/geolocation` → `requestPermissions()` then `getCurrentPosition()` (web falls back to `navigator.geolocation`).
- Load stores via `loadStoreData()` from `store-persistence.ts`; filter to `enabled` set.
- Read per-store radius from `loadStoreGeofences()`; default to **500 m** when missing (convert feet→meters if needed, but store new default in meters via a new helper).
- Haversine distance between current position and each store's lat/lng.
- Track fired stores in `sessionStorage` under `bagbuddy-onopen-fired` (JSON array of store IDs); skip if already fired this session.
- For each store within radius: call `sendLocalNotification("🛍️ Bag Au Pair", "Don't forget your bags — you're near {name}")`, then add its ID to the session set.
- Logs: `[on-open] checking location against N stores`, `[on-open] near {name}, firing reminder`, plus a warn on permission denied.

Wire it into `src/App.tsx` inside a `useEffect(() => { ... }, [])` that runs once on mount (fire-and-forget, never blocks render).

## 2. Wash reminder via real scheduled notification

Add to `src/lib/notifications.ts`:
- `WASH_NOTIF_ID = 1001`, `WASH_SCHEDULED_AT_KEY = "bagbuddy-wash-scheduled-at"`.
- `scheduleWashReminderAt(everyDays)`:
  - `LocalNotifications.cancel({ notifications: [{ id: WASH_NOTIF_ID }] })`.
  - Compute `at = new Date(Date.now() + everyDays * 86400_000)`.
  - `LocalNotifications.schedule({ notifications: [{ id: WASH_NOTIF_ID, title, body, channelId, smallIcon, schedule: { at } }] })`.
  - `localStorage.setItem(WASH_SCHEDULED_AT_KEY, at.toISOString())`.
- `cancelWashReminder()`: cancel + remove localStorage key.
- `ensureWashReminderScheduled(everyDays)`: on app launch, if enabled and stored date missing or in the past, reschedule.

Update `src/pages/Reminders.tsx`:
- Replace the `setInterval` wash `useEffect` with a call to `scheduleWashReminderAt(parseInt(washReminder.timing, 10))` when enabled, `cancelWashReminder()` when disabled, re-run when interval changes.

Update `src/App.tsx` on-open effect to also call `ensureWashReminderScheduled(...)` based on loaded reminder settings.

## 3. "Put bags back in car" scheduled reminder

Add to `src/lib/notifications.ts`:
- `BAG_RETURN_NOTIF_ID = 1002`, `BAG_RETURN_KEY = "bagbuddy-bag-return-scheduled-at"`.
- `scheduleBagReturnReminder(delayMinutes, { daily })`: cancel existing 1002, schedule with `schedule: { at, repeats: daily, every: "day" }` when daily; otherwise one-shot at `Date.now() + delayMinutes*60_000`. Persist scheduled timestamp.
- `cancelBagReturnReminder()`.

In `Reminders.tsx`:
- Replace the empty bag-return `useEffect` with one that, when `bagOut.enabled`, calls `scheduleBagReturnReminder(parseInt(bagOut.timing,10), { daily: false })`, and when disabled calls `cancelBagReturnReminder()`.
- Existing `reminder-persistence` already persists `bagOut` enabled+timing.

## 4. Honest PWA copy

Replace misleading language across the app. Specific edits:

- `src/components/BatteryOptimizationPrompt.tsx`: change "To receive geofence and reminder notifications even when your screen…" → "So scheduled reminders (wash, bag return) fire reliably while your screen is locked."
- `src/pages/Reminders.tsx` info card (line ~360): rewrite to "Open the app before you head out and we'll remind you when you're near your stores. Wash and bag-return reminders run on your phone's scheduler."
- Add a new tip card near the top of Reminders page (above the "Enable notifications" card): "💡 Tip: Open the app before leaving home for the best reminder experience."
- `src/pages/Index.tsx`, `src/pages/Install.tsx`, `src/pages/Stores.tsx`, `src/components/HomeLocationCard.tsx`, `WorkLocationCard.tsx`, `GeofenceDebugPanel.tsx`: grep each for any "automatic", "background", "when you enter", "even when…closed", "automatically notifies"; rewrite to "Reminds you when you open the app near a store" / "Open the app before you head out…" style. (I'll do an exhaustive ripgrep pass during implementation and update each match.)

## Technical notes

- Geolocation plugin `@capacitor/geolocation` is already a Capacitor-standard plugin; if missing from `package.json` I'll install it.
- All new notifications use the existing `default_notifications` channel + `ic_stat_icon`.
- No changes to Radar / `native-geofence.ts` — those keep handling true native geofence entry events.
- Session-only dedupe via `sessionStorage` (clears on app cold start, which is exactly "once per app open session").
