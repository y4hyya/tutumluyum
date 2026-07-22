import { Kurus } from '@/lib/money';

export type StatementStatus = 'ok' | 'needs_review';

export type RecurringStatus = 'new' | 'acknowledged' | 'to_cancel' | 'cancelled';

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface CategoryRow {
  id: number;
  key: string;
  label_tr: string;
  color: string;
}

export interface MerchantRow {
  id: number;
  pattern: string;
  display_name: string;
  category_id: number | null;
  is_subscription: number;
  is_user_defined: number;
}

export interface StatementRow {
  id: number;
  bank_code: string;
  card_last4: string | null;
  statement_date: string | null;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  total_amount: Kurus | null;
  min_payment: Kurus | null;
  currency: string;
  source_filename: string | null;
  status: StatementStatus;
  imported_at: string;
}

export interface TransactionRow {
  id: number;
  statement_id: number;
  txn_date: string;
  posting_date: string | null;
  raw_description: string;
  merchant_key: string;
  amount: Kurus;
  currency: string;
  installment_no: number | null;
  installment_total: number | null;
  category_id: number | null;
}

export interface UnparsedLineRow {
  id: number;
  statement_id: number;
  page: number;
  y: number;
  raw_text: string;
  reason: string;
}

export interface RecurringGroupRow {
  id: number;
  merchant_key: string;
  display_name: string;
  cadence: Cadence;
  avg_amount: Kurus;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  total_paid: Kurus;
  confidence: number;
  status: RecurringStatus;
  is_active: number;
}
