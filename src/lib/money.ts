/**
 * Money is ALWAYS an integer amount of kuruş (1/100 TL) everywhere in the
 * app — database, parsers, analysis. Floats never touch amounts. Formatting
 * to the Turkish `1.234,56` shape happens only here, at the UI edge.
 */
export type Kurus = number;

function assertInteger(value: Kurus): void {
  if (!Number.isInteger(value)) {
    throw new Error(`Amount must be integer kuruş, got: ${value}`);
  }
}

/** 123456 -> "1.234,56" (no currency symbol). */
export function formatKurus(value: Kurus): string {
  assertInteger(value);
  const negative = value < 0;
  const abs = Math.abs(value);
  const lira = Math.trunc(abs / 100).toString();
  const kurus = (abs % 100).toString().padStart(2, '0');
  let grouped = '';
  for (let i = 0; i < lira.length; i++) {
    const fromEnd = lira.length - i;
    grouped += lira[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) grouped += '.';
  }
  return `${negative ? '-' : ''}${grouped},${kurus}`;
}

/** 123456 -> "₺1.234,56"; -34990 -> "-₺349,90". */
export function formatLira(value: Kurus): string {
  const s = formatKurus(value);
  return s.startsWith('-') ? `-₺${s.slice(1)}` : `₺${s}`;
}

/** Sums safely (all integers). */
export function sumKurus(values: Kurus[]): Kurus {
  let total = 0;
  for (const v of values) {
    assertInteger(v);
    total += v;
  }
  return total;
}
