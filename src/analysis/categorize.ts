/**
 * Merchant key -> category/display/subscription-hint matching. Pure module:
 * matcher rows are injected (the app loads them from the merchants table).
 */

export interface MerchantMatcher {
  pattern: string;
  displayName: string;
  categoryKey: string | null;
  isSubscription: boolean;
  isUserDefined: boolean;
}

export interface MerchantMatch {
  displayName: string;
  categoryKey: string | null;
  isSubscription: boolean;
}

/**
 * Matching semantics (documented in src/data/merchants.ts):
 * - user-defined rows match their exact merchant_key first (corrections win)
 * - then seed patterns, longest first:
 *   - pattern with spaces  -> phrase match on token boundaries
 *   - single token, len<=4 -> exact token membership
 *   - single token, len>=5 -> substring match
 */
export function matchMerchant(merchantKey: string, matchers: MerchantMatcher[]): MerchantMatch | null {
  const user = matchers.find((m) => m.isUserDefined && m.pattern === merchantKey);
  if (user) {
    return {
      displayName: user.displayName,
      categoryKey: user.categoryKey,
      isSubscription: user.isSubscription,
    };
  }

  const padded = ` ${merchantKey} `;
  const tokens = new Set(merchantKey.split(' '));

  const seeds = matchers
    .filter((m) => !m.isUserDefined)
    .sort((a, b) => b.pattern.length - a.pattern.length);

  for (const m of seeds) {
    const hit = m.pattern.includes(' ')
      ? padded.includes(` ${m.pattern} `)
      : m.pattern.length <= 4
        ? tokens.has(m.pattern)
        : merchantKey.includes(m.pattern);
    if (hit) {
      return { displayName: m.displayName, categoryKey: m.categoryKey, isSubscription: m.isSubscription };
    }
  }
  return null;
}
