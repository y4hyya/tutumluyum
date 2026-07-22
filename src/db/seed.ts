import { SQLiteDatabase } from 'expo-sqlite';

import { MERCHANT_SEEDS } from '@/data/merchants';

/**
 * Sync the merchant knowledge base into the DB. Idempotent: INSERT OR IGNORE
 * on the unique pattern, so user-defined rows and past seeds are never
 * clobbered. New seeds added in app updates flow in on next launch.
 */
export async function seedMerchants(db: SQLiteDatabase): Promise<void> {
  const categories = await db.getAllAsync<{ id: number; key: string }>(
    'SELECT id, key FROM categories',
  );
  const idByKey = new Map(categories.map((c) => [c.key, c.id]));

  await db.withTransactionAsync(async () => {
    for (const seed of MERCHANT_SEEDS) {
      const categoryId = idByKey.get(seed.category);
      if (categoryId === undefined) {
        throw new Error(`Merchant seed "${seed.displayName}" references unknown category "${seed.category}"`);
      }
      for (const pattern of seed.patterns) {
        await db.runAsync(
          `INSERT OR IGNORE INTO merchants (pattern, display_name, category_id, is_subscription, is_user_defined)
           VALUES (?, ?, ?, ?, 0)`,
          [pattern, seed.displayName, categoryId, seed.subscription ? 1 : 0],
        );
      }
    }
  });
}
