/**
 * Builds the self-contained assets/pdfjs/extractor.html by inlining the
 * vendored pdf.js library and worker into extractor.template.html.
 * Run `npm run pdfjs:vendor` first if assets/pdfjs/*.js are missing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'pdfjs');

/** `</script` inside the inlined JS would terminate our <script> tag early.
 *  Escaping to `<\/script` is a no-op inside JS string literals. */
function scriptSafe(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

const template = readFileSync(join(DIR, 'extractor.template.html'), 'utf8');
const lib = scriptSafe(readFileSync(join(DIR, 'pdf.min.js'), 'utf8'));
const worker = scriptSafe(readFileSync(join(DIR, 'pdf.worker.min.js'), 'utf8'));

const html =
  '<!-- GENERATED FILE — edit extractor.template.html and run `npm run extractor:build` -->\n' +
  template.replace('/*__INLINE_PDFJS_LIB__*/', () => lib).replace('/*__INLINE_PDFJS_WORKER__*/', () => worker);

if (html.includes('__INLINE_PDFJS')) {
  throw new Error('Inline markers were not replaced — check extractor.template.html');
}

writeFileSync(join(DIR, 'extractor.html'), html);
console.log(`wrote assets/pdfjs/extractor.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
