/**
 * The golden-rule check: parsed transactions must sum to the total printed
 * on the statement. A statement that does not reconcile is imported as
 * needs_review and the user sees exactly what was not understood.
 */
import { Kurus, sumKurus } from '@/lib/money';

import { ParsedStatement } from './types';

export type ReconcileFailure = 'missing-expected-total' | 'mismatch';

export interface ReconcileResult {
  ok: boolean;
  reason?: ReconcileFailure;
  /** Sum of parsed transaction amounts (spend positive, refunds negative). */
  computedTotal: Kurus;
  /** The total printed on the PDF, if the parser found it. */
  expectedTotal: Kurus | null;
  /** computed - expected (0 when ok). */
  deltaKurus: Kurus;
}

export function reconcile(
  transactions: { amount: Kurus }[],
  expectedTotal: Kurus | null,
  toleranceKurus: Kurus = 1,
): ReconcileResult {
  const computedTotal = sumKurus(transactions.map((t) => t.amount));

  if (expectedTotal === null) {
    return {
      ok: false,
      reason: 'missing-expected-total',
      computedTotal,
      expectedTotal: null,
      deltaKurus: computedTotal,
    };
  }

  const deltaKurus = computedTotal - expectedTotal;
  if (Math.abs(deltaKurus) > toleranceKurus) {
    return { ok: false, reason: 'mismatch', computedTotal, expectedTotal, deltaKurus };
  }
  return { ok: true, computedTotal, expectedTotal, deltaKurus };
}

/**
 * Reconcile a full ParsedStatement. The printed total includes the carry-over
 * from the previous statement, so the target for Σ(transactions) is
 * totalAmount - previousBalance.
 */
export function reconcileStatement(parsed: ParsedStatement, toleranceKurus: Kurus = 1): ReconcileResult {
  const expected =
    parsed.totalAmount === null ? null : parsed.totalAmount - (parsed.previousBalance ?? 0);
  return reconcile(parsed.transactions, expected, toleranceKurus);
}
