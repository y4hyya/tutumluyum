import { SQLiteDatabase } from 'expo-sqlite';

import { Migration } from './types';

/** Tiny key-value store for app flags (onboarding done, etc.). */
export const migration002: Migration = {
  version: 2,
  name: 'app_settings',
  async up(db: SQLiteDatabase) {
    await db.execAsync(`
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
};
