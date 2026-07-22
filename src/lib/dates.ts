/**
 * Dates are ISO `yyyy-MM-dd` strings internally and `dd.MM.yyyy` in the UI.
 * All arithmetic is pure UTC day math — no timezone surprises, no locale
 * dependence on the device.
 */

export const TURKISH_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  const dt = new Date(t);
  return dt.getUTCFullYear() === Number(y) && dt.getUTCMonth() === Number(mo) - 1 && dt.getUTCDate() === Number(d);
}

function toUtc(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Not an ISO date: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "2026-06-15" -> "15.06.2026" */
export function formatDate(iso: string): string {
  const m = ISO_RE.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** "2026-06-15" -> "Haziran 2026" */
export function formatMonthYear(iso: string): string {
  const m = ISO_RE.exec(iso);
  if (!m) return iso;
  return `${TURKISH_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-06-15" -> "15 Haziran 2026" */
export function formatLongDate(iso: string): string {
  const m = ISO_RE.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${TURKISH_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(toUtc(iso) + days * 86_400_000);
  const y = d.getUTCFullYear();
  const mo = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** "2026-06-15" -> "2026-06" (statement period bucketing). */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}
