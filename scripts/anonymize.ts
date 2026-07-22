/**
 * Anonymizes a real bank statement PDF from fixtures/private/ into a
 * committable public fixture:
 *
 *   fixtures/public/<name>.txt          JSONL of anonymized positioned TextItems
 *   fixtures/public/<name>.readable.txt line-grouped text for human review
 *
 * Card numbers (PAN), TCKN, IBAN, phone numbers and long reference numbers
 * are replaced with STABLE fake tokens; merchant names, dates and amounts
 * stay intact so parser golden tests remain meaningful. Extra strings (the
 * cardholder name as printed, address lines) go into
 * fixtures/private/overrides.json:  { "scrub": ["NAME SURNAME", "..."] }
 *
 * Usage:
 *   npm run anonymize -- fixtures/private/statement.pdf --name isbank-01 [--password pw]
 *
 * Password resolution: --password, else fixtures/private/password.txt.
 *
 * ALWAYS review the .readable.txt output before committing.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { groupIntoLines } from '../src/parsers/lines';
import { TextItem } from '../src/pdf/types';

const PRIVATE_DIR = 'fixtures/private';
const PUBLIC_DIR = 'fixtures/public';

// ---------------------------------------------------------------------------
// pdf.js (legacy build works in plain Node; tsx runs this file as CJS)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

interface PdfJsTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
}

async function extractItems(pdfPath: string, password?: string): Promise<TextItem[]> {
  const data = new Uint8Array(readFileSync(pdfPath));
  const task = pdfjs.getDocument({
    data,
    password,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });
  const doc = await task.promise;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const items: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const raw of content.items as PdfJsTextItem[]) {
      if (typeof raw.str !== 'string' || raw.str.length === 0) continue;
      items.push({
        str: raw.str,
        x: round2(raw.transform[4]),
        y: round2(viewport.height - raw.transform[5]),
        width: round2(raw.width),
        height: round2(raw.height),
        pageIndex: p - 1,
        fontName: raw.fontName ?? '',
        pageWidth: round2(viewport.width),
        pageHeight: round2(viewport.height),
      });
    }
  }
  await doc.destroy();
  return items;
}

// ---------------------------------------------------------------------------
// anonymization

class Anonymizer {
  private readonly panMap = new Map<string, string>();
  private readonly scrubStrings: string[];
  readonly counts: Record<string, number> = {
    override: 0,
    iban: 0,
    pan: 0,
    maskedPan: 0,
    tckn: 0,
    phone: 0,
    longDigits: 0,
  };

  constructor(scrubStrings: string[]) {
    this.scrubStrings = scrubStrings;
  }

  private fakeLast4(original: string): string {
    let fake = this.panMap.get(original);
    if (!fake) {
      fake = String(1 + this.panMap.size).padStart(4, '0');
      this.panMap.set(original, fake);
    }
    return fake;
  }

  anonymize(input: string): string {
    let s = input;

    // 1. Explicit override strings (cardholder name, address…), whole tokens too.
    for (const scrub of this.scrubStrings) {
      const needles = [scrub, ...scrub.split(/\s+/).filter((t) => t.length >= 3)];
      for (const needle of needles) {
        const re = new RegExp(escapeRegExp(needle), 'gi');
        s = s.replace(re, (m) => {
          this.counts.override++;
          return 'X'.repeat(m.length);
        });
      }
    }

    // 2. IBAN: TR + 24 digits (with optional spacing) -> stars, TR kept.
    s = s.replace(/TR\d{2}(?:[ ]?\d{4}){5}[ ]?\d{2}/g, (m) => {
      this.counts.iban++;
      return m.replace(/\d/g, '*');
    });

    // 3. Full PAN (16 digits, optionally 4-4-4-4 grouped) -> masked fake with
    //    stable last4. Deliberately NOT 16 fake digits: the fixture guard
    //    rejects anything shaped like a full card number, fake or not.
    s = s.replace(/(?<!\d)\d{4}([ -]?)\d{4}\1\d{4}\1\d{4}(?!\d)/g, (m, sep: string) => {
      this.counts.pan++;
      return ['4242', '42**', '****', this.fakeLast4(m)].join(sep);
    });

    // 4. Masked PAN, digits-first (e.g. "540668******1234").
    s = s.replace(/(?<!\d)(\d{4,6})[ ]?([*Xx•]{2,}[ *Xx•]*)[ ]?(\d{2,4})(?!\d)/g, (m, _lead, mask: string, tail: string) => {
      this.counts.maskedPan++;
      return `424242 ${mask.trim()} ${this.fakeLast4(m).slice(-tail.length)}`;
    });

    // 5. Masked PAN, mask-first (e.g. "**** **** **** 1234").
    s = s.replace(/(?<!\d)((?:[*Xx•]{4}[ ]?){2,3})(\d{4})(?!\d)/g, (m, mask: string, _tail) => {
      this.counts.maskedPan++;
      return `${mask}${this.fakeLast4(m)}`;
    });

    // 6. TCKN (11 digits, first digit non-zero) -> stars.
    s = s.replace(/(?<!\d)[1-9]\d{10}(?!\d)/g, () => {
      this.counts.tckn++;
      return '*'.repeat(11);
    });

    // 7. Turkish mobile numbers -> stars, shape kept.
    s = s.replace(/(?<!\d)0?\s?\(?5\d{2}\)?[ ]?\d{3}[ ]?\d{2}[ ]?\d{2}(?!\d)/g, (m) => {
      this.counts.phone++;
      return m.replace(/\d/g, '*');
    });

    // 8. Any remaining long digit run (account/customer/reference numbers).
    //    Amounts (groups of <=3 + 2 decimals) and dates are never this long.
    s = s.replace(/\d{7,}/g, (m) => {
      this.counts.longDigits++;
      return '#'.repeat(m.length);
    });

    return s;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// CLI

interface Args {
  pdfPath: string;
  name: string;
  password?: string;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let name: string | undefined;
  let password: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name') name = argv[++i];
    else if (a === '--password') password = argv[++i];
    else positional.push(a);
  }

  let pdfPath = positional[0];
  if (!pdfPath) {
    const pdfs = existsSync(PRIVATE_DIR)
      ? readdirSync(PRIVATE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'))
      : [];
    if (pdfs.length === 1) {
      pdfPath = join(PRIVATE_DIR, pdfs[0]);
    } else {
      console.error(
        pdfs.length === 0
          ? `No PDF found in ${PRIVATE_DIR}/ — pass a path: npm run anonymize -- <pdf>`
          : `Multiple PDFs in ${PRIVATE_DIR}/ — pass one explicitly: npm run anonymize -- <pdf>`,
      );
      process.exit(1);
    }
  }

  if (!password) {
    const passwordFile = join(PRIVATE_DIR, 'password.txt');
    if (existsSync(passwordFile)) {
      password = readFileSync(passwordFile, 'utf8').trim() || undefined;
    }
  }

  return {
    pdfPath,
    name: name ?? basename(pdfPath).replace(/\.pdf$/i, ''),
    password,
  };
}

function loadScrubStrings(): string[] {
  const overridesFile = join(PRIVATE_DIR, 'overrides.json');
  if (!existsSync(overridesFile)) return [];
  const parsed = JSON.parse(readFileSync(overridesFile, 'utf8')) as { scrub?: unknown };
  if (!Array.isArray(parsed.scrub) || !parsed.scrub.every((s) => typeof s === 'string')) {
    throw new Error('fixtures/private/overrides.json must look like { "scrub": ["STRING", ...] }');
  }
  return parsed.scrub;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const scrub = loadScrubStrings();

  console.log(`Extracting ${args.pdfPath}${args.password ? ' (with password)' : ''} …`);
  let items: TextItem[];
  try {
    items = await extractItems(args.pdfPath, args.password);
  } catch (e) {
    const err = e as { name?: string; code?: number };
    if (err?.name === 'PasswordException') {
      console.error(
        err.code === 2
          ? 'Wrong password. Pass --password or fix fixtures/private/password.txt'
          : 'This PDF is password-protected. Pass --password or create fixtures/private/password.txt',
      );
      process.exit(1);
    }
    throw e;
  }

  const anonymizer = new Anonymizer(scrub);
  const anonymized = items
    .map((item) => ({ ...item, str: anonymizer.anonymize(item.str) }))
    .sort((a, b) => a.pageIndex - b.pageIndex || a.y - b.y || a.x - b.x);

  mkdirSync(PUBLIC_DIR, { recursive: true });

  const jsonlPath = join(PUBLIC_DIR, `${args.name}.txt`);
  writeFileSync(jsonlPath, anonymized.map((i) => JSON.stringify(i)).join('\n') + '\n');

  const readablePath = join(PUBLIC_DIR, `${args.name}.readable.txt`);
  const readable = groupIntoLines(anonymized)
    .map((l) => `p${l.page + 1} y${l.y.toFixed(1).padStart(7)} | ${l.text}`)
    .join('\n');
  writeFileSync(readablePath, readable + '\n');

  console.log(`\nWrote ${jsonlPath} (${anonymized.length} items)`);
  console.log(`Wrote ${readablePath}`);
  console.log('\nReplacements:', anonymizer.counts);
  if (scrub.length === 0) {
    console.log(
      '\nNOTE: no fixtures/private/overrides.json found. The cardholder name printed on the\n' +
        'statement is NOT auto-detected — add it: { "scrub": ["NAME AS PRINTED"] } and re-run.',
    );
  }
  console.log(`\nREVIEW ${readablePath} line by line before committing.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
