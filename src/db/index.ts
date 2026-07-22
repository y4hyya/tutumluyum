import * as SQLite from 'expo-sqlite';

import { migrate } from './migrate';
import { seedMerchants } from './seed';

const DB_NAME = 'tutumluyum.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  await seedMerchants(db);
  return db;
}

/** Lazily opened, migrated and seeded singleton. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/**
 * "Verilerimi sil": closes and deletes the database file, then reopens a
 * fresh, empty, migrated database.
 */
export async function wipeAllData(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
  await getDb();
}
