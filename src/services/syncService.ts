import { useState, useEffect } from 'react';
import { ratingService } from './ratingService';
import { idbStorage } from './idbStorage';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
}

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

let currentState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
};

function emitState() {
  listeners.forEach((fn) => fn({ ...currentState }));
}

export const syncService = {
  init() {
    if (typeof window === 'undefined') return;

    // Load initial sync timestamp
    idbStorage.getLastSyncTime().then((time) => {
      currentState.lastSyncedAt = time || new Date().toISOString();
      emitState();
    });

    // Check pending count
    idbStorage.getPendingRatings().then((items) => {
      currentState.pendingCount = items.length;
      emitState();
    });

    window.addEventListener('online', () => {
      currentState.isOnline = true;
      emitState();
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      currentState.isOnline = false;
      emitState();
    });
  },

  async triggerSync(): Promise<{ syncedRatings: number }> {
    if (!navigator.onLine || currentState.isSyncing) {
      return { syncedRatings: 0 };
    }

    currentState.isSyncing = true;
    emitState();

    try {
      const syncedRatings = await ratingService.syncPendingRatings();
      const nowIso = new Date().toISOString();
      await idbStorage.setLastSyncTime(nowIso);

      const pending = await idbStorage.getPendingRatings();
      currentState = {
        ...currentState,
        isSyncing: false,
        lastSyncedAt: nowIso,
        pendingCount: pending.length,
      };
      emitState();
      return { syncedRatings };
    } catch (err) {
      console.warn('[syncService] Error during sync:', err);
      currentState.isSyncing = false;
      emitState();
      return { syncedRatings: 0 };
    }
  },

  getState(): SyncState {
    return { ...currentState };
  },

  subscribe(listener: SyncListener): () => void {
    listeners.add(listener);
    listener({ ...currentState });
    return () => listeners.delete(listener);
  },
};

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(syncService.getState());

  useEffect(() => {
    return syncService.subscribe((s) => setState(s));
  }, []);

  return state;
}
