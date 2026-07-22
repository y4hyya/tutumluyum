/**
 * İş Bankası (Maximum) credit card statement adapter.
 *
 * Derived from real statements (fixtures/public/isbank-2026-*.txt), never
 * from assumption. Two generations of the same template exist in the wild:
 * the modern one and an older one whose pages carry /Rotate 180 (already
 * normalized by the extractor). Column x-positions differ between the two,
 * so every page's column anchors are derived from its own table header
 * ("TARİHİ AÇIKLAMA TUTAR TAKSİT BİLGİSİ MAXIPUAN"):
 *
 *   - TUTAR (amount) values are right-aligned to the right edge of the
 *     TUTAR header label
 *   - MAXIPUAN (loyalty points) values sit far right — same shape as
 *     amounts, so column position is the ONLY safe discriminator
 *   - TAKSİT info ("2/3 taksidi (3.458,50)") sits between the two
 *
 * Row types seen in real data: purchases, refunds (negative), account
 * payments ("HESAPTAN AKTARIM", negative, "- 1.000,00" with a space in the
 * old template), interest charges (FAIZ/GECIKME FAIZI), FX conversion rows
 * (two dates, ":908,8TL" garbage embedded in the description), points-only
 * rows ("MAXİPUAN İLAVE", no amount in TUTAR), the previous-balance
 * carry-over row, and assorted info lines (KUR:, Belge Numarası, SANAL KART
 * section divider, taksit totals, TOPLAM).
 *
 * GOLDEN RULE: any line inside the region that fits none of the known
 * shapes becomes an unparsedLines entry — never a guess, never dropped.
 */
import { Kurus } from '@/lib/money';
import { TextItem } from '@/pdf/types';

import { groupIntoLines, joinLineText, Line } from './lines';
import { foldTurkish, parseInstallment, parseTurkishAmount, parseTurkishDate } from './turkish';
import { BankAdapter, ParsedStatement, ParsedTransaction, ParsedUnparsedLine } from './types';

const DATE_RE = /(\d{2})[./](\d{2})[./](\d{4})/;
const LEADING_DATE_RE = /^(\d{2}[./]\d{2}[./]\d{4})\s*(.*)$/;

/** Right-alignment tolerance for matching values to their column anchor. */
const ALIGN_TOLERANCE = 8;

function fold(s: string): string {
  return foldTurkish(s);
}

function rightEdge(item: TextItem): number {
  return item.x + item.width;
}

function nonBlankItems(line: Line): TextItem[] {
  return line.items.filter((i) => i.str.trim().length > 0);
}

/**
 * Amount with İş Bankası balance-sign semantics: a leading "+" marks an
 * ALACAK (credit in the customer's favor), i.e. negative debt. Discovered
 * via reconciliation against real statements — "Hesap Özeti Borcu: +730,32"
 * only balances when read as -730,32. Transaction rows never use "+".
 */
function signedBalanceFromText(text: string): Kurus | null {
  const m = /([+-]?)\s*(\d[\d.]*,\d{2})/.exec(text);
  if (!m) return null;
  const value = parseTurkishAmount(m[2]);
  if (value === null) return null;
  return m[1] === '' ? value : -value;
}

interface ColumnAnchors {
  headerY: number;
  tutarRight: number;
  maxipuanRight: number;
}

/** Finds the per-page transaction table header and derives column anchors. */
function findAnchors(pageLines: Line[]): ColumnAnchors | null {
  for (const line of pageLines) {
    const folded = fold(line.text);
    if (!folded.includes('TARIHI') || !folded.includes('ACIKLAMA') || !folded.includes('TUTAR')) {
      continue;
    }
    let tutarRight: number | null = null;
    let maxipuanRight: number | null = null;
    for (const item of nonBlankItems(line)) {
      const itemFolded = fold(item.str);
      if (itemFolded === 'TUTAR') tutarRight = rightEdge(item);
      if (itemFolded.includes('MAXIPUAN')) maxipuanRight = rightEdge(item);
    }
    if (tutarRight !== null && maxipuanRight !== null) {
      return { headerY: line.y, tutarRight, maxipuanRight };
    }
  }
  return null;
}

