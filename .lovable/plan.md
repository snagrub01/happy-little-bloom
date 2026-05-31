## Goal

Bring Capacitor usage in line with the stated rule: **only `@capacitor/geolocation` in active use, no other Capacitor plugins called.** The audit found two deviations:

1. `capacitor-native-settings` + `@capacitor/core` are used in `BatteryOptimizationPrompt.tsx`.
2. `@capacitor/core` is used in `src/lib/native.ts` (consumed by `geofence.ts`).
3. `@capacitor/geolocation` is in `package.json` but never imported — all location calls use `navigator.geolocation`.

## Changes

### 1. Remove `BatteryOptimizationPrompt` Capacitor calls
- `src/components/BatteryOptimizationPrompt.tsx`: drop the `@capacitor/core` and `capacitor-native-settings` imports. As a PWA, Android battery-optimization settings can't be opened from JS. Either:
  - **(a)** delete the component entirely and remove its usage in `src/App.tsx`, or
  - **(b)** keep the dialog as a one-time informational prompt with instructions for the user to open Settings manually (no native call).
  Recommend (a) — simpler and consistent with the PWA-only direction.

### 2. Remove `src/lib/native.ts` and its consumers
- Delete `src/lib/native.ts`.
- `src/lib/geofence.ts`: remove the `isNative()` import and the `if (isNative()) { ... return; }` branch (lines that early-return on native). The web `watchPosition` path becomes the only path.

### 3. Drop unused Capacitor packages
- Remove from `package.json`: `@capacitor/android`, `@capacitor/app`, `@capacitor/cli`, `@capacitor/core`, `@capacitor/ios`, `capacitor-native-settings`.
- Keep `@capacitor/geolocation` only if we plan to use it; otherwise remove it too since it isn't imported. Recommend removing — the current code is purely web-based.

### 4. Verify
- `rg "@capacitor|capacitor-" src/` returns no matches.
- App builds and runs; on-open proximity, wash reminder, bag-return reminder all still trigger Web Notifications.

## Out of scope
- Notification flow, on-open proximity logic, reminder persistence — all already passing the audit; no changes needed.
- `setTimeout` usage in `geofence.ts` (foreground follow-up + bag-out delay after home arrival) — separate from wash/bag-return scheduling and acceptable for an open-app session.
