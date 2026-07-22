import { getDb } from '../index';
import { UnparsedLineRow } from '../types';

export async function listUnparsedLines(statementId: number): Promise<UnparsedLineRow[]> {
  const db = await getDb();
  return db.getAllAsync<UnparsedLineRow>(
    'SELECT * FROM unparsed_lines WHERE statement_id = ? ORDER BY page, y',
    [statementId],
  );
}
