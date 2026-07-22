import { reconcile } from '../reconcile';

describe('reconcile', () => {
  it('passes when the sum matches the printed total exactly', () => {
    const result = reconcile([{ amount: 10000 }, { amount: 4999 }, { amount: -2000 }], 12999);
    expect(result.ok).toBe(true);
    expect(result.deltaKurus).toBe(0);
  });

  it('tolerates a single kuruş of rounding by default', () => {
    expect(reconcile([{ amount: 10000 }], 10001).ok).toBe(true);
    expect(reconcile([{ amount: 10000 }], 10002).ok).toBe(false);
  });

  it('fails with mismatch details when lines are missing', () => {
    const result = reconcile([{ amount: 10000 }], 15000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('mismatch');
    expect(result.deltaKurus).toBe(-5000);
    expect(result.expectedTotal).toBe(15000);
    expect(result.computedTotal).toBe(10000);
  });

  it('fails when the printed total was not found — never silently passes', () => {
    const result = reconcile([{ amount: 10000 }], null);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing-expected-total');
  });

  it('handles the empty statement edge', () => {
    expect(reconcile([], 0).ok).toBe(true);
    expect(reconcile([], null).ok).toBe(false);
  });
});
