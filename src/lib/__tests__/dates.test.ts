import {
  addDays,
  daysBetween,
  formatDate,
  formatLongDate,
  formatMonthYear,
  isIsoDate,
  monthKey,
} from '../dates';

describe('isIsoDate', () => {
  it('accepts valid dates', () => {
    expect(isIsoDate('2026-06-15')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects invalid dates and formats', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('15.06.2026')).toBe(false);
    expect(isIsoDate('2026-6-15')).toBe(false);
  });
});

describe('formatting', () => {
  it('formats dd.MM.yyyy', () => {
    expect(formatDate('2026-06-15')).toBe('15.06.2026');
  });

  it('formats Turkish month names', () => {
    expect(formatMonthYear('2026-06-15')).toBe('Haziran 2026');
    expect(formatMonthYear('2026-01-01')).toBe('Ocak 2026');
    expect(formatLongDate('2026-08-03')).toBe('3 Ağustos 2026');
  });
});

describe('day math', () => {
  it('computes day differences', () => {
    expect(daysBetween('2026-06-15', '2026-07-15')).toBe(30);
    expect(daysBetween('2026-07-15', '2026-06-15')).toBe(-30);
  });

  it('crosses DST boundaries without drift (pure UTC math)', () => {
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-10-01', '2026-11-01')).toBe(31);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-06-15', 30)).toBe('2026-07-15');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('monthKey', () => {
  it('buckets by month', () => {
    expect(monthKey('2026-06-15')).toBe('2026-06');
  });
});
