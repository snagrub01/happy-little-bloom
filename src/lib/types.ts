export interface HomeLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface SavedStore {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Distance in feet at which the "don't forget your bags" reminder fires. */
  triggerFeet: number;
  /** Last time we fired a reminder for this store (epoch ms) to avoid spam. */
  lastFiredAt?: number;
}

export const STORE_TRIGGER_PRESETS = [
  { label: "Arriving", feet: 25 },
  { label: "500 ft", feet: 500 },
  { label: "0.25 mi", feet: 1320 },
] as const;

export function normalizeStoreTriggerFeet(feet: number): number {
  return STORE_TRIGGER_PRESETS.reduce<number>((closest, preset) => {
    return Math.abs(preset.feet - feet) < Math.abs(closest - feet) ? preset.feet : closest;
  }, STORE_TRIGGER_PRESETS[1].feet);
}

export interface ShoppingItem {
  id: string;
  text: string;
  done: boolean;
}

export interface RemindersSettings {
  enabled: boolean;
  /** Minutes between primary and secondary "bags" reminder (1–5). */
  secondaryDelayMin: number;
  /** Minutes after primary reminder to show the coupon reminder. */
  couponDelayMin: number;
  /** Wash canvas bags every N weeks (1–4). */
  washWeeks: number;
  /** Last time wash reminder fired (epoch ms). */
  washLastFiredAt?: number;
}

export const DEFAULT_REMINDERS: RemindersSettings = {
  enabled: true,
  secondaryDelayMin: 2,
  couponDelayMin: 6,
  washWeeks: 2,
};
