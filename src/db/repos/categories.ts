import { getDb } from '../index';
import { CategoryRow } from '../types';

export async function listCategories(): Promise<CategoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY id');
}

export async function categoryByKey(key: string): Promise<CategoryRow | null> {
  const db = await getDb();
  return db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE key = ?', [key]);
}