/** Line classifications that are understood but are not transactions. */
function isRecognizedNonTransaction(folded: string): boolean {
  return (
    folded.startsWith('KUR:') ||
    folded.startsWith('BELGE NUMARASI') ||
    folded.includes('SANAL KART') ||
    folded.includes('ODEMELERINIZ ICIN TESEKKUR') ||
    folded.includes('AYLIK TAKSITLI BORC TOPLAMI') ||
    folded.includes('KALAN TAKSITLI BORC TOPLAMI') ||
    /^ISLEM$/.test(folded) || // stacked "İŞLEM / TARİHİ" header fragment

    (folded.includes('TARIHI') && folded.includes('ACIKLAMA') && folded.includes('TUTAR')) ||
    /^[\d]{12,}$/.test(folded) || // bare reference number line
    /^[X#*\-. ]+$/.test(folded) // masked/anonymized artifact line
  );
}

/** Region hard stops: everything after these on the page is not table data. */
function isRegionEnd(folded: string): boolean {
  return (
    folded.startsWith('MUSTERI LIMITI') ||
    folded.startsWith('MESAJINIZ VAR') ||
    folded.startsWith('SAYFA ') ||
    folded.includes('ISBANK.COM.TR') ||
    folded.startsWith('KREDI KARTININ') ||
    folded.startsWith('KREDI KARTINIZIN')
  );
}

interface RowSplit {
  leftText: string;
  tutarText: string | null;
  taksitText: string | null;
  /** A value sat in the MAXIPUAN column (loyalty points, not money). */
  hadMaxipuan: boolean;
  extraTexts: string[];
}

/** Splits a row's items into columns using the per-page anchors. */
function splitRow(line: Line, anchors: ColumnAnchors): RowSplit {
  const left: TextItem[] = [];
  let tutarText: string | null = null;
  let taksitText: string | null = null;
  let hadMaxipuan = false;
  const extraTexts: string[] = [];

  for (const item of nonBlankItems(line)) {
    const right = rightEdge(item);
    if (right <= anchors.tutarRight - 20) {
      left.push(item);
    } else if (Math.abs(right - anchors.tutarRight) <= ALIGN_TOLERANCE) {
      tutarText = item.str.trim();
    } else if (fold(item.str).includes('TAKSIDI')) {
      taksitText = item.str.trim();
    } else if (Math.abs(right - anchors.maxipuanRight) <= ALIGN_TOLERANCE) {
      // MaxiPuan value: recognized, deliberately unused (loyalty points).
      hadMaxipuan = true;
    } else {
      extraTexts.push(item.str.trim());
    }
  }

  return { leftText: joinLineText(left), tutarText, taksitText, hadMaxipuan, extraTexts };
}

function parseHeaderFields(lines: Line[]) {
  let statementDate: string | null = null;
  let dueDate: string | null = null;
  let totalAmount: Kurus | null = null;
  let minPayment: Kurus | null = null;
  let cardLast4: string | null = null;

  for (const line of lines) {
    const folded = fold(line.text);
    if (statementDate === null && folded.includes('HESAP KESIM TARIHI')) {
      const m = DATE_RE.exec(folded);
      if (m) statementDate = parseTurkishDate(m[0]);
    }
    if (dueDate === null && folded.includes('SON ODEME TARIHI') && !folded.includes('SONRAKI')) {
      const m = DATE_RE.exec(folded);
      if (m) dueDate = parseTurkishDate(m[0]);
    }
    if (totalAmount === null && folded.includes('HESAP OZETI BORCU')) {
      totalAmount = signedBalanceFromText(folded);
    }
    if (minPayment === null && folded.includes('ODENMESI GEREKEN ASGARI TUTAR')) {
      minPayment = signedBalanceFromText(folded);
    }
    if (cardLast4 === null && folded.includes('KART NUMARASI') && !folded.includes('SANAL')) {
      const m = /(\d{4})\s*$/.exec(line.text.trim());
      if (m) cardLast4 = m[1];
    }
  }

  return { statementDate, dueDate, totalAmount, minPayment, cardLast4 };
}

function parseStatement(items: TextItem[]): ParsedStatement {
  const lines = groupIntoLines(items.filter((i) => i.str.trim().length > 0));
  const header = parseHeaderFields(lines);

  const transactions: ParsedTransaction[] = [];
  const unparsedLines: ParsedUnparsedLine[] = [];
  let previousBalance: Kurus | null = null;
  let totalFromTable: Kurus | null = null;

  const pages = [...new Set(lines.map((l) => l.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const pageLines = lines.filter((l) => l.page === page);
    const anchors = findAnchors(pageLines);
    if (!anchors) {
      // Legal-text continuation pages have no table — but if a headerless
      // page DOES contain transaction-shaped lines, surface them instead of
      // silently dropping a whole page (golden rule).
      for (const line of pageLines) {
        if (/^\d{2}[./]\d{2}[./]\d{4}\s/.test(line.text.trim())) {
          unparsedLines.push({
            page: line.page,
            y: line.y,
            rawText: line.text,
            reason: 'Sayfada işlem tablosu başlığı bulunamadı',
          });
        }
      }
      continue;
    }

    for (const line of pageLines) {
      if (line.y <= anchors.headerY) continue;
      const folded = fold(line.text);
      if (folded === '') continue;

      if (isRegionEnd(folded)) break;

      if (folded.includes('BIR ONCEKI HESAP OZETI BAKIYENIZ')) {
        const split = splitRow(line, anchors);
        previousBalance = split.tutarText !== null ? signedBalanceFromText(split.tutarText) : null;
        if (previousBalance === null) {
          unparsedLines.push({
            page: line.page,
            y: line.y,
            rawText: line.text,
            reason: 'Önceki dönem bakiyesi okunamadı',
          });
        }
        continue;
      }

      if (/^TOPLAM\b/.test(folded)) {
        totalFromTable = signedBalanceFromText(folded);
        continue;
      }

      if (isRecognizedNonTransaction(folded)) continue;

      const split = splitRow(line, anchors);
      const dateMatch = LEADING_DATE_RE.exec(split.leftText);

      if (!dateMatch) {
        unparsedLines.push({
          page: line.page,
          y: line.y,
          rawText: line.text,
          reason: 'Satır anlaşılamadı (tarih bulunamadı)',
        });
        continue;
      }

      if (split.extraTexts.length > 0) {
        unparsedLines.push({
          page: line.page,
          y: line.y,
          rawText: line.text,
          reason: `Beklenmeyen sütun içeriği: ${split.extraTexts.join(' | ')}`,
        });
        continue;
      }

      if (split.tutarText === null) {
        // Points-only rows: MaxiPuan additions ("MAXİPUAN İLAVE") and points
        // reversals (e.g. a refunded purchase clawing points back) carry a
        // value ONLY in the MAXIPUAN column — no money moved. Reconciliation
        // across six real months confirms these are excluded from the total.
        if (split.hadMaxipuan || folded.includes('MAXIPUAN ILAVE')) continue;
        unparsedLines.push({
          page: line.page,
          y: line.y,
          rawText: line.text,
          reason: 'Tutar sütununda değer yok',
        });
        continue;
      }

      const txnDate = parseTurkishDate(dateMatch[1]);
      const amount = parseTurkishAmount(split.tutarText);
      if (txnDate === null || amount === null) {
        unparsedLines.push({
          page: line.page,
          y: line.y,
          rawText: line.text,
          reason: txnDate === null ? 'Tarih çözümlenemedi' : `Tutar çözümlenemedi: ${split.tutarText}`,
        });
        continue;
      }

      let installmentNo: number | null = null;
      let installmentTotal: number | null = null;
      if (split.taksitText !== null) {
        const m = /(\d{1,2}\s*\/\s*\d{1,2})/.exec(split.taksitText);
        const installment = m ? parseInstallment(m[1]) : null;
        if (installment) {
          installmentNo = installment.no;
          installmentTotal = installment.total;
        } else {
          unparsedLines.push({
            page: line.page,
            y: line.y,
            rawText: line.text,
            reason: `Taksit bilgisi çözümlenemedi: ${split.taksitText}`,
          });
          continue;
        }
      }

      transactions.push({
        txnDate,
        postingDate: null,
        rawDescription: dateMatch[2].trim(),
        amount,
        currency: 'TRY',
        installmentNo,
        installmentTotal,
      });
    }
  }

  return {
    bankCode: isbankAdapter.code,
    cardLast4: header.cardLast4,
    statementDate: header.statementDate,
    dueDate: header.dueDate,
    periodStart: null,
    periodEnd: header.statementDate,
    totalAmount: header.totalAmount ?? totalFromTable,
    previousBalance,
    minPayment: header.minPayment,
    currency: 'TRY',
    transactions,
    unparsedLines,
  };
}

export const isbankAdapter: BankAdapter = {
  code: 'ISBANK',
  displayName: 'İş Bankası',

  detect(items: TextItem[]): boolean {
    const folded = fold(items.map((i) => i.str).join(' '));
    return (
      folded.includes('KREDI KARTI HESAP OZETI') &&
      (folded.includes('MAXIPUAN') || folded.includes('MAXIMUM'))
    );
  },

  parse: parseStatement,
};
