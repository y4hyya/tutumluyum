import { TextItem } from '@/pdf/types';

import {
  clearAdaptersForTest,
  detectAdapter,
  registerAdapter,
  requireAdapter,
  supportedBankNames,
  UnsupportedBankError,
} from '../registry';
import { BankAdapter, ParsedStatement } from '../types';

const EMPTY_PARSE: ParsedStatement = {
  bankCode: 'X',
  cardLast4: null,
  statementDate: null,
  dueDate: null,
  periodStart: null,
  periodEnd: null,
  totalAmount: null,
  previousBalance: null,
  minPayment: null,
  currency: 'TRY',
  transactions: [],
  unparsedLines: [],
};

function fakeAdapter(code: string, marker: string): BankAdapter {
  return {
    code,
    displayName: code,
    detect: (items: TextItem[]) => items.some((i) => i.str.includes(marker)),
    parse: () => ({ ...EMPTY_PARSE, bankCode: code }),
  };
}

const textItem = (str: string): TextItem => ({
  str,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  pageIndex: 0,
  fontName: '',
  pageWidth: 595,
  pageHeight: 842,
});

beforeEach(() => clearAdaptersForTest());

describe('adapter registry', () => {
  it('detects the first adapter whose detect() matches', () => {
    registerAdapter(fakeAdapter('BANK_A', 'AAA'));
    registerAdapter(fakeAdapter('BANK_B', 'BBB'));

    expect(detectAdapter([textItem('xx BBB xx')])?.code).toBe('BANK_B');
    expect(detectAdapter([textItem('nothing')])).toBeNull();
  });

  it('rejects duplicate registrations', () => {
    registerAdapter(fakeAdapter('BANK_A', 'AAA'));
    expect(() => registerAdapter(fakeAdapter('BANK_A', 'zzz'))).toThrow('already registered');
  });

  it('requireAdapter throws UnsupportedBankError with the supported list — no fallback', () => {
    registerAdapter(fakeAdapter('ISBANK', 'İŞ BANKASI'));
    try {
      requireAdapter([textItem('GARANTİ BBVA EKSTRE')]);
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedBankError);
      expect((e as UnsupportedBankError).supportedBanks).toEqual(['ISBANK']);
    }
    expect(supportedBankNames()).toEqual(['ISBANK']);
  });
});
