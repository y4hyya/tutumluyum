/**
 * The golden rule, adversarially: feed the adapter a synthetic İş Bankası
 * document full of malformed rows and verify every one of them lands in
 * unparsedLines with a specific Turkish reason — never guessed, never
 * silently dropped.
 */
import { TextItem } from '@/pdf/types';

// Side-effect import: registers the adapter into the registry.
import '../index';
import { isbankAdapter } from '../isbank';
import { requireAdapter, supportedBankNames } from '../registry';

const PAGE = { pageWidth: 595, pageHeight: 842 };

function mk(str: string, x: number, y: number, width: number, pageIndex = 0): TextItem {
  return { str, x, y, width, height: 10, pageIndex, fontName: 'f1', ...PAGE };
}

/** Column geometry mirroring the real template: TUTAR right edge = 428,
 *  MAXIPUAN right edge = 566. */
function header(y: number, pageIndex = 0): TextItem[] {
  return [
    mk('İŞLEM', 58, y - 10, 28, pageIndex),
    mk('TARİHİ', 58, y, 30, pageIndex),
    mk('AÇIKLAMA', 136, y, 46, pageIndex),
    mk('TUTAR', 400, y, 28, pageIndex),
    mk('TAKSİT BİLGİSİ MAXIPUAN', 448, y, 118, pageIndex),
  ];
}

const TITLE = [mk('KREDİ KARTI HESAP ÖZETİ', 100, 20, 200)];

describe('isbank adapter — golden rule on malformed input', () => {
  const items: TextItem[] = [
    ...TITLE,
    ...header(100),
    // no leading date
    mk('TARİHSİZ SATIR', 61, 120, 100),
    mk('10,00', 407, 120, 21),
    // amount that does not parse strictly
    mk('01/01/2026 BOZUK TUTARLI', 61, 140, 150),
    mk('ABC', 410, 140, 18),
    // bad installment text
    mk('02/01/2026 BOZUK TAKSİT', 61, 160, 150),
    mk('10,00', 407, 160, 21),
    mk('X/Y taksidi', 451, 160, 60),
    // unexpected content in no-column-land
    mk('03/01/2026 FAZLA SÜTUN', 61, 180, 150),
    mk('10,00', 407, 180, 21),
    mk('S%RPR%Z', 480, 180, 20),
    // previous balance row with no readable amount
    mk('**** BİR ÖNCEKİ HESAP ÖZETİ BAKİYENİZ', 48, 200, 180),
    // one valid transaction
    mk('04/01/2026 GERÇEK MAĞAZA', 61, 220, 150),
    mk('25,50', 407, 220, 21),
    // dated row with neither amount nor points
    mk('05/01/2026 TUTARSIZ SATIR', 61, 240, 150),
    // a second page that has transaction rows but no table header
    mk('06/01/2026 KAYIP SATIR', 61, 100, 150, 1),
  ];

  const parsed = isbankAdapter.parse(items);

  it('parses only the one well-formed transaction', () => {
    expect(parsed.transactions).toEqual([
      {
        txnDate: '2026-01-04',
        postingDate: null,
        rawDescription: 'GERÇEK MAĞAZA',
        amount: 2550,
        currency: 'TRY',
        installmentNo: null,
        installmentTotal: null,
      },
    ]);
  });

  it('routes every malformed line to unparsedLines with a specific reason', () => {
    const reasons = parsed.unparsedLines.map((u) => u.reason).sort();
    expect(reasons).toEqual(
      [
        'Satır anlaşılamadı (tarih bulunamadı)',
        'Tutar çözümlenemedi: ABC',
        'Taksit bilgisi çözümlenemedi: X/Y taksidi',
        'Beklenmeyen sütun içeriği: S%RPR%Z',
        'Önceki dönem bakiyesi okunamadı',
        'Tutar sütununda değer yok',
        'Sayfada işlem tablosu başlığı bulunamadı',
      ].sort(),
    );
  });

  it('keeps page and position info so the UI can show the exact line', () => {
    const lost = parsed.unparsedLines.find((u) => u.reason.includes('tablosu başlığı'));
    expect(lost?.page).toBe(1);
    expect(lost?.rawText).toContain('KAYIP SATIR');
  });

  it('does not invent header fields from a document that lacks them', () => {
    expect(parsed.totalAmount).toBeNull();
    expect(parsed.statementDate).toBeNull();
    expect(parsed.cardLast4).toBeNull();
  });
});

describe('isbank adapter — registry wiring', () => {
  it('registers itself and is found through requireAdapter', () => {
    const adapter = requireAdapter([...TITLE, ...header(100)]);
    expect(adapter.code).toBe('ISBANK');
    expect(supportedBankNames()).toContain('İş Bankası');
  });
});
