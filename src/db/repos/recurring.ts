import { Kurus } from '@/lib/money';

import { getDb } from '../index';
import { Cadence, RecurringGroupRow, RecurringStatus } from '../types';

export interface RecurringGroupInput {
  merchantKey: string;
  displayName: string;
  cadence: Cadence;
  avgAmount: Kurus;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  totalPaid: Kurus;
  confidence: number;
  isActive: boolean;
}

/**
 * Replace detection results while PRESERVING user decisions: existing rows
 * keep their status; rows no longer detected are removed; new rows arrive
 * as 'new'.
 */
export async function syncRecurringGroups(groups: RecurringGroupInput[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    if (groups.length === 0) {
      await db.runAsync('DELETE FROM recurring_groups');
      return;
    }
    const keys = groups.map((g) => g.merchantKey);
    const placeholders = keys.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM recurring_groups WHERE merchant_key NOT IN (${placeholders})`, keys);

    for (const g of groups) {
      await db.runAsync(
        `INSERT INTO recurring_groups
          (merchant_key, display_name, cadence, avg_amount, occurrence_count,
           first_seen, last_seen, total_paid, confidence, status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
         ON CONFLICT(merchant_key) DO UPDATE SET
           display_name = excluded.display_name,
           cadence = excluded.cadence,
           avg_amount = excluded.avg_amount,
           occurrence_count = excluded.occurrence_count,
           first_seen = excluded.first_seen,
           last_seen = excluded.last_seen,
           total_paid = excluded.total_paid,
           confidence = excluded.confidence,
           is_active = excluded.is_active`,
        [
          g.merchantKey,
          g.displayName,
          g.cadence,
          g.avgAmount,
          g.occurrenceCount,
          g.firstSeen,
          g.lastSeen,
          g.totalPaid,
          g.confidence,
          g.isActive ? 1 : 0,
        ],
      );
    }
  });
}

/** Findings sorted by cumulative money already spent — the headline metric. */
export async function listRecurringGroups(): Promise<RecurringGroupRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecurringGroupRow>(
    'SELECT * FROM recurring_groups ORDER BY total_paid DESC',
  );
}

export async function setRecurringStatus(id: number, status: RecurringStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recurring_groups SET status = ? WHERE id = ?', [status, id]);
}

export async function countActiveSubscriptions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM recurring_groups
     WHERE is_active = 1 AND status != 'cancelled'`,
  );
  return row?.n ?? 0;
}
