/**
 * Strict Turkish number/date parsing. STRICT means: if the string does not
 * match the expected shape exactly, the function returns null — the caller
 * must route the line to unparsed_lines instead of coercing. Never guess.
 */
import { isIsoDate } from '@/lib/dates';
import { Kurus } from '@/lib/money';

const CURRENCY_TOKENS = /(₺|\bTL\b|\bTRY\b)/g;

/**
 * "1.234,56" | "1.234,56 TL" | "₺149,99" | "-1.234,56" | "1.234,56-" |
 * "(1.234,56)" | "+150,00" -> integer kuruş. Anything else -> null.
 * No floats are involved at any point.
 */
export function parseTurkishAmount(raw: string): Kurus | null {
  let s = raw.replace(/ /g, ' ').trim();
  if (s.length === 0) return null;

  let negative = false;

  const parens = /^\((.*)\)$/.exec(s);
  if (parens) {
    negative = true;
    s = parens[1].trim();
  }

  s = s.replace(CURRENCY_TOKENS, '').trim();

  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1).trim();
  }
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }

  const m = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/.exec(s);
  if (!m) return null;

  const lira = Number.parseInt(m[1].replace(/\./g, ''), 10);
  const kurus = Number.parseInt(m[2], 10);
  const value = lira * 100 + kurus;
  return negative ? -value : value;
}

/**
 * "15.06.2026" | "15/06/2026" | "15-06-2026" | "15.06.26" -> "2026-06-15".
 * Two-digit years are always 20xx (credit card statements are modern).
 * Invalid calendar dates -> null.
 */
export function parseTurkishDate(raw: string): string | null {
  const s = raw.replace(/ /g, ' ').trim();
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${year}-${month}-${day}`;
  return isIsoDate(iso) ? iso : null;
}

/** Folded (diacritic-free, uppercase) Turkish month names, index 0 = Ocak. */
const FOLDED_MONTHS = [
  'OCAK',
  'SUBAT',
  'MART',
  'NISAN',
  'MAYIS',
  'HAZIRAN',
  'TEMMUZ',
  'AGUSTOS',
  'EYLUL',
  'EKIM',
  'KASIM',
  'ARALIK',
];

const TURKISH_FOLD: Record<string, string> = {
  ç: 'C',
  Ç: 'C',
  ğ: 'G',
  Ğ: 'G',
  ı: 'I',
  I: 'I',
  i: 'I',
  İ: 'I',
  ö: 'O',
  Ö: 'O',
  ş: 'S',
  Ş: 'S',
  ü: 'U',
  Ü: 'U',
};

/** Uppercases with Turkish rules and strips diacritics: "Ağustos" -> "AGUSTOS". */
export function foldTurkish(s: string): string {
  let out = '';
  for (const ch of s) {
    const mapped = TURKISH_FOLD[ch];
    out += mapped ?? ch.toUpperCase();
  }
  return out;
}

/** "15 Haziran 2026" -> "2026-06-15" (case/diacritic tolerant). */
export function parseTurkishLongDate(raw: string): string | null {
  const s = raw.replace(/ /g, ' ').trim();
  const m = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(s);
  if (!m) return null;
  const monthIndex = FOLDED_MONTHS.indexOf(foldTurkish(m[2]));
  if (monthIndex === -1) return null;
  const iso = `${m[3]}-${String(monthIndex + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

/** "3/6" | "03/06" -> { no: 3, total: 6 }; also accepts "3-6". */
export function parseInstallment(raw: string): { no: number; total: number } | null {
  const m = /^(\d{1,2})\s*[/-]\s*(\d{1,2})$/.exec(raw.trim());
  if (!m) return null;
  const no = Number.parseInt(m[1], 10);
  const total = Number.parseInt(m[2], 10);
  if (no < 1 || total < 2 || no > total) return null;
  return { no, total };
}
