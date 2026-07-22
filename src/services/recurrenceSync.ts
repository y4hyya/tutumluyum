/**
 * Recomputes recurring-payment findings from the full transaction history
 * and syncs them into recurring_groups (statuses the user already set are
 * preserved by the repo). Run after every import, delete and recategorize.
 */
import { matchMerchant, MerchantMatcher } from '@/analysis/categorize';
import { detectRecurring, RecurrenceInput } from '@/analysis/recurrence';
import { loadMerchantMatchers } from '@/db/repos/merchants';
import { latestStatement } from '@/db/repos/statements';
import { allForRecurrence } from '@/db/repos/transactions';
import { syncRecurringGroups } from '@/db/repos/recurring';

export async function toMatchers(): Promise<MerchantMatcher[]> {
  const rows = await loadMerchantMatchers();
  return rows.map((r) => ({
    pattern: r.pattern,
    displayName: r.display_name,
    categoryKey: r.category_key,
    isSubscription: r.is_subscription === 1,
    isUserDefined: r.is_user_defined === 1,
  }));
}

export async function recomputeRecurrence(): Promise<void> {
  const [rows, matchers, latest] = await Promise.all([
    allForRecurrence(),
    toMatchers(),
    latestStatement(),
  ]);

  const dataEnd = latest?.statement_date ?? new Date().toISOString().slice(0, 10);

  const inputs: RecurrenceInput[] = rows.map((r) => {
    const match = matchMerchant(r.merchant_key, matchers);
    return {
      merchantKey: r.merchant_key,
      displayName: match?.displayName ?? r.merchant_key,
      date: r.txn_date,
      amount: r.amount,
      statementId: r.statement_id,
      isInstallment: r.installment_no !== null,
      isKnownSubscription: match?.isSubscription ?? false,
    };
  });

  const findings = detectRecurring(inputs, dataEnd);

  // The findings' groupKey (merchantKey@band) is the stable identity stored
  // in recurring_groups.merchant_key.
  await syncRecurringGroups(
    findings.map((f) => ({
      merchantKey: f.groupKey,
      displayName: f.displayName,
      cadence: f.cadence,
      avgAmount: f.avgAmount,
      occurrenceCount: f.occurrences,
      firstSeen: f.firstSeen,
      lastSeen: f.lastSeen,
      totalPaid: f.totalPaid,
      confidence: f.confidence,
      isActive: f.isActive,
    })),
  );
}
