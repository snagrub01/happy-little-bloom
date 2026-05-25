
# Fix Plan: Background GPS Tracking & Notifications via Capacitor

The root problem: browsers stop running JavaScript when the phone is locked or the app is closed, so `watchPosition` and `setTimeout` silently die. Fix: swap web APIs for Capacitor **native plugins** that the OS runs for us. UI, data, and settings stay the same — we only rewrite two library files.

---

## What gets fixed

| # | Issue | Fix |
|---|---|---|
| 1 | `watchPosition` dies when screen locks | `@capacitor-community/background-geolocation` |
| 2 | JS distance-math geofencing stops in background | Same plugin keeps GPS running natively |
| 3 | `setTimeout`/`setInterval` reminders die when app closes | `@capacitor/local-notifications` scheduled delivery |
| 4 | `visibilitychange` restart hack | Native watcher persists — remove the hack |
| 5 | `capacitor.config.ts` points at Lovable preview URL | Remove `server.url` for production |
| 6 | Missing iOS/Android background permissions | Add Info.plist + AndroidManifest entries |
| 7 | Notification permission requested from `useEffect` (fails on iOS) | Trigger from a button click |

---

## Steps I'll do in Lovable

**1. Install plugins**
`@capacitor/local-notifications`, `@capacitor-community/background-geolocation`, `@capacitor/app`.

**2. New file `src/lib/native-geofence.ts`**
Wraps `BackgroundGeolocation.addWatcher(...)`. Detects Capacitor at runtime; falls back to existing web `watchPosition` in browsers. Same enter/exit logic as today. Persists `wasAtHome`/`wasAtWork` to localStorage so flags survive app restarts.

**3. Rewrite `src/lib/notifications.ts`**
- `sendLocalNotification` → `LocalNotifications.schedule({ at: now })` on native, Web Notification fallback
- `scheduleBagReminder(delayMin)` → OS-scheduled notification at `Date.now() + delayMs`
- `scheduleWashReminder()` → OS-scheduled recurring every 14 days (fires whether app is open or not)
- `requestNotificationPermission()` → `LocalNotifications.requestPermissions()` on native

**4. Update `src/lib/geofence.ts`**
Delegate to native-geofence on Capacitor; keep web logic as fallback. No call-site changes elsewhere.

**5. Clean up `App.tsx`**
Remove `visibilitychange`/`focus` restart dance — single mount call is enough.

**6. Fix `capacitor.config.ts`**
Remove `server.url` so production native builds load from `dist/`.

**7. Add "Enable Notifications" button**
On the Reminders page — iOS only grants permission from a user gesture.

---

## What you do once, after I'm done (copy-paste)

After `git pull → npm install → npx cap add android`:

**`android/app/src/main/AndroidManifest.xml`** — add inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
```

(iOS Info.plist snippet provided if/when you add iOS.)

Then: `npm run build && npx cap sync android && npx cap open android` → Run.

Every future Lovable change: `git pull && npm install && npm run build && npx cap sync` — no more permission edits.

---

## Honest scope
- **My work in Lovable:** ~1 hour, 4 files touched.
- **Your local setup:** ~30 min the first time, then automatic.
- **Result:** GPS + reminders work with screen locked and app closed on Android (and iOS when you add it).
- **Pure PWA alternative?** Not possible — browsers don't allow background geolocation or scheduled notifications. Capacitor is the only real path.

Ready to implement.
