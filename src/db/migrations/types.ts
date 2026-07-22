import { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  /** Strictly increasing, never reused. */
  version: number;
  name: string;
  up(db: SQLiteDatabase): Promise<void>;
}
