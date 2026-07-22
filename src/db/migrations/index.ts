import { Migration } from './types';
import { migration001 } from './001_initial';
import { migration002 } from './002_app_settings';

/**
 * Append-only list. RULES:
 * - Never edit a shipped migration; add a new one.
 * - Never drop or rewrite user data on upgrade — additive ALTERs and
 *   backfills only.
 */
export const MIGRATIONS: Migration[] = [migration001, migration002];
