import { normalizeMerchant } from '../normalize';

describe('normalizeMerchant', () => {
  it('uppercases and folds Turkish diacritics', () => {
    expect(normalizeMerchant('Kahve Dünyası')).toBe('KAHVE DUNYASI');
    expect(normalizeMerchant('şok marketler')).toBe('SOK MARKETLER');
  });

  it('repairs the ?-for-İ PDF encoding artifact', () => {
    expect(normalizeMerchant('TRENDYOL YEMEK ?STANBUL TR')).toBe('TRENDYOL YEMEK');
  });

  it('strips trailing city and country suffixes', () => {
    expect(normalizeMerchant('ZARA KENTPARK AVM ANKARA TR')).toBe('ZARA KENTPARK AVM');
    expect(normalizeMerchant('APPLE.COM/BILL APPLE.COM/BIL IE')).toBe('APPLE COM BILL APPLE COM BIL');
    expect(normalizeMerchant('NIKE RETAIL TK BOLU TR')).toBe('NIKE RETAIL TK');
    expect(normalizeMerchant('AYT KAFE ADANA TR')).toBe('AYT KAFE');
  });

  it('strips per-charge reference hashes so subscriptions do not fragment', () => {
    // Real Spotify rows from two different months must produce ONE key.
    expect(normalizeMerchant('SPOTİFY P3EB0DDF0D STOCKHOLM SE')).toBe(
      normalizeMerchant('SPOTİFY STOCKHOLM SE'),
    );
    expect(normalizeMerchant('AIRBNB * HM9PDDN92X 800-621-2405 GB')).toBe('AIRBNB');
  });

  it('strips leading terminal ids and long digit runs', () => {
    expect(normalizeMerchant('6905 ANKARA CANKAYA ODT ANKARA TR')).toBe('ANKARA CANKAYA ODT');
    expect(normalizeMerchant('6011-272357 HESAPTAN AKTARIM 4229 İNTERAKTİF')).toBe(
      'HESAPTAN AKTARIM İNTERAKTİF'.replace('İ', 'I').replace('İ', 'I'),
    );
  });

  it('keeps short numbers that are part of the name', () => {
    expect(normalizeMerchant('KAFE 9 ANKARA TR')).toBe('KAFE 9');
    expect(normalizeMerchant('A101 YENI MAGAZA')).toBe('A101 YENI MAGAZA');
  });

  it('strips legal suffixes from the tail', () => {
    expect(normalizeMerchant('MARKET SPOR MLZ.SAN.LTD ANKARA TR')).toBe('MARKET SPOR MLZ');
  });

  it('collapses whitespace and punctuation', () => {
    expect(normalizeMerchant('  MOKA   UNITED/YEMEKSEPETI  ISTANBUL TR ')).toBe(
      'MOKA UNITED YEMEKSEPETI',
    );
  });

  it('never returns empty for digit-only descriptions', () => {
    expect(normalizeMerchant('123456789').length).toBeGreaterThan(0);
  });
});
