import { TextItem } from '@/pdf/types';

import { BankAdapter } from './types';

const adapters: BankAdapter[] = [];

export function registerAdapter(adapter: BankAdapter): void {
  if (adapters.some((a) => a.code === adapter.code)) {
    throw new Error(`Adapter already registered: ${adapter.code}`);
  }
  adapters.push(adapter);
}

export function getAdapters(): readonly BankAdapter[] {
  return adapters;
}

export function supportedBankNames(): string[] {
  return adapters.map((a) => a.displayName);
}

/** No adapter recognized the document. There is deliberately NO generic
 *  fallback parser — a guessed parse would violate the golden rule. */
export class UnsupportedBankError extends Error {
  readonly supportedBanks: string[];

  constructor(supportedBanks: string[]) {
    super(`No adapter matched. Supported banks: ${supportedBanks.join(', ') || '(none)'}`);
    this.name = 'UnsupportedBankError';
    this.supportedBanks = supportedBanks;
  }
}

export function detectAdapter(items: TextItem[]): BankAdapter | null {
  for (const adapter of adapters) {
    if (adapter.detect(items)) return adapter;
  }
  return null;
}

export function requireAdapter(items: TextItem[]): BankAdapter {
  const adapter = detectAdapter(items);
  if (!adapter) throw new UnsupportedBankError(supportedBankNames());
  return adapter;
}

/** Test-only: reset the registry between test suites. */
export function clearAdaptersForTest(): void {
  adapters.length = 0;
}
