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
