import { detectRecurring, RecurrenceInput } from '../recurrence';

let nextStatement = 1;

/** Builds one charge; statementId defaults to a fresh period per call. */
function charge(
  merchantKey: string,
  date: string,
  amount: number,
  extra: Partial<RecurrenceInput> = {},
): RecurrenceInput {
  return {
    merchantKey,
    displayName: merchantKey,
    date,
    amount,
    statementId: extra.statementId ?? nextStatement++,
    ...extra,
  };
}

beforeEach(() => {
  nextStatement = 1;
});

const DATA_END = '2026-08-10';

describe('detectRecurring', () => {
  it('flags a clean monthly subscription with the cumulative total as headline', () => {
    // The pitch example: Spotify ₺149,99 for 7 months = ₺1.049,93 total.
    const rows = [
      charge('SPOTIFY STOCKHOLM', '2026-01-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-02-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-03-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-04-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-05-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-06-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-07-24', 14999),
    ];
    const findings = detectRecurring(rows, DATA_END);

    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.cadence).toBe('monthly');
    expect(f.occurrences).toBe(7);
    expect(f.totalPaid).toBe(104993);
    expect(f.avgAmount).toBe(14999);
    expect(f.monthsActive).toBe(7);
    expect(f.confidence).toBeGreaterThanOrEqual(0.75);
    expect(f.isActive).toBe(true);
    expect(f.expectedNext > f.lastSeen).toBe(true);
  });

  it('tolerates FX drift within ±15% (foreign-currency subscription)', () => {
    const rows = [
      charge('NETFLIX COM', '2026-03-05', 4590),
      charge('NETFLIX COM', '2026-04-05', 4720),
      charge('NETFLIX COM', '2026-05-05', 4890),
      charge('NETFLIX COM', '2026-06-05', 5100),
    ];
    const findings = detectRecurring(rows, DATA_END);

    expect(findings).toHaveLength(1);
    expect(findings[0].cadence).toBe('monthly');
    expect(findings[0].occurrences).toBe(4);
    expect(findings[0].totalPaid).toBe(4590 + 4720 + 4890 + 5100);
  });

  it('detects a yearly subscription from two occurrences', () => {
    const rows = [
      charge('ADOBE SYSTEMS', '2025-07-15', 70000),
      charge('ADOBE SYSTEMS', '2026-07-14', 70000),
    ];
    const findings = detectRecurring(rows, DATA_END);

    expect(findings).toHaveLength(1);
    expect(findings[0].cadence).toBe('yearly');
    expect(findings[0].isActive).toBe(true);
  });

  it('does NOT flag weekly groceries at the same market (the false-positive trap)', () => {
    const rows = [
      charge('MIGROS', '2026-05-02', 84250, { statementId: 1 }),
      charge('MIGROS', '2026-05-06', 21999, { statementId: 1 }),
      charge('MIGROS', '2026-05-13', 156700, { statementId: 1 }),
      charge('MIGROS', '2026-05-19', 43210, { statementId: 2 }),
      charge('MIGROS', '2026-05-27', 92480, { statementId: 2 }),
      charge('MIGROS', '2026-06-03', 38900, { statementId: 2 }),
      charge('MIGROS', '2026-06-10', 121300, { statementId: 3 }),
      charge('MIGROS', '2026-06-17', 56750, { statementId: 3 }),
    ];
    expect(detectRecurring(rows, DATA_END)).toEqual([]);
  });

  it('does NOT flag suspiciously regular but variable-amount weekly spending', () => {
    // Exactly 7-day gaps, but amounts vary >10% — coffee runs, not a sub.
    const rows = [
      charge('KAHVECI', '2026-06-01', 15000),
      charge('KAHVECI', '2026-06-08', 18500),
      charge('KAHVECI', '2026-06-15', 12000),
      charge('KAHVECI', '2026-06-22', 16800),
      charge('KAHVECI', '2026-06-29', 14200),
    ];
    expect(detectRecurring(rows, DATA_END)).toEqual([]);
  });

  it('reports a cancelled subscription that stopped 3 months ago as inactive', () => {
    const rows = [
      charge('BLUTV', '2026-01-10', 9990),
      charge('BLUTV', '2026-02-10', 9990),
      charge('BLUTV', '2026-03-10', 9990),
      charge('BLUTV', '2026-04-10', 9990),
    ];
    const findings = detectRecurring(rows, '2026-08-10'); // 4 months after last charge

    expect(findings).toHaveLength(1);
    expect(findings[0].isActive).toBe(false);
    expect(findings[0].totalPaid).toBe(39960);
  });

  it('ignores a single one-off purchase', () => {
    expect(detectRecurring([charge('MEDIAMARKT', '2026-06-25', 1549900)], DATA_END)).toEqual([]);
  });

  it('ignores installment rows — a 3-month taksit is not a subscription', () => {
    // Real trap from the fixtures: NIKE 3.458,50 in 3 x 1.152,83.
    const rows = [
      charge('NIKE RETAIL TK', '2026-04-20', 115283, { isInstallment: true }),
      charge('NIKE RETAIL TK', '2026-05-20', 115283, { isInstallment: true }),
      charge('NIKE RETAIL TK', '2026-06-20', 115284, { isInstallment: true }),
    ];
    expect(detectRecurring(rows, DATA_END)).toEqual([]);
  });

  it('separates multiple subscriptions under one merchant by amount band', () => {
    // Apple: iCloud 17,99/month + unrelated one-off app purchases.
    const rows = [
      charge('APPLE COM BILL', '2026-02-14', 1799, { isKnownSubscription: true }),
      charge('APPLE COM BILL', '2026-03-14', 1799, { isKnownSubscription: true }),
      charge('APPLE COM BILL', '2026-04-14', 1799, { isKnownSubscription: true }),
      charge('APPLE COM BILL', '2026-05-14', 1799, { isKnownSubscription: true }),
      charge('APPLE COM BILL', '2026-03-02', 59999, { isKnownSubscription: true }),
      charge('APPLE COM BILL', '2026-06-08', 199999, { isKnownSubscription: true }),
    ];
    const findings = detectRecurring(rows, '2026-06-20');

    expect(findings).toHaveLength(1);
    expect(findings[0].avgAmount).toBe(1799);
    expect(findings[0].occurrences).toBe(4);
    expect(findings[0].totalPaid).toBe(4 * 1799);
  });

  it('requires occurrences in distinct statement periods', () => {
    const rows = [
      charge('SAHTE ABONELIK', '2026-06-01', 5000, { statementId: 7 }),
      charge('SAHTE ABONELIK', '2026-06-29', 5000, { statementId: 7 }),
    ];
    expect(detectRecurring(rows, DATA_END)).toEqual([]);
  });

  it('sorts findings by total paid, descending', () => {
    const rows = [
      charge('SPOTIFY STOCKHOLM', '2026-04-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-05-24', 14999),
      charge('SPOTIFY STOCKHOLM', '2026-06-24', 14999),
      charge('YOUTUBE PREMIUM', '2026-04-10', 7999),
      charge('YOUTUBE PREMIUM', '2026-05-10', 7999),
      charge('YOUTUBE PREMIUM', '2026-06-10', 7999),
      charge('NETFLIX COM', '2026-04-15', 22990),
      charge('NETFLIX COM', '2026-05-15', 22990),
      charge('NETFLIX COM', '2026-06-15', 22990),
    ];
    const findings = detectRecurring(rows, '2026-07-01');
    expect(findings.map((f) => f.merchantKey)).toEqual([
      'NETFLIX COM',
      'SPOTIFY STOCKHOLM',
      'YOUTUBE PREMIUM',
    ]);
  });

  it('known-subscription hint boosts confidence', () => {
    const base = [
      charge('GIZEMLI SERVIS', '2026-05-01', 9900),
      charge('GIZEMLI SERVIS', '2026-06-01', 9900),
    ];
    const hinted = base.map((r) => ({ ...r, isKnownSubscription: true }));
    const [plain] = detectRecurring(base, '2026-06-20');
    const [boosted] = detectRecurring(hinted, '2026-06-20');
    expect(boosted.confidence).toBeGreaterThan(plain.confidence);
  });
});
