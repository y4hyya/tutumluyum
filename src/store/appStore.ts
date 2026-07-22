import { create } from 'zustand';

/**
 * Minimal app state: screens re-query SQLite whenever `revision` bumps
 * (import, delete, recategorize, wipe). Data itself lives in the DB.
 */
interface AppState {
  revision: number;
  bumpRevision: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  revision: 0,
  bumpRevision: () => set((s) => ({ revision: s.revision + 1 })),
}));
