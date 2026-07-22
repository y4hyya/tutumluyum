import { formatKurus, formatLira, sumKurus } from '../money';

describe('formatKurus', () => {
  it('formats zero', () => {
    expect(formatKurus(0)).toBe('0,00');
  });

  it('formats sub-lira amounts', () => {
    expect(formatKurus(5)).toBe('0,05');
    expect(formatKurus(99)).toBe('0,99');
  });

  it('formats without grouping under 1000 TL', () => {
    expect(formatKurus(14999)).toBe('149,99');
    expect(formatKurus(100000)).toBe('1.000,00');
  });

  it('groups thousands with dots (Turkish format)', () => {
    expect(formatKurus(123456)).toBe('1.234,56');
    expect(formatKurus(104993)).toBe('1.049,93');
    expect(formatKurus(123456789)).toBe('1.234.567,89');
  });

  it('formats negatives', () => {
    expect(formatKurus(-34990)).toBe('-349,90');
    expect(formatKurus(-123456)).toBe('-1.234,56');
  });

  it('rejects non-integers', () => {
    expect(() => formatKurus(12.5)).toThrow();
  });
});

describe('formatLira', () => {
  it('prefixes the symbol', () => {
    expect(formatLira(104993)).toBe('₺1.049,93');
  });

  it('puts the sign before the symbol', () => {
    expect(formatLira(-34990)).toBe('-₺349,90');
  });
});

describe('sumKurus', () => {
  it('sums integers exactly', () => {
    expect(sumKurus([14999, 14999, 1])).toBe(29999);
    expect(sumKurus([])).toBe(0);
  });

  it('rejects non-integer members', () => {
    expect(() => sumKurus([1, 0.5])).toThrow();
  });
});
