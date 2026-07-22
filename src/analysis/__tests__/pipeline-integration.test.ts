/**
 * End-to-end: six REAL (anonymized) İş Bankası months through the full
 * pipeline — parse -> normalize -> categorize -> detectRecurring. This is
 * the product promise executed against the fixtures, so regressions in any
 * layer surface here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MERCHANT_SEEDS } from '@/data/merchants';
import { isbankAdapter } from '@/parsers/isbank';
import { TextItem } from '@/pdf/types';

import { matchMerchant, MerchantMatcher } from '../categorize';
import { normalizeMerchant } from '../normalize';
import { detectRecurring, RecurrenceInput, RecurringFinding } from '../recurrence';

const PUBLIC_DIR = join(__dirname, '..', '..', '..', 'fixtures', 'public');
const MONTHS = [
  'isbank-2026-02',
  'isbank-2026-03',
  'isbank-2026-04',
  'isbank-2026-05',
  'isbank-2026-06',
  'isbank-2026-07',
];

function loadFindings(): { findings: RecurringFinding[]; inputs: RecurrenceInput[] } {
  const matchers: MerchantMatcher[] = MERCHANT_SEEDS.flatMap((s) =>
    s.patterns.map((pattern) => ({
      pattern,
      displayName: s.displayName,
      categoryKey: s.category,
      isSubscription: s.subscription ?? false,
      isUserDefined: false,
    })),
  );

  const inputs: RecurrenceInput[] = [];
  let dataEnd = '2000-01-01';
  MONTHS.forEach((name, index) => {
    const items = readFileSync(join(PUBLIC_DIR, `${name}.txt`), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as TextItem);
    const parsed = isbankAdapter.parse(items);
    if (parsed.statementDate && parsed.statementDate > dataEnd) dataEnd = parsed.statementDate;
    for (const t of parsed.transactions) {
      if (t.amount <= 0) continue;
      const merchantKey = normalizeMerchant(t.rawDescription);
      const match = matchMerchant(merchantKey, matchers);
      inputs.push({
        merchantKey,
        displayName: match?.displayName ?? merchantKey,
        date: t.txnDate,
        amount: t.amount,
        statementId: index + 1,
        isInstallment: t.installmentNo !== null,
        isKnownSubscription: match?.isSubscription ?? false,
      });
    }
  });

  return { findings: detectRecurring(inputs, dataEnd), inputs };
}

describe('full pipeline over six real months', () => {
  const { findings, inputs } = loadFindings();

  it('processes a substantial number of spend rows', () => {
    expect(inputs.length).toBeGreaterThan(300);
  });

  it('finds the Spotify subscription — the product pitch, on real data', () => {
    const spotify = findings.find((f) => f.displayName === 'Spotify');
    expect(spotify).toBeDefined();
    expect(spotify!.cadence).toBe('monthly');
    expect(spotify!.occurrences).toBe(6);
    expect(spotify!.avgAmount).toBe(5500);
    expect(spotify!.totalPaid).toBe(33000);
    expect(spotify!.isActive).toBe(true);
    expect(spotify!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('separates Apple into distinct amount bands instead of averaging them', () => {
    const apple = findings.filter((f) => f.displayName === 'Apple Servisleri');
    expect(apple.length).toBeGreaterThanOrEqual(2);
    const amounts = apple.map((f) => f.avgAmount).sort((a, b) => a - b);
    expect(amounts).toContain(21999);
    expect(amounts).toContain(199999);
  });

  it('does not flag the NIKE installment purchase as a subscription', () => {
    expect(findings.find((f) => f.merchantKey.includes('NIKE'))).toBeUndefined();
  });

  it('does not flag account payments or one-off purchases', () => {
    expect(findings.find((f) => f.merchantKey.includes('AKTARIM'))).toBeUndefined();
    expect(findings.find((f) => f.merchantKey.includes('AIRBNB'))).toBeUndefined();
    expect(findings.find((f) => f.merchantKey.includes('ZARA'))).toBeUndefined();
  });

  it('every finding carries the cumulative-total headline data', () => {
    for (const f of findings) {
      expect(f.totalPaid).toBeGreaterThanOrEqual(f.avgAmount * 2 * 0.85);
      expect(f.monthsActive).toBeGreaterThanOrEqual(1);
      expect(f.expectedNext > f.lastSeen).toBe(true);
    }
    // Sorted by money already spent.
    const totals = findings.map((f) => f.totalPaid);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });
});
