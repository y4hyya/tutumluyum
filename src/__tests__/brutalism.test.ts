/**
 * Design-system guard: the neo-brutalist hard rules, enforced in CI.
 * No rounded corners, no blur/soft shadows, no elevation, no gradients,
 * no alpha fades — anywhere in src/.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(__dirname, '..');

const BANNED: { name: string; pattern: RegExp }[] = [
  { name: 'non-zero borderRadius', pattern: /borderRadius:\s*(?!0[,\s}])[1-9]/ },
  { name: 'shadowRadius (blur shadow)', pattern: /shadowRadius/ },
  { name: 'shadowOpacity', pattern: /shadowOpacity/ },
  { name: 'elevation', pattern: /elevation:\s*[1-9]/ },
  { name: 'LinearGradient', pattern: /LinearGradient/ },
  { name: 'BlurView', pattern: /BlurView/ },
  { name: 'rgba() alpha color', pattern: /rgba\(/ },
  { name: 'hex color with alpha channel', pattern: /'#[0-9a-fA-F]{8}'/ },
  { name: 'fractional opacity (fade)', pattern: /opacity:\s*0?\.\d/ },
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

describe('neo-brutalist hard rules', () => {
  const files = walk(SRC_DIR);

  it.each(BANNED)('src/ contains no $name', ({ pattern }) => {
    const offenders: string[] = [];
    for (const file of files) {
      if (pattern.test(readFileSync(file, 'utf8'))) {
        offenders.push(file.replace(SRC_DIR, 'src'));
      }
    }
    expect(offenders).toEqual([]);
  });
});
