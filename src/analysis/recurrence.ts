/**
 * Recurring-payment detection — the feature that sells the app. Pure
 * functions, no DB or UI imports, fully unit tested.
 *
 * Pipeline per merchant_key:
 *  1. drop installment rows (a 3-month "3/3 taksidi" purchase looks exactly
 *     like a monthly subscription otherwise) and non-spend rows
 *  2. cluster occurrences into amount bands (±15% around the running median)
 *     — one merchant can host many subscriptions (Apple: iCloud 17,99 +
 *     one-off app purchases), and FX-billed prices drift month to month
 *  3. per band: require >=2 occurrences in distinct statement periods,
 *     classify the cadence from the median interval, score confidence from
 *     occurrence count + interval regularity + amount stability
 *
 * The headline is always CUMULATIVE money already spent (totalPaid), sorted
 * descending — "7 aydır ödüyorsun, toplam ₺1.049,93".
 */
import { addDays, daysBetween } from '@/lib/dates';
import { Kurus } from '@/lib/money';

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurrenceInput {
  merchantKey: string;
  /** Resolved display name (falls back to merchantKey). */
  displayName?: string;
  /** ISO date of the charge. */
  date: string;
  /** Integer kuruş, must be > 0 (spend only). */
  amount: Kurus;
  /** Distinct statement periods are counted via this id. */
  statementId: number;
  /** True when the row is one installment of a split purchase. */
  isInstallment?: boolean;
  /** Merchant is a known subscription service (seed data hint). */
  isKnownSubscription?: boolean;
}

export interface RecurringFinding {
  /** Stable-ish id: merchantKey + rounded band amount. */
  groupKey: string;
  merchantKey: string;
  displayName: string;
  cadence: Cadence;
  /** Median charge of the band, in kuruş. */
  avgAmount: Kurus;
  occurrences: number;
  totalPaid: Kurus;
  monthsActive: number;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  expectedNext: string;
  /** False when the charges stopped (>2 cadence periods before data end). */
  isActive: boolean;
}

const CADENCES: { cadence: Cadence; min: number; max: number; nominal: number }[] = [
  { cadence: 'weekly', min: 6, max: 8, nominal: 7 },
  { cadence: 'monthly', min: 26, max: 35, nominal: 30 },
  { cadence: 'quarterly', min: 85, max: 95, nominal: 91 },
  { cadence: 'yearly', min: 350, max: 380, nominal: 365 },
];

const AMOUNT_BAND_TOLERANCE = 0.15;
const MIN_CONFIDENCE = 0.5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Greedy amount clustering: sort by amount, split where the next amount
 *  falls outside ±15% of the running band median. */
function clusterByAmount(items: RecurrenceInput[]): RecurrenceInput[][] {
  const sorted = [...items].sort((a, b) => a.amount - b.amount);
  const bands: RecurrenceInput[][] = [];
  let band: RecurrenceInput[] = [];

  for (const item of sorted) {
    if (band.length === 0) {
      band = [item];
      continue;
    }
    const bandMedian = median(band.map((i) => i.amount));
    if (Math.abs(item.amount - bandMedian) <= bandMedian * AMOUNT_BAND_TOLERANCE) {
      band.push(item);
    } else {
      bands.push(band);
      band = [item];
    }
  }
  if (band.length > 0) bands.push(band);
  return bands;
}

function classifyCadence(medianInterval: number) {
  return CADENCES.find((c) => medianInterval >= c.min && medianInterval <= c.max) ?? null;
}

function analyzeBand(band: RecurrenceInput[], dataEnd: string): RecurringFinding | null {
  const distinctPeriods = new Set(band.map((i) => i.statementId)).size;
  if (band.length < 2 || distinctPeriods < 2) return null;

  const byDate = [...band].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Interval math on distinct days (two identical same-day charges are one
  // billing event for cadence purposes, but both count toward totalPaid).
  const distinctDays = [...new Set(byDate.map((i) => i.date))];
  if (distinctDays.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < distinctDays.length; i++) {
    intervals.push(daysBetween(distinctDays[i - 1], distinctDays[i]));
  }

  const medianInterval = median(intervals);
  const cadenceDef = classifyCadence(medianInterval);
  if (!cadenceDef) return null;

  const inWindow = intervals.filter((d) => d >= cadenceDef.min && d <= cadenceDef.max).length;
  const intervalScore = inWindow / intervals.length;
  // At least two thirds of the gaps must actually look like the cadence.
  if (intervalScore < 2 / 3) return null;

  const amounts = band.map((i) => i.amount);
  const medianAmount = median(amounts);
  const maxRelDev =
    medianAmount === 0
      ? 1
      : Math.max(...amounts.map((a) => Math.abs(a - medianAmount) / medianAmount));
  const amountScore = clamp01(1 - maxRelDev / AMOUNT_BAND_TOLERANCE);

  // Weekly needs extra proof: groceries and coffee runs live in this window.
  if (cadenceDef.cadence === 'weekly' && (band.length < 4 || maxRelDev > 0.1)) return null;

  // With only two occurrences there is a single interval, so regularity
  // proves nothing — require near-identical amounts, or any two similar
  // charges ~a month apart would masquerade as a subscription.
  if (band.length === 2 && maxRelDev > 0.02) return null;

  const occurrenceScore = clamp01((band.length - 1) / 4);
  let confidence = 0.45 * occurrenceScore + 0.3 * intervalScore + 0.25 * amountScore;
  if (band.some((i) => i.isKnownSubscription)) confidence = clamp01(confidence + 0.1);
  confidence = Math.round(confidence * 100) / 100;
  if (confidence < MIN_CONFIDENCE) return null;

  const firstSeen = distinctDays[0];
  const lastSeen = distinctDays[distinctDays.length - 1];
  const expectedNext = addDays(lastSeen, medianInterval);
  const spanDays = daysBetween(firstSeen, lastSeen);

  return {
    groupKey: `${band[0].merchantKey}@${Math.round(medianAmount / 100)}`,
    merchantKey: band[0].merchantKey,
    displayName: band[0].displayName ?? band[0].merchantKey,
    cadence: cadenceDef.cadence,
    avgAmount: medianAmount,
    occurrences: band.length,
    totalPaid: amounts.reduce((a, b) => a + b, 0),
    monthsActive: Math.max(1, Math.round(spanDays / 30.44) + 1),
    confidence,
    firstSeen,
    lastSeen,
    expectedNext,
    isActive: daysBetween(lastSeen, dataEnd) <= cadenceDef.nominal * 2,
  };
}

/**
 * Detects recurring payments across all imported transactions.
 * @param inputs spend rows (amount > 0) from every statement
 * @param dataEnd the newest date covered by the data (e.g. the latest
 *                statement date) — used to tell "active" from "stopped"
 */
export function detectRecurring(inputs: RecurrenceInput[], dataEnd: string): RecurringFinding[] {
  const eligible = inputs.filter((i) => i.amount > 0 && !i.isInstallment);

  const byMerchant = new Map<string, RecurrenceInput[]>();
  for (const input of eligible) {
    const list = byMerchant.get(input.merchantKey);
    if (list) list.push(input);
    else byMerchant.set(input.merchantKey, [input]);
  }

  const findings: RecurringFinding[] = [];
  for (const group of byMerchant.values()) {
    for (const band of clusterByAmount(group)) {
      const finding = analyzeBand(band, dataEnd);
      if (finding) findings.push(finding);
    }
  }

  return findings.sort((a, b) => b.totalPaid - a.totalPaid);
}
