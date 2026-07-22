/**
 * Guard: committed public fixtures must never contain data that looks like a
 * real card number (PAN), TCKN, IBAN or long spaced card groups. The
 * anonymizer replaces those with star/hash tokens; this test is the backstop
 * in case a fixture is ever hand-edited.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(__dirname, '..', '..', 'fixtures', 'public');

const LEAK_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: '16 contiguous digits (PAN)', pattern: /\d{16}/ },
  { name: 'spaced 4x4 card number', pattern: /\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}/ },
  { name: 'TCKN (11 digits, nonzero start)', pattern: /(?<!\d)[1-9]\d{10}(?!\d)/ },
  { name: 'IBAN with digits', pattern: /TR\d{24}/i },
  { name: '10+ digit run (account/reference)', pattern: /\d{10,}/ },
  // Stale pre-scrub fixture generations (e.g. iCloud "name 2.txt" conflict
  // copies) leaked these shapes once — never again:
  { name: 'spaced single-digit run (payment barcode)', pattern: /(?:\d ){10,}\d/ },
  { name: 'digits hugging a mask (bank-masked customer no)', pattern: /[1-9]\d*\*{3,}\d*[1-9]/ },
  { name: 'postal code + city line', pattern: /(?<!\d)\d{5} (?:ADANA|ANKARA|ISTANBUL|İSTANBUL|IZMIR|İZMİR)/ },
];

describe('fixtures/public privacy guard', () => {
  const files = existsSync(PUBLIC_DIR)
    ? readdirSync(PUBLIC_DIR).filter((f) => !f.startsWith('.'))
    : [];

  it('runs (fixture dir may be empty before the first anonymized statement)', () => {
    expect(Array.isArray(files)).toBe(true);
  });

  it.each(LEAK_PATTERNS)('no fixture contains $name', ({ pattern }) => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(join(PUBLIC_DIR, file), 'utf8');
      const match = pattern.exec(content);
      if (match) offenders.push(`${file}: …${match[0].slice(0, 24)}…`);
    }
    expect(offenders).toEqual([]);
  });
});
