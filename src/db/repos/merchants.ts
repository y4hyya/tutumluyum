import { getDb } from '../index';
import { MerchantRow } from '../types';

export interface MerchantMatcherRow extends MerchantRow {
  category_key: string | null;
}

/** All merchants with category keys, for the in-memory matcher. */
export async function loadMerchantMatchers(): Promise<MerchantMatcherRow[]> {
  const db = await getDb();
  return db.getAllAsync<MerchantMatcherRow>(
    `SELECT m.*, c.key AS category_key
     FROM merchants m
     LEFT JOIN categories c ON c.id = m.category_id`,
  );
}
