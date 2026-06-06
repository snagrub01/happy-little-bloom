# Restore Reliable Notification Delivery

## Root causes identified

Reading `src/lib/notifications.ts`, `src/lib/native-geofence.ts`, `src/lib/geofence.ts`, `src/main.tsx`, `src/App.tsx`, `src/lib/startup.ts`, and `capacitor.config.ts`, three concrete bugs explain why notifications stopped firing after the migration:

1. **No Android notification channel.** Android 8+ silently drops any notification whose `channelId` doesn't match a registered channel. We never call `LocalNotifications.createChannel(...)`, and we never set a `channelId` on scheduled notifications. On many devices this means the notification is accepted by the OS but never shown in the tray.
2. **`schedule({ at: now + 100ms })` for "immediate" notifications.** The Capacitor LocalNotifications plugin treats `schedule.at` as a future alarm. With a 100 ms offset, if the app is foreground the notification is sometimes suppressed by the OS, and with no channel + no sound/priority it never surfaces. Immediate user-visible notifications should be scheduled without `schedule.at` (or `at: new Date(Date.now() + 1000)` *with* a channel) and with explicit `sound`, `smallIcon`, `channelId`.
3. **`smallIcon: 'ic_stat_icon_config_sample'` references a drawable that doesn't exist** in the Android project (it's the Capacitor sample placeholder). When the small icon can't be resolved, Android 12+ drops the notification entirely. We need to fall back to the app icon and let the user replace it later.

Secondary issues:

4. `requestNotificationPermission()` is called from `initAppServices()` which runs *before* React mounts. On Android 13+ this is fine, but on iOS the system dialog must come from a user gesture — the "Enable notifications" button on `/reminders` already handles this, so startup permission request should be best-effort and never block geofence startup.
5. No `LocalNotifications.addListener('localNotificationReceived' | 'localNotificationActionPerformed')` — we have zero visibility into whether the OS actually delivered.
6. `genId()` mixes `Date.now() % 2147480000 + nextId` which can collide and exceed 32-bit signed range over time. Switch to a simple monotonically incrementing counter persisted in memory.

## Fix plan (notifications only — GPS logic untouched)

### 1. `src/lib/notifications.ts` — rewrite scheduling

- Add `ensureNotificationChannel()` that on native + Android calls `LocalNotifications.createChannel({ id: 'bagaupair-default', name: 'Bag Reminders', importance: 5, visibility: 1, sound: undefined, vibration: true, lights: true })`. Call it once, memoized.
- `requestNotificationPermission()` — on native, call `ensureNotificationChannel()` after permission is granted. Log permission state.
- `sendLocalNotification(title, body, opts)` — on native:
  - Call `ensureNotificationChannel()`.
  - Build payload with `channelId: 'bagaupair-default'`, `smallIcon: 'ic_stat_icon_config_sample'` removed (let Capacitor fall back to app icon), `largeIcon` omitted, `sound: undefined`, `extra`.
  - **Do not pass `schedule.at` for immediate notifications.** Omitting `schedule` causes Capacitor to fire immediately.
  - Wrap in try/catch; log the *exact* error (`e?.message`, `e?.code`) on failure.
- `scheduleBagReminder` / `scheduleWashReminder` — keep `schedule.at` for future ones, add `channelId`, drop bogus `smallIcon`.
- Replace `genId()` with a simple incrementing counter (`++nextId`) seeded from `Date.now() & 0x7fffffff >> 1`.
- Add `LocalNotifications.addListener('localNotificationReceived', ...)` once at module init logging `[notifications] OS delivered id=...`.

### 2. `src/lib/startup.ts` — make permission non-blocking + create channel early

- `initAppServices()`: call `ensureNotificationChannel()` *before* requesting permission, so the channel exists even if permission is later granted via the Reminders button.
- Wrap `requestNotificationPermission()` in `.catch()` so a rejection never prevents `startGeofenceWatching()` from running.
- Add `[startup] channel ready / permission=...` logs.

### 3. `src/lib/geofence.ts` — verify trigger path

- Add `[geofence] TRIGGER store=<name> dist=<x>mi threshold=<y>mi` log immediately before each `sendLocalNotification(...)` call (store proximity, home arrival, leaving home, leaving work).
- Wrap each `sendLocalNotification(...)` in `.then(() => log success).catch(err => console.error)` so we see exactly which call fails.

### 4. `src/lib/native-geofence.ts` — confirm callback fires

- Already logs each bg location. Add a counter so we can see "N location updates received in this session" — useful when buyer says "notifications never fired" we can tell if it was GPS or notifications.

### 5. `src/pages/Reminders.tsx` — add a "Send test notification" button

- Right next to the existing "Enable notifications" button, add a button that calls `sendLocalNotification('🧪 Test', 'If you see this in your tray, notifications work!')`. This lets the buyer verify the fix in one tap without driving to a store.

### 6. Android manifest reminder (no code change in Lovable)

After `npx cap sync`, the user must ensure `AndroidManifest.xml` still has `POST_NOTIFICATIONS` (already documented). No new permissions required.

## Files touched

- `src/lib/notifications.ts` — rewrite scheduling, add channel, add receive listener
- `src/lib/startup.ts` — non-blocking permission, early channel creation
- `src/lib/geofence.ts` — trigger logs + per-call error handling
- `src/lib/native-geofence.ts` — location counter
- `src/pages/Reminders.tsx` — "Send test notification" debug button

## How we'll verify

After `git pull && npm install && npm run build && npx cap sync android && npx cap run android`:

1. Open app → tap **Send test notification** → notification must appear in tray within 1 second.
2. `adb logcat | grep -E "notifications|geofence|startup"` shows: channel created → permission granted → test scheduled → `OS delivered`.
3. Walk into a geofence (or use Android Studio's location mock) → see `[geofence] TRIGGER ...` → `[notifications] native scheduled` → `[notifications] OS delivered` → tray notification.
4. Lock screen, repeat geofence trigger — should still fire (the background watcher + scheduled notification both run natively).

## Out of scope

- GPS / background-geolocation behavior (untouched — only logging added).
- iOS-specific permission flow (already handled via Reminders button).
- Custom notification icons / branded `ic_stat_*` drawable (user can add later in Android Studio; for now we fall back to the app icon so notifications are visible).