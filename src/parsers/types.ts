import { Kurus } from '@/lib/money';
import { TextItem } from '@/pdf/types';

export interface ParsedTransaction {
  /** ISO yyyy-MM-dd. */
  txnDate: string;
  postingDate?: string | null;
  rawDescription: string;
  /** Integer kuruş; positive = spend, negative = refund/payment. */
  amount: Kurus;
  currency: string;
  installmentNo?: number | null;
  installmentTotal?: number | null;
}

export interface ParsedUnparsedLine {
  page: number;
  y: number;
  rawText: string;
  /** Human-readable Turkish reason shown to the user. */
  reason: string;
}

export interface ParsedStatement {
  bankCode: string;
  cardLast4: string | null;
  statementDate: string | null;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  /** The period total ("Dönem Borcu") as printed on the PDF. */
  totalAmount: Kurus | null;
  minPayment: Kurus | null;
  currency: string;
  transactions: ParsedTransaction[];
  unparsedLines: ParsedUnparsedLine[];
}

export interface BankAdapter {
  /** Stable identifier, e.g. 'ISBANK'. */
  code: string;
  /** Turkish display name, e.g. 'İş Bankası'. */
  displayName: string;
  /** Cheap check whether these text items look like this bank's statement. */
  detect(items: TextItem[]): boolean;
  /** Full parse. Must obey the golden rule — see README.md. */
  parse(items: TextItem[]): ParsedStatement;
}
