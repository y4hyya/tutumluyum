/**
 * Two families only, bundled in assets/fonts and loaded in the root layout:
 * - Archivo Black for headings and buttons (uppercase, tight tracking)
 * - Space Mono for everything else — all numbers/amounts MUST use it so
 *   money columns align (tabular by nature of the monospace).
 */
export const fonts = {
  heading: 'ArchivoBlack',
  mono: 'SpaceMono',
  monoBold: 'SpaceMonoBold',
} as const;

export const fontFiles = {
  [fonts.heading]: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  [fonts.mono]: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  [fonts.monoBold]: require('../../assets/fonts/SpaceMono-Bold.ttf'),
};

export const fontSizes = {
  /** Hero numbers (total paid, month total). */
  display: 48,
  big: 40,
  h1: 26,
  h2: 20,
  h3: 16,
  body: 14,
  small: 12,
  /** Section labels: uppercase, letterSpacing 1.5. */
  label: 11,
  tiny: 10,
} as const;

export const letterSpacing = {
  heading: -0.5,
  label: 1.5,
} as const;
