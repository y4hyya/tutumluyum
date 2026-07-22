import { Kurus } from '@/lib/money';

import { getDb } from '../index';
import { StatementRow, StatementStatus } from '../types';

export interface NewTransactionInput {
  txnDate: string;
  postingDate?: string | null;
  rawDescription: string;
  merchantKey: string;
  amount: Kurus;
  currency: string;
  installmentNo?: number | null;
  installmentTotal?: number | null;
  categoryId?: number | null;
}

export interface NewUnparsedLineInput {
  page: number;
  y: number;
  rawText: string;
  reason: string;
}

export interface NewStatementInput {
  bankCode: string;
  cardLast4?: string | null;
  statementDate?: string | null;
  dueDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalAmount?: Kurus | null;
  minPayment?: Kurus | null;
  currency?: string;
  sourceFilename?: string | null;
  status: StatementStatus;
  transactions: NewTransactionInput[];
  unparsedLines: NewUnparsedLineInput[];
}

export interface StatementListItem extends StatementRow {
  transaction_count: number;
  unparsed_count: number;
}

/** True if this exact statement (bank + card + cut date) was already imported. */
export async function statementExists(
  bankCode: string,
  cardLast4: string | null,
  statementDate: string | null,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM statements
     WHERE bank_code = ? AND card_last4 IS ? AND statement_date IS ?`,
    [bankCode, cardLast4, statementDate],
  );
  return row !== null;
}

/** Inserts the statement with all its rows in one transaction. Returns the id. */
export async function insertStatement(input: NewStatementInput): Promise<number> {
  const db = await getDb();
  let statementId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO statements
        (bank_code, card_last4, statement_date, due_date, period_start, period_end,
         total_amount, min_payment, currency, source_filename, status, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.bankCode,
        input.cardLast4 ?? null,
        input.statementDate ?? null,
        input.dueDate ?? null,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        input.totalAmount ?? null,
        input.minPayment ?? null,
        input.currency ?? 'TRY',
        input.sourceFilename ?? null,
        input.status,
        new Date().toISOString(),
      ],
    );
    statementId = result.lastInsertRowId;

    for (const t of input.transactions) {
      await db.runAsync(
        `INSERT INTO transactions
          (statement_id, txn_date, posting_date, raw_description, merchant_key,
           amount, currency, installment_no, installment_total, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          statementId,
          t.txnDate,
          t.postingDate ?? null,
          t.rawDescription,
          t.merchantKey,
          t.amount,
          t.currency,
          t.installmentNo ?? null,
          t.installmentTotal ?? null,
          t.categoryId ?? null,
        ],
      );
    }

    for (const u of input.unparsedLines) {
      await db.runAsync(
        `INSERT INTO unparsed_lines (statement_id, page, y, raw_text, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [statementId, u.page, u.y, u.rawText, u.reason],
      );
    }
  });

  return statementId;
}

export async function listStatements(): Promise<StatementListItem[]> {
  const db = await getDb();
  return db.getAllAsync<StatementListItem>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM transactions t WHERE t.statement_id = s.id) AS transaction_count,
       (SELECT COUNT(*) FROM unparsed_lines u WHERE u.statement_id = s.id) AS unparsed_count
     FROM statements s
     ORDER BY s.statement_date DESC, s.id DESC`,
  );
}

export async function getStatement(id: number): Promise<StatementListItem | null> {
  const db = await getDb();
  return db.getFirstAsync<StatementListItem>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM transactions t WHERE t.statement_id = s.id) AS transaction_count,
       (SELECT COUNT(*) FROM unparsed_lines u WHERE u.statement_id = s.id) AS unparsed_count
     FROM statements s WHERE s.id = ?`,
    [id],
  );
}

/** Latest statement by cut date (the dashboard's "current month"). */
export async function latestStatement(): Promise<StatementRow | null> {
  const db = await getDb();
  return db.getFirstAsync<StatementRow>(
    'SELECT * FROM statements ORDER BY statement_date DESC, id DESC LIMIT 1',
  );
}

/** Deletes the statement; transactions and unparsed lines cascade. */
export async function deleteStatement(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM statements WHERE id = ?', [id]);
}
