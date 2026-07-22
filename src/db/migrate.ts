import { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS } from './migrations';

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations',
  );
  const applied = new Set(appliedRows.map((r) => r.version));

  const pending = [...MIGRATIONS]
    .sort((a, b) => a.version - b.version)
    .filter((m) => !applied.has(m.version));

  for (const m of pending) {
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.runAsync('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        m.version,
        m.name,
        new Date().toISOString(),
      ]);
    });
  }
}
