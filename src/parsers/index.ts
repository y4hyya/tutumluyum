import { isbankAdapter } from './isbank';
import { registerAdapter } from './registry';

registerAdapter(isbankAdapter);

export { isbankAdapter };
export * from './types';
export * from './registry';
export { reconcile, reconcileStatement, type ReconcileResult } from './reconcile';
export { groupIntoLines, columnText, type Line } from './lines';
