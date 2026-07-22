import { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORIES } from '@/data/categories';

import { Migration } from './types';

/**
 * Initial schema. Categories are seeded here (a fixed set); merchants are
 * synced at startup from src/data/merchants.ts (a growing set) — see
 * src/db/seed.ts.
 */
export const migration001: Migration = {
  version: 1,
  name: 'initial',
  async up(db: SQLiteDatabase) {
    await db.execAsync(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        label_tr TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        is_subscription INTEGER NOT NULL DEFAULT 0,
        is_user_defined INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_code TEXT NOT NULL,
        card_last4 TEXT,
        statement_date TEXT,
        due_date TEXT,
        period_start TEXT,
        period_end TEXT,
        total_amount INTEGER,
        min_payment INTEGER,
        currency TEXT NOT NULL DEFAULT 'TRY',
        source_filename TEXT,
        status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'needs_review')),
        imported_at TEXT NOT NULL,
        UNIQUE (bank_code, card_last4, statement_date)
      );

      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        statement_id INTEGER NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
        txn_date TEXT NOT NULL,
        posting_date TEXT,
        raw_description TEXT NOT NULL,
        merchant_key TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'TRY',
        installment_no INTEGER,
        installment_total INTEGER,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_transactions_statement ON transactions(statement_id);
      CREATE INDEX idx_transactions_merchant ON transactions(merchant_key);
      CREATE INDEX idx_transactions_category ON transactions(category_id);

      CREATE TABLE unparsed_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        statement_id INTEGER NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
        page INTEGER NOT NULL,
        y REAL NOT NULL,
        raw_text TEXT NOT NULL,
        reason TEXT NOT NULL
      );
      CREATE INDEX idx_unparsed_statement ON unparsed_lines(statement_id);

      CREATE TABLE recurring_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'yearly')),
        avg_amount INTEGER NOT NULL,
        occurrence_count INTEGER NOT NULL,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        total_paid INTEGER NOT NULL,
        confidence REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'new'
          CHECK (status IN ('new', 'acknowledged', 'to_cancel', 'cancelled')),
        is_active INTEGER NOT NULL DEFAULT 1
      );
    `);

    for (const c of CATEGORIES) {
      await db.runAsync('INSERT INTO categories (key, label_tr, color) VALUES (?, ?, ?)', [
        c.key,
        c.labelTr,
        c.color,
      ]);
    }
  },
};
