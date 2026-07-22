/** 4px grid. Layouts are dense — prefer the small steps. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const borders = {
  /** Hairline row separators inside lists. */
  hair: 1,
  /** Standard border for every card, button, input and chart. */
  std: 2,
  /** Primary containers. */
  thick: 3,
} as const;

/**
 * Hard offset shadow: an absolutely positioned solid ink View shifted by
 * (+offset, +offset) behind the element. Soft/blurred/elevated shadows are
 * banned repo-wide — see src/__tests__/brutalism.test.ts.
 */
export const shadowOffset = 4;
