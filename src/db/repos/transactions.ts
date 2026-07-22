import { Kurus } from '@/lib/money';

import { getDb } from '../index';
import { TransactionRow } from '../types';

export interface TransactionListItem extends TransactionRow {
  category_key: string | null;
  category_label: string | null;
  category_color: string | null;
}

export interface CategoryTotal {
  category_id: number | null;
  category_key: string;
  category_label: string;
  category_color: string;
  total: Kurus;
  count: number;
}

export interface TransactionFilter {
  statementId?: number;
  categoryId?: number;
  search?: string;
}

export async function listTransactions(filter: TransactionFilter = {}): Promise<TransactionListItem[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filter.statementId !== undefined) {
    where.push('t.statement_id = ?');
    params.push(filter.statementId);
  }
  if (filter.categoryId !== undefined) {
    where.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.search) {
    where.push('(t.raw_description LIKE ? OR t.merchant_key LIKE ?)');
    const like = `%${filter.search}%`;
    params.push(like, like);
  }

  return db.getAllAsync<TransactionListItem>(
    `SELECT t.*, c.key AS category_key, c.label_tr AS category_label, c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY t.txn_date DESC, t.id DESC`,
    params,
  );
}

/** Spending per category for one statement (refunds net out; only positive spend shown). */
export async function totalsByCategory(statementId: number): Promise<CategoryTotal[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryTotal>(
    `SELECT t.category_id,
            COALESCE(c.key, 'diger') AS category_key,
            COALESCE(c.label_tr, 'Diğer') AS category_label,
            COALESCE(c.color, '#7A756B') AS category_color,
            SUM(t.amount) AS total,
            COUNT(*) AS count
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.statement_id = ?
     GROUP BY t.category_id
     HAVING SUM(t.amount) > 0
     ORDER BY total DESC`,
    [statementId],
  );
}

/** Sum of all transaction amounts for a statement (spend minus refunds). */
export async function statementSpendTotal(statementId: number): Promise<Kurus> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: Kurus | null }>(
    'SELECT SUM(amount) AS total FROM transactions WHERE statement_id = ?',
    [statementId],
  );
  return row?.total ?? 0;
}

/**
 * Minimal fields for recurrence analysis, across ALL statements.
 * Joined with the statement so each occurrence knows its period.
 */
export interface RecurrenceSourceRow {
  merchant_key: string;
  raw_description: string;
  txn_date: string;
  amount: Kurus;
  statement_id: number;
  is_subscription_hint: number;
}

export async function allForRecurrence(): Promise<RecurrenceSourceRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecurrenceSourceRow>(
    `SELECT t.merchant_key, t.raw_description, t.txn_date, t.amount, t.statement_id,
            COALESCE((SELECT MAX(m.is_subscription) FROM merchants m
                      WHERE t.merchant_key LIKE '%' || m.pattern || '%'), 0) AS is_subscription_hint
     FROM transactions t
     WHERE t.amount > 0
     ORDER BY t.txn_date ASC`,
  );
}

/**
 * Recategorize every transaction with this merchant_key and remember the
 * correction in merchants (is_user_defined = 1) for future imports.
 */
export async function recategorizeMerchant(
  merchantKey: string,
  displayName: string,
  categoryId: number,
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO merchants (pattern, display_name, category_id, is_subscription, is_user_defined)
       VALUES (?, ?, ?, 0, 1)
       ON CONFLICT(pattern) DO UPDATE SET category_id = excluded.category_id, is_user_defined = 1`,
      [merchantKey, displayName, categoryId],
    );
    await db.runAsync('UPDATE transactions SET category_id = ? WHERE merchant_key = ?', [
      categoryId,
      merchantKey,
    ]);
  });
}
