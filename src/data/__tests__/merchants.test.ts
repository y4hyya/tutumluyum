import { CATEGORY_KEYS } from '../categories';
import { MERCHANT_SEEDS } from '../merchants';

describe('merchant seed data', () => {
  it('has at least 120 merchants', () => {
    expect(MERCHANT_SEEDS.length).toBeGreaterThanOrEqual(120);
  });

  it('every pattern is unique across all merchants', () => {
    const all = MERCHANT_SEEDS.flatMap((m) => m.patterns);
    const dupes = all.filter((p, i) => all.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it('patterns are already normalized (uppercase, no diacritics, no punctuation)', () => {
    for (const m of MERCHANT_SEEDS) {
      for (const p of m.patterns) {
        expect(p).toMatch(/^[A-Z0-9 ]+$/);
        expect(p).toBe(p.trim());
      }
    }
  });

  it('every category key is valid', () => {
    const valid = new Set<string>(CATEGORY_KEYS);
    for (const m of MERCHANT_SEEDS) {
      expect(valid.has(m.category)).toBe(true);
    }
  });

  it('flags the well-known subscription services', () => {
    const byName = (name: string) => MERCHANT_SEEDS.find((m) => m.displayName === name);
    for (const name of ['Spotify', 'Netflix', 'YouTube Premium', 'Apple Servisleri', 'Disney+']) {
      const seed = byName(name);
      expect(seed?.subscription).toBe(true);
      expect(seed?.category).toBe('abonelik');
    }
  });

  it('does not flag grocery chains as subscriptions', () => {
    for (const m of MERCHANT_SEEDS.filter((s) => s.category === 'market')) {
      expect(m.subscription ?? false).toBe(false);
    }
  });

  it('covers the mandated Turkish chains', () => {
    const names = new Set(MERCHANT_SEEDS.map((m) => m.displayName));
    for (const required of [
      'Migros',
      'BİM',
      'A101',
      'ŞOK',
      'CarrefourSA',
      'Opet',
      'Shell',
      'Petrol Ofisi',
      'Turkcell',
      'Vodafone',
      'Türk Telekom',
      'Getir',
      'Yemeksepeti',
      'Trendyol',
      'Hepsiburada',
    ]) {
      expect(names.has(required)).toBe(true);
    }
  });
});
