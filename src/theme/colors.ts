/**
 * Flat, solid, opaque colors only. No gradients, no alpha fades, no blurs —
 * anywhere. These seven tokens are the entire palette of the app chrome;
 * category data colors live in src/data/categories.ts.
 */
export const colors = {
  /** Text, borders, everything structural. */
  ink: '#0A0A0A',
  /** App background. */
  paper: '#F5F2EA',
  /** Cards. */
  surface: '#FFFFFF',
  /** Electric yellow — highlights, selected state. */
  accent: '#E8FF00',
  /** Subscription warnings, overspend. */
  alert: '#FF3B00',
  /** Savings, dismissed findings. */
  positive: '#00B37E',
  /** Secondary text only. */
  muted: '#7A756B',
} as const;

export type ColorToken = keyof typeof colors;
