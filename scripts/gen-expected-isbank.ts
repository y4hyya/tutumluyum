/**
 * Generates the golden expected-output JSON for an İş Bankası fixture from
 * its human-readable dump — a deliberately INDEPENDENT implementation from
 * src/parsers/isbank.ts: this one is pure line-text regex, the adapter is
 * coordinate/column based. The golden test deep-compares the two, so a bug
 * would have to exist identically in both to slip through. Review the JSON
 * against the .readable.txt before committing.
 *
 * Usage: npx tsx scripts/gen-expected-isbank.ts isbank-2026-06
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { foldTurkish } from '../src/parsers/turkish';

const PUBLIC_DIR = 'fixtures/public';

function toKurus(s: string): number {
  const negative = /^-/.test(s.replace(/\s/g, ''));
  const [lira, kurus] = s.replace(/[-\s.]/g, '').split(',');
  const value = parseInt(lira, 10) * 100 + parseInt(kurus, 10);
  return negative ? -value : value;
}

function toIso(d: string): string {
  const m = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(d)!;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

const name = process.argv[2];
if (!name) {
  console.error('Usage: npx tsx scripts/gen-expected-isbank.ts <fixture-name>');
  process.exit(1);
}

const readable = readFileSync(join(PUBLIC_DIR, `${name}.readable.txt`), 'utf8');
const lines = readable
  .split('\n')
  .map((l) => /^p(\d+) y\s*([\d.]+) \| (.*)$/.exec(l))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ page: parseInt(m[1], 10) - 1, y: parseFloat(m[2]), text: m[3].trim() }));

const HEADER = {
  statementDate: /HESAP KESIM TARIHI:?\s*(\d{2}[./]\d{2}[./]\d{4})/,
  dueDate: /SON ODEME TARIHI:?\s*(\d{2}[./]\d{2}[./]\d{4})/,
  totalAmount: /HESAP OZETI BORCU:?\s*(-? ?\d[\d.]*,\d{2})/,
  minPayment: /ODENMESI GEREKEN ASGARI TUTAR:?\s*(-? ?\d[\d.]*,\d{2})/,
};

const ROW =
  /^(\d{2}\/\d{2}\/\d{4}) (.+?) (-? ?\d[\d.]*,\d{2})( (\d{1,2})\/(\d{1,2}) taksidi \([\d.]+,\d{2}\))?( -? ?\d[\d.]*,\d{2})?$/;

let statementDate: string | null = null;
let dueDate: string | null = null;
let totalAmount: number | null = null;
let minPayment: number | null = null;
let cardLast4: string | null = null;
let previousBalance: number | null = null;
interface Txn {
  txnDate: string;
  postingDate: null;
  rawDescription: string;
  amount: number;
  currency: 'TRY';
  installmentNo: number | null;
  installmentTotal: number | null;
}
const transactions: Txn[] = [];

let inRegion = false;

for (const line of lines) {
  const folded = foldTurkish(line.text);

  if (statementDate === null && HEADER.statementDate.test(folded)) {
    statementDate = toIso(HEADER.statementDate.exec(folded)![1]);
  }
  if (dueDate === null && folded.includes('SON ODEME TARIHI') && !folded.includes('SONRAKI')) {
    const m = HEADER.dueDate.exec(folded);
    if (m) dueDate = toIso(m[1]);
  }
  if (totalAmount === null && HEADER.totalAmount.test(folded)) {
    totalAmount = toKurus(HEADER.totalAmount.exec(folded)![1]);
  }
  if (minPayment === null && HEADER.minPayment.test(folded)) {
    minPayment = toKurus(HEADER.minPayment.exec(folded)![1]);
  }
  if (cardLast4 === null && folded.includes('KART NUMARASI') && !folded.includes('SANAL')) {
    const m = /(\d{4})$/.exec(line.text.trim());
    if (m) cardLast4 = m[1];
  }

  if (folded.includes('TARIHI') && folded.includes('ACIKLAMA') && folded.includes('TUTAR')) {
    inRegion = true;
    continue;
  }
  if (!inRegion) continue;

  if (
    folded.startsWith('MUSTERI LIMITI') ||
    folded.startsWith('MESAJINIZ VAR') ||
    folded.startsWith('SAYFA ') ||
    folded.includes('ISBANK.COM.TR') ||
    folded.startsWith('KREDI KARTINizin'.toUpperCase()) ||
    folded.startsWith('KREDI KARTININ')
  ) {
    inRegion = false;
    continue;
  }

  if (folded.includes('BIR ONCEKI HESAP OZETI BAKIYENIZ')) {
    const m = /(-? ?\d[\d.]*,\d{2})\s*$/.exec(folded);
    previousBalance = m ? toKurus(m[1]) : null;
    continue;
  }
  if (/^TOPLAM\b/.test(folded)) continue;
  if (folded.includes('MAXIPUAN ILAVE')) continue; // points-only row
  if (
    folded.startsWith('KUR:') ||
    folded.startsWith('BELGE NUMARASI') ||
    folded.includes('SANAL KART') ||
    folded.includes('ODEMELERINIZ ICIN TESEKKUR') ||
    folded.includes('TAKSITLI BORC TOPLAMI') ||
    /^ISLEM$/.test(folded) ||
    /^[\d]{12,}$/.test(folded) ||
    /^[X#*\-. ]*$/.test(folded)
  ) {
    continue;
  }

  const m = ROW.exec(line.text);
  if (!m) {
    console.error(`UNMATCHED region line (p${line.page + 1} y${line.y}): ${line.text}`);
    continue;
  }
  transactions.push({
    txnDate: toIso(m[1]),
    postingDate: null,
    rawDescription: m[2].trim(),
    amount: toKurus(m[3]),
    currency: 'TRY',
    installmentNo: m[5] ? parseInt(m[5], 10) : null,
    installmentTotal: m[6] ? parseInt(m[6], 10) : null,
  });
}

const expected = {
  bankCode: 'ISBANK',
  cardLast4,
  statementDate,
  dueDate,
  periodStart: null,
  periodEnd: statementDate,
  totalAmount,
  previousBalance,
  minPayment,
  currency: 'TRY',
  transactions,
  unparsedLines: [],
};

const sum = transactions.reduce((a, t) => a + t.amount, 0);
const target = (totalAmount ?? 0) - (previousBalance ?? 0);
console.log(
  `${name}: ${transactions.length} transactions, sum=${sum} kurus, ` +
    `target(total-prev)=${target} kurus, delta=${sum - target}`,
);

const outPath = join(PUBLIC_DIR, `${name}.expected.json`);
writeFileSync(outPath, JSON.stringify(expected, null, 2) + '\n');
console.log(`wrote ${outPath}`);
