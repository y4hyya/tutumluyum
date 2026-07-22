import { reconcileStatement } from '../reconcile';
import { ParsedStatement } from '../types';

function statement(overrides: Partial<ParsedStatement>): ParsedStatement {
  return {
    bankCode: 'ISBANK',
    cardLast4: null,
    statementDate: null,
    dueDate: null,
    periodStart: null,
    periodEnd: null,
    totalAmount: null,
    previousBalance: null,
    minPayment: null,
    currency: 'TRY',
    transactions: [],
    unparsedLines: [],
    ...overrides,
  };
}

describe('reconcileStatement', () => {
  it('targets totalAmount minus previousBalance', () => {
    const parsed = statement({
      totalAmount: 916274,
      previousBalance: 410720,
      transactions: [{ txnDate: '2026-06-01', rawDescription: 'X', amount: 505554, currency: 'TRY' }],
    });
    expect(reconcileStatement(parsed)).toMatchObject({ ok: true, deltaKurus: 0 });
  });

  it('treats a credit (negative) previous balance correctly', () => {
    // April closed at +730,32 alacak -> May's target grows by that amount.
    const parsed = statement({
      totalAmount: 410720,
      previousBalance: -73032,
      transactions: [{ txnDate: '2026-05-01', rawDescription: 'X', amount: 483752, currency: 'TRY' }],
    });
    expect(reconcileStatement(parsed)).toMatchObject({ ok: true, deltaKurus: 0 });
  });

  it('fails without a printed total — never silently passes', () => {
    const parsed = statement({
      previousBalance: 100,
      transactions: [{ txnDate: '2026-05-01', rawDescription: 'X', amount: 100, currency: 'TRY' }],
    });
    expect(reconcileStatement(parsed)).toMatchObject({ ok: false, reason: 'missing-expected-total' });
  });

  it('treats a missing previous balance as zero', () => {
    const parsed = statement({
      totalAmount: 500,
      transactions: [{ txnDate: '2026-05-01', rawDescription: 'X', amount: 500, currency: 'TRY' }],
    });
    expect(reconcileStatement(parsed)).toMatchObject({ ok: true });
  });
});
