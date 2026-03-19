/**
 * Trigger a gentle vibration pattern.
 * Falls back silently on devices that don't support the Vibration API.
 */
export function gentleVibrate() {
  if ("vibrate" in navigator) {
    // Two short pulses: 200ms vibrate, 100ms pause, 200ms vibrate
    navigator.vibrate([200, 100, 200]);
  }
}
