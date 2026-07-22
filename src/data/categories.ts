/**
 * The fixed category set. Keys are stable identifiers (used in code and DB),
 * labels are the Turkish UI strings, colors are flat chart fills.
 */
export const CATEGORY_KEYS = [
  'market',
  'yeme-icme',
  'ulasim',
  'akaryakit',
  'abonelik',
  'fatura',
  'giyim',
  'saglik',
  'eglence',
  'seyahat',
  'nakit-avans',
  'diger',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface CategorySeed {
  key: CategoryKey;
  labelTr: string;
  color: string;
}

export const CATEGORIES: CategorySeed[] = [
  { key: 'market', labelTr: 'Market', color: '#00B37E' },
  { key: 'yeme-icme', labelTr: 'Yeme-İçme', color: '#FF7A00' },
  { key: 'ulasim', labelTr: 'Ulaşım', color: '#0055FF' },
  { key: 'akaryakit', labelTr: 'Akaryakıt', color: '#B37400' },
  { key: 'abonelik', labelTr: 'Abonelik', color: '#FF3B00' },
  { key: 'fatura', labelTr: 'Fatura & Sigorta', color: '#7A00E6' },
  { key: 'giyim', labelTr: 'Giyim', color: '#F0006E' },
  { key: 'saglik', labelTr: 'Sağlık', color: '#00A5B3' },
  { key: 'eglence', labelTr: 'Eğlence & Kültür', color: '#8FB300' },
  { key: 'seyahat', labelTr: 'Seyahat', color: '#00C2FF' },
  { key: 'nakit-avans', labelTr: 'Nakit Avans', color: '#0A0A0A' },
  { key: 'diger', labelTr: 'Diğer', color: '#7A756B' },
];
