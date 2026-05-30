# Plan

## 1. Radius: max 1800 ft, default 1800 ft, feet labels everywhere

- `src/pages/Stores.tsx`: change `DEFAULT_GEOFENCE_FEET = 250` → `1800`. Slider min/max already 25–1800 ft (no change). Labels already in ft.
- `src/components/HomeLocationCard.tsx` & `src/components/WorkLocationCard.tsx` (the latter will be deleted, see §2): default `home.radiusFeet || 500` → `|| 1800`. Slider already max 1800.
- `src/lib/on-open-proximity.ts`: replace `DEFAULT_RADIUS_METERS = 500` with `DEFAULT_RADIUS_FEET = 1800`, and compute `radiusMeters = (radiusFeet ?? DEFAULT_RADIUS_FEET) * FEET_TO_METERS`. Conversion `0.3048` is already correct.
- `src/lib/geofence.ts`: `DEFAULT_LEAVING_RADIUS_FEET` becomes moot once leaving reminders are removed (see §2), but if any store-related logic still uses a default, bump to `1800`.
- Quick grep pass to make sure no remaining UI string says "meters" / "m" for user-facing radius.

## 2. Remove Leaving Home & Leaving Work reminders

- `src/pages/Reminders.tsx`:
  - Remove `leavingHome` / `leavingWork` state, the two `<Card>` blocks (lines ~195–235), `<WorkLocationCard />`, and references in dependency arrays.
  - Trim the persist `useEffect` and the geofence-restart `useEffect` accordingly.
- `src/lib/reminder-persistence.ts`: drop `leavingHome` and `leavingWork` from `ReminderSettings` + defaults.
- `src/lib/geofence.ts`: delete the "Leaving Home reminder" and "Leaving Work reminder" branches, related state fields (`wasAtHome`, `wasAtWork`, `leavingHomeNotified`, `leavingWorkNotified`), and the `hasLeavingHome` / `hasLeavingWork` early-return gates. Keep store-proximity logic intact.
- `src/components/WorkLocationCard.tsx` and `src/lib/work-location.ts`: delete (no longer referenced). Remove `WORK_KEY` localStorage by clearing on next load is optional; we'll just stop reading/writing it.
- `src/components/GeofenceDebugPanel.tsx`: remove the Leaving Home / Leaving Work panels and `work-location` import. Keep the store-proximity portion.
- Any remaining imports of removed modules get cleaned up.

## 3. Home Address section (keep & surface)

The existing `HomeLocationCard` already satisfies the spec (current-location button + manual address input via Nominatim, persisted to localStorage, label shown with clear/edit affordances). After §2 it remains the sole location card on the Reminders page. No new component needed; we just:

- Keep `<HomeLocationCard delay={0.13} />` in `Reminders.tsx`.
- Update its subtitle copy (currently mentions "leaving-home reminder") to: "Used to detect when you're near saved stores."
- Confirm save/load via `src/lib/home-location.ts` (already in place).

## Technical notes

- localStorage keys removed in §2: `bagbuddy-work-location`, and the now-unused `leavingHome`/`leavingWork` subkeys inside `bagbuddy-reminders` (handled gracefully by `loadReminderSettings` spreading over defaults).
- No backend or schema changes.
- No new dependencies.

## Out of scope

- Changing the store search-radius slider on Stores.tsx (that's miles for finding stores, not the geofence alert radius).
- Reworking notification scheduling for wash/bag-return (already correct).
