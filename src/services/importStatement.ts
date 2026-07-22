/**
 * The end-to-end import pipeline: PDF -> positioned text -> bank adapter ->
 * normalize/categorize -> SQLite -> recurrence recompute. 100% on-device.
 */
import { matchMerchant } from '@/analysis/categorize';
import { normalizeMerchant } from '@/analysis/normalize';
import { listCategories } from '@/db/repos/categories';
import { insertStatement, statementExists } from '@/db/repos/statements';
import { extractText } from '@/pdf/extractText';
import { reconcileStatement, ReconcileResult } from '@/parsers/reconcile';
import { requireAdapter } from '@/parsers/registry';
// Adapter registration side effect:
import '@/parsers';

import { recomputeRecurrence, toMatchers } from './recurrenceSync';

export class DuplicateStatementError extends Error {
  constructor(readonly bankName: string) {
    super('Statement already imported');
    this.name = 'DuplicateStatementError';
  }
}

export interface ImportResult {
  statementId: number;
  bankName: string;
  statementDate: string | null;
  transactionCount: number;
  unparsedCount: number;
  reconcile: ReconcileResult;
  needsReview: boolean;
}

/**
 * Imports one statement PDF. Throws:
 * PasswordRequiredError | WrongPasswordError | PdfParseError |
 * ExtractionTimeoutError | UnsupportedBankError | DuplicateStatementError
 */
export async function importStatement(
  uri: string,
  filename: string | null,
  password?: string,
): Promise<ImportResult> {
  const items = await extractText(uri, password);

  const adapter = requireAdapter(items);
  const parsed = adapter.parse(items);

  if (await statementExists(adapter.code, parsed.cardLast4, parsed.statementDate)) {
    throw new DuplicateStatementError(adapter.displayName);
  }

  const reconcile = reconcileStatement(parsed);
  const needsReview = !reconcile.ok || parsed.unparsedLines.length > 0;

  const [matchers, categories] = await Promise.all([toMatchers(), listCategories()]);
  const categoryIdByKey = new Map(categories.map((c) => [c.key, c.id]));
  const fallbackCategoryId = categoryIdByKey.get('diger') ?? null;

  const statementId = await insertStatement({
    bankCode: adapter.code,
    cardLast4: parsed.cardLast4,
    statementDate: parsed.statementDate,
    dueDate: parsed.dueDate,
    periodStart: parsed.periodStart,
    periodEnd: parsed.periodEnd,
    totalAmount: parsed.totalAmount,
    minPayment: parsed.minPayment,
    currency: parsed.currency,
    sourceFilename: filename,
    status: needsReview ? 'needs_review' : 'ok',
    transactions: parsed.transactions.map((t) => {
      const merchantKey = normalizeMerchant(t.rawDescription);
      const match = matchMerchant(merchantKey, matchers);
      const categoryId =
        match?.categoryKey != null
          ? (categoryIdByKey.get(match.categoryKey) ?? fallbackCategoryId)
          : fallbackCategoryId;
      return {
        txnDate: t.txnDate,
        postingDate: t.postingDate ?? null,
        rawDescription: t.rawDescription,
        merchantKey,
        amount: t.amount,
        currency: t.currency,
        installmentNo: t.installmentNo ?? null,
        installmentTotal: t.installmentTotal ?? null,
        categoryId,
      };
    }),
    unparsedLines: parsed.unparsedLines.map((u) => ({
      page: u.page,
      y: u.y,
      rawText: u.rawText,
      reason: u.reason,
    })),
  });

  await recomputeRecurrence();

  return {
    statementId,
    bankName: adapter.displayName,
    statementDate: parsed.statementDate,
    transactionCount: parsed.transactions.length,
    unparsedCount: parsed.unparsedLines.length,
    reconcile,
    needsReview,
  };
}
