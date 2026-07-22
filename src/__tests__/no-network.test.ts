/**
 * The core privacy promise, enforced: nothing in src/ may reference a
 * network primitive or a gradient library. Runs against the actual source
 * tree on every test run. (ESLint enforces the same rules live.)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(__dirname, '..');

const BANNED: { name: string; pattern: RegExp }[] = [
  { name: 'fetch()', pattern: /(?<![A-Za-z.])fetch\s*\(/ },
  { name: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
  { name: 'WebSocket', pattern: /(?<![A-Za-z])WebSocket/ },
  { name: 'EventSource', pattern: /(?<![A-Za-z])EventSource/ },
  { name: 'axios', pattern: /['"]axios['"]/ },
  { name: 'expo-linear-gradient', pattern: /expo-linear-gradient/ },
  { name: 'react-native-linear-gradient', pattern: /react-native-linear-gradient/ },
  { name: 'http(s) URL', pattern: /https?:\/\// },
];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('no network, no gradients — 100% on-device', () => {
  const files = walk(SRC_DIR);

  it('scans a non-trivial source tree', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(BANNED)('src/ contains no $name', ({ pattern }) => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) offenders.push(file.replace(SRC_DIR, 'src'));
    }
    expect(offenders).toEqual([]);
  });
});
