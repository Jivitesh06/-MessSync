import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  MealTimingsConfig,
  DEFAULT_CHITKARA_TIMINGS,
  validateMealTiming,
} from '@/config/mealTimings';
import { idbStorage } from './idbStorage';

const STORAGE_KEY = 'messsync_meal_timings';

type TimingsListener = (timings: MealTimingsConfig) => void;
const listeners = new Set<TimingsListener>();

let cachedTimings: MealTimingsConfig = DEFAULT_CHITKARA_TIMINGS;

// Load local cache if present
try {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    cachedTimings = { ...DEFAULT_CHITKARA_TIMINGS, ...JSON.parse(local) };
  }
} catch {}

function notifyListeners(timings: MealTimingsConfig) {
  cachedTimings = timings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timings));
  } catch {}
  listeners.forEach((fn) => fn(timings));
}

export const mealTimingService = {
  /**
   * Returns current active timings (synchronous from cache)
   */
  getCurrentTimings(): MealTimingsConfig {
    return { ...cachedTimings };
  },

  /**
   * Fetches latest timings from Firestore (or IndexedDB/local cache)
   */
  async getTimings(): Promise<MealTimingsConfig> {
    if (db && isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'mealTimings'));
        if (snap.exists()) {
          const remote = snap.data() as MealTimingsConfig;
          notifyListeners(remote);
          return remote;
        }
      } catch (err) {
        console.warn('[mealTimingService] Firestore timings fetch note:', err);
      }
    }

    return cachedTimings;
  },

  /**
   * Subscribes to real-time changes to official timings
   */
  subscribeToTimings(callback: TimingsListener): Unsubscribe {
    listeners.add(callback);
    callback(cachedTimings);

    let firestoreUnsub: Unsubscribe | null = null;

    if (db && isFirebaseConfigured()) {
      try {
        const configDoc = doc(db, 'appConfig', 'mealTimings');
        firestoreUnsub = onSnapshot(configDoc, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as MealTimingsConfig;
            notifyListeners(data);
          }
        });
      } catch (err) {
        console.warn('[mealTimingService] onSnapshot listener error:', err);
      }
    }

    return () => {
      listeners.delete(callback);
      if (firestoreUnsub) firestoreUnsub();
    };
  },

  /**
   * Updates official timings (Admin only).
   * Validates each timing slot, writes to Firestore, updates local caches.
   */
  async updateTimings(
    timings: MealTimingsConfig,
    adminEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Validate all 4 meal slots
    const slots: ('breakfast' | 'lunch' | 'snacks' | 'dinner')[] = [
      'breakfast',
      'lunch',
      'snacks',
      'dinner',
    ];
    for (const slot of slots) {
      const check = validateMealTiming(timings[slot]);
      if (!check.valid) {
        return { success: false, error: check.error };
      }
    }

    const payload = {
      ...timings,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    };

    // 2. Persist to Firestore if available
    if (db && isFirebaseConfigured()) {
      try {
        await setDoc(doc(db, 'appConfig', 'mealTimings'), payload);
      } catch (err: any) {
        console.warn('[mealTimingService] Failed to save timings to Firestore:', err);
        return {
          success: false,
          error: err.message || 'Failed to persist timings to Firestore. Check admin privileges.',
        };
      }
    }

    // 3. Update local caches and listeners
    notifyListeners(timings);
    return { success: true };
  },

  /**
   * Resets timings back to the official Chitkara defaults
   */
  async resetToDefaults(adminEmail: string): Promise<{ success: boolean; error?: string }> {
    return this.updateTimings(DEFAULT_CHITKARA_TIMINGS, adminEmail);
  },
};
