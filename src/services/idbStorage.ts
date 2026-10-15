import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WeekMenu } from '@/types/menu';
import { RatingAggregate, PendingRatingQueueItem } from '@/types/rating';

interface MessSyncDB extends DBSchema {
  menus: {
    key: string; // weekId (e.g., "week-2026-10-12")
    value: {
      week: WeekMenu;
      cachedAt: string;
    };
  };
  aggregates: {
    key: string; // mealId (e.g., "2026-10-15-lunch")
    value: RatingAggregate;
  };
  myRatings: {
    key: string; // mealId
    value: {
      mealId: string;
      rating: number;
      tags: string[];
      comment?: string;
      updatedAt: string;
    };
  };
  pendingRatings: {
    key: string; // queue item id
    value: PendingRatingQueueItem;
  };
  meta: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'messsync_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MessSyncDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MessSyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('menus')) {
          db.createObjectStore('menus', { keyPath: 'week.id' });
        }
        if (!db.objectStoreNames.contains('aggregates')) {
          db.createObjectStore('aggregates', { keyPath: 'mealId' });
        }
        if (!db.objectStoreNames.contains('myRatings')) {
          db.createObjectStore('myRatings', { keyPath: 'mealId' });
        }
        if (!db.objectStoreNames.contains('pendingRatings')) {
          db.createObjectStore('pendingRatings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

export const idbStorage = {
  // Save or update a week menu in local IndexedDB
  async saveWeekMenu(week: WeekMenu): Promise<void> {
    try {
      const db = await getDB();
      await db.put('menus', {
        week,
        cachedAt: new Date().toISOString(),
      });
      await db.put('meta', new Date().toISOString(), 'last_sync_timestamp');
    } catch (err) {
      console.warn('idbStorage.saveWeekMenu error:', err);
    }
  },

  // Get cached week menu by week ID
  async getWeekMenu(weekId: string): Promise<WeekMenu | null> {
    try {
      const db = await getDB();
      const record = await db.get('menus', weekId);
      return record ? record.week : null;
    } catch (err) {
      console.warn('idbStorage.getWeekMenu error:', err);
      return null;
    }
  },

  // Get all cached week menus
  async getAllWeekMenus(): Promise<WeekMenu[]> {
    try {
      const db = await getDB();
      const records = await db.getAll('menus');
      return records.map((r) => r.week);
    } catch (err) {
      console.warn('idbStorage.getAllWeekMenus error:', err);
      return [];
    }
  },

  // Save rating aggregate
  async saveRatingAggregate(agg: RatingAggregate): Promise<void> {
    try {
      const db = await getDB();
      await db.put('aggregates', agg);
    } catch (err) {
      console.warn('idbStorage.saveRatingAggregate error:', err);
    }
  },

  // Get rating aggregate
  async getRatingAggregate(mealId: string): Promise<RatingAggregate | null> {
    try {
      const db = await getDB();
      const res = await db.get('aggregates', mealId);
      return res || null;
    } catch (err) {
      return null;
    }
  },

  // Device's personal submitted rating
  async saveMyRating(mealId: string, rating: number, tags: string[], comment?: string): Promise<void> {
    try {
      const db = await getDB();
      await db.put('myRatings', {
        mealId,
        rating,
        tags,
        comment,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('idbStorage.saveMyRating error:', err);
    }
  },

  async getMyRating(mealId: string) {
    try {
      const db = await getDB();
      const res = await db.get('myRatings', mealId);
      return res || null;
    } catch (err) {
      return null;
    }
  },

  // Pending ratings queue for offline submissions
  async enqueuePendingRating(item: PendingRatingQueueItem): Promise<void> {
    try {
      const db = await getDB();
      await db.put('pendingRatings', item);
    } catch (err) {
      console.warn('idbStorage.enqueuePendingRating error:', err);
    }
  },

  async getPendingRatings(): Promise<PendingRatingQueueItem[]> {
    try {
      const db = await getDB();
      return await db.getAll('pendingRatings');
    } catch (err) {
      return [];
    }
  },

  async removePendingRating(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('pendingRatings', id);
    } catch (err) {
      console.warn('idbStorage.removePendingRating error:', err);
    }
  },

  // Metadata
  async getLastSyncTime(): Promise<string | null> {
    try {
      const db = await getDB();
      const ts = await db.get('meta', 'last_sync_timestamp');
      return ts || null;
    } catch {
      return null;
    }
  },

  async setLastSyncTime(isoString: string): Promise<void> {
    try {
      const db = await getDB();
      await db.put('meta', isoString, 'last_sync_timestamp');
    } catch {}
  },
};
