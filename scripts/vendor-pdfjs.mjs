/**
 * Copies the pinned pdfjs-dist classic builds into assets/pdfjs/.
 * Run after bumping the pdfjs-dist devDependency, then `npm run extractor:build`.
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'node_modules', 'pdfjs-dist');
const OUT = join(ROOT, 'assets', 'pdfjs');

const version = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).version;

mkdirSync(OUT, { recursive: true });
copyFileSync(join(SRC, 'build', 'pdf.min.js'), join(OUT, 'pdf.min.js'));
copyFileSync(join(SRC, 'build', 'pdf.worker.min.js'), join(OUT, 'pdf.worker.min.js'));

console.log(`vendored pdfjs-dist@${version} -> assets/pdfjs/`);
