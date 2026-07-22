import { matchMerchant, MerchantMatcher } from '../categorize';

const seed = (
  pattern: string,
  displayName: string,
  categoryKey: string,
  isSubscription = false,
): MerchantMatcher => ({ pattern, displayName, categoryKey, isSubscription, isUserDefined: false });

const MATCHERS: MerchantMatcher[] = [
  seed('SPOTIFY', 'Spotify', 'abonelik', true),
  seed('BIM', 'BİM', 'market'),
  seed('SOK', 'ŞOK', 'market'),
  seed('MIGROS YEMEK', 'Migros Yemek', 'yeme-icme'),
  seed('MIGROS', 'Migros', 'market'),
  seed('TRENDYOL YEMEK', 'Trendyol Yemek', 'yeme-icme'),
  seed('TRENDYOL', 'Trendyol', 'diger'),
  seed('APPLE COM BILL', 'Apple Servisleri', 'abonelik', true),
];

describe('matchMerchant', () => {
  it('matches by substring for long patterns', () => {
    expect(matchMerchant('SPOTIFY STOCKHOLM', MATCHERS)?.displayName).toBe('Spotify');
    expect(matchMerchant('MIGROS SANAL MARKET', MATCHERS)?.displayName).toBe('Migros');
  });

  it('prefers the longest pattern (Trendyol Yemek beats Trendyol)', () => {
    expect(matchMerchant('TRENDYOL YEMEK', MATCHERS)?.categoryKey).toBe('yeme-icme');
    expect(matchMerchant('TRENDYOL PAZARLAMA', MATCHERS)?.categoryKey).toBe('diger');
    expect(matchMerchant('MIGROS YEMEK ISTANBUL', MATCHERS)?.displayName).toBe('Migros Yemek');
  });

  it('short patterns match whole tokens only — BIM must not hit BIMEKS', () => {
    expect(matchMerchant('BIM A S MAGAZA', MATCHERS)?.displayName).toBe('BİM');
    expect(matchMerchant('BIMEKS BILGISAYAR', MATCHERS)).toBeNull();
    expect(matchMerchant('SOKAK LEZZETLERI', MATCHERS)).toBeNull();
    expect(matchMerchant('SOK MARKETLER', MATCHERS)?.displayName).toBe('ŞOK');
  });

  it('phrase patterns respect token boundaries', () => {
    expect(matchMerchant('APPLE COM BILL APPLE COM BIL', MATCHERS)?.isSubscription).toBe(true);
  });

  it('user-defined corrections win over seeds', () => {
    const withUser: MerchantMatcher[] = [
      ...MATCHERS,
      {
        pattern: 'SPOTIFY STOCKHOLM',
        displayName: 'Spotify (iş)',
        categoryKey: 'fatura',
        isSubscription: false,
        isUserDefined: true,
      },
    ];
    const match = matchMerchant('SPOTIFY STOCKHOLM', withUser);
    expect(match?.displayName).toBe('Spotify (iş)');
    expect(match?.categoryKey).toBe('fatura');
  });

  it('returns null for unknown merchants — no guessing', () => {
    expect(matchMerchant('MAHALLE BAKKALI MEHMET', MATCHERS)).toBeNull();
  });
});
