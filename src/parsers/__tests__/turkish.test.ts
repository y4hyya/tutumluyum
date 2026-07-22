import {
  foldTurkish,
  parseInstallment,
  parseTurkishAmount,
  parseTurkishDate,
  parseTurkishLongDate,
} from '../turkish';

describe('parseTurkishAmount', () => {
  it('parses plain Turkish amounts to kuruş', () => {
    expect(parseTurkishAmount('1.234,56')).toBe(123456);
    expect(parseTurkishAmount('149,99')).toBe(14999);
    expect(parseTurkishAmount('0,00')).toBe(0);
    expect(parseTurkishAmount('1.234.567,89')).toBe(123456789);
    expect(parseTurkishAmount('1234,56')).toBe(123456);
  });

  it('accepts currency decorations', () => {
    expect(parseTurkishAmount('1.234,56 TL')).toBe(123456);
    expect(parseTurkishAmount('₺149,99')).toBe(14999);
    expect(parseTurkishAmount('1.234,56 TRY')).toBe(123456);
  });

  it('handles all negative notations', () => {
    expect(parseTurkishAmount('-1.234,56')).toBe(-123456);
    expect(parseTurkishAmount('1.234,56-')).toBe(-123456);
    expect(parseTurkishAmount('(1.234,56)')).toBe(-123456);
    expect(parseTurkishAmount('-349,90 TL')).toBe(-34990);
    expect(parseTurkishAmount('349,90 TL-')).toBe(-34990);
  });

  it('accepts an explicit plus sign', () => {
    expect(parseTurkishAmount('+150,00')).toBe(15000);
  });

  it('returns null for anything non-strict (never guesses)', () => {
    expect(parseTurkishAmount('')).toBeNull();
    expect(parseTurkishAmount('abc')).toBeNull();
    expect(parseTurkishAmount('1,234.56')).toBeNull(); // US format
    expect(parseTurkishAmount('12,3')).toBeNull(); // one decimal
    expect(parseTurkishAmount('1.234')).toBeNull(); // no decimals: ambiguous
    expect(parseTurkishAmount('1.23,45')).toBeNull(); // broken grouping
    expect(parseTurkishAmount('12.34')).toBeNull(); // dot decimal
    expect(parseTurkishAmount('1.2345,00')).toBeNull();
  });

  it('is exact for float-hostile values', () => {
    expect(parseTurkishAmount('0,10')).toBe(10);
    expect(parseTurkishAmount('0,29')).toBe(29);
    expect(parseTurkishAmount('999.999.999,99')).toBe(99999999999);
  });
});

describe('parseTurkishDate', () => {
  it('parses dd.MM.yyyy and friends', () => {
    expect(parseTurkishDate('15.06.2026')).toBe('2026-06-15');
    expect(parseTurkishDate('15/06/2026')).toBe('2026-06-15');
    expect(parseTurkishDate('15-06-2026')).toBe('2026-06-15');
    expect(parseTurkishDate('1.6.2026')).toBe('2026-06-01');
  });

  it('expands two-digit years to 20xx', () => {
    expect(parseTurkishDate('15.06.26')).toBe('2026-06-15');
  });

  it('rejects impossible dates and junk', () => {
    expect(parseTurkishDate('32.01.2026')).toBeNull();
    expect(parseTurkishDate('30.02.2026')).toBeNull();
    expect(parseTurkishDate('2026-06-15')).toBeNull();
    expect(parseTurkishDate('Haziran')).toBeNull();
  });
});

describe('parseTurkishLongDate', () => {
  it('parses month-name dates with Turkish characters', () => {
    expect(parseTurkishLongDate('15 Haziran 2026')).toBe('2026-06-15');
    expect(parseTurkishLongDate('3 Ağustos 2026')).toBe('2026-08-03');
    expect(parseTurkishLongDate('1 EYLÜL 2026')).toBe('2026-09-01');
    expect(parseTurkishLongDate('28 Şubat 2026')).toBe('2026-02-28');
  });

  it('rejects unknown months and impossible days', () => {
    expect(parseTurkishLongDate('15 Brumaire 2026')).toBeNull();
    expect(parseTurkishLongDate('31 Nisan 2026')).toBeNull();
  });
});

describe('foldTurkish', () => {
  it('folds diacritics with Turkish casing rules', () => {
    expect(foldTurkish('İş Bankası')).toBe('IS BANKASI');
    expect(foldTurkish('ŞOK Marketler ığüşöç')).toBe('SOK MARKETLER IGUSOC');
  });
});

describe('parseInstallment', () => {
  it('parses installment notations', () => {
    expect(parseInstallment('3/6')).toEqual({ no: 3, total: 6 });
    expect(parseInstallment('03/06')).toEqual({ no: 3, total: 6 });
    expect(parseInstallment('1-12')).toEqual({ no: 1, total: 12 });
  });

  it('rejects impossible installments', () => {
    expect(parseInstallment('7/6')).toBeNull();
    expect(parseInstallment('0/6')).toBeNull();
    expect(parseInstallment('1/1')).toBeNull();
    expect(parseInstallment('abc')).toBeNull();
  });
});
