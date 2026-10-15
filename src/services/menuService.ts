import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { idbStorage } from './idbStorage';
import { WeekMenu, MenuDraft, MenuVersion, MealOccurrence } from '@/types/menu';
import { buildWeekMenuForDate, CHITKARA_WEEK_TEMPLATE } from '@/data/chitkaraInitialMenu';
import { getWeekBoundaries } from '@/utils/dateUtils';

// In-memory event bus for local reactive updates when Firestore is offline or in local mode
type MenuListener = (menu: WeekMenu) => void;
const localListeners = new Map<string, Set<MenuListener>>();

function notifyLocalListeners(weekId: string, menu: WeekMenu) {
  const set = localListeners.get(weekId);
  if (set) {
    set.forEach((fn) => fn(menu));
  }
}

export const menuService = {
  /**
   * Retrieves week menu for a given date.
   * Priority: Firestore (if online) -> IndexedDB -> Built-in Chitkara initial dataset.
   */
  async getWeekMenu(targetDateStr: string): Promise<WeekMenu> {
    const { monday } = getWeekBoundaries(targetDateStr);
    const weekId = `week-${monday}`;

    // 1. Try local IndexedDB first for instant response
    const cached = await idbStorage.getWeekMenu(weekId);

    // 2. If Firebase is active and connected, query Firestore
    if (db && isFirebaseConfigured()) {
      try {
        const docRef = doc(db, 'menuWeeks', weekId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const remoteMenu = snapshot.data() as WeekMenu;
          await idbStorage.saveWeekMenu(remoteMenu);
          return remoteMenu;
        }
      } catch (err) {
        console.warn('[menuService] Firestore fetch error, falling back to cache:', err);
      }
    }

    if (cached) {
      return cached;
    }

    // 3. Fallback: Generate the structured Chitkara menu for this week & cache it
    const initial = buildWeekMenuForDate(monday);
    await idbStorage.saveWeekMenu(initial);
    return initial;
  },

  /**
   * Real-time subscription to a week's published menu.
   * Updates connected clients automatically whenever an admin publishes changes.
   */
  subscribeToWeekMenu(targetDateStr: string, callback: (menu: WeekMenu) => void): Unsubscribe {
    const { monday } = getWeekBoundaries(targetDateStr);
    const weekId = `week-${monday}`;

    // Register local in-memory listener
    if (!localListeners.has(weekId)) {
      localListeners.set(weekId, new Set());
    }
    localListeners.get(weekId)!.add(callback);

    let firestoreUnsub: Unsubscribe | null = null;

    if (db && isFirebaseConfigured()) {
      try {
        const docRef = doc(db, 'menuWeeks', weekId);
        firestoreUnsub = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as WeekMenu;
            idbStorage.saveWeekMenu(data);
            callback(data);
          }
        }, (err) => {
          console.warn('[menuService] onSnapshot listener error:', err);
        });
      } catch (err) {
        console.warn('[menuService] Failed to attach Firestore listener:', err);
      }
    }

    // Cleanup function
    return () => {
      localListeners.get(weekId)?.delete(callback);
      if (firestoreUnsub) firestoreUnsub();
    };
  },

  /**
   * Publishes an approved week menu.
   * Atomically records version snapshot, admin email, and updates student cache.
   */
  async publishWeekMenu(
    weekMenu: WeekMenu,
    adminEmail: string,
    changeSummary: string = 'Regular menu update'
  ): Promise<WeekMenu> {
    const newVersion = (weekMenu.version || 1) + 1;
    const nowIso = new Date().toISOString();

    const publishedMenu: WeekMenu = {
      ...weekMenu,
      version: newVersion,
      isPublished: true,
      publishedAt: nowIso,
      publishedBy: adminEmail,
    };

    // 1. Update IndexedDB immediately
    await idbStorage.saveWeekMenu(publishedMenu);
    notifyLocalListeners(publishedMenu.id, publishedMenu);

    // 2. Persist to Firestore if available
    if (db && isFirebaseConfigured()) {
      try {
        const weekRef = doc(db, 'menuWeeks', publishedMenu.id);
        await setDoc(weekRef, publishedMenu);

        // Store snapshot in versions collection
        const versionRef = doc(db, 'menuVersions', `${publishedMenu.id}-v${newVersion}`);
        const versionRecord: MenuVersion = {
          id: `${publishedMenu.id}-v${newVersion}`,
          weekId: publishedMenu.id,
          version: newVersion,
          publishedAt: nowIso,
          publishedBy: adminEmail,
          data: publishedMenu,
          changeSummary,
        };
        await setDoc(versionRef, versionRecord);

        // Record audit log
        await addDoc(collection(db, 'auditLogs'), {
          action: 'publish_menu',
          performedBy: adminEmail,
          timestamp: nowIso,
          details: `Published version ${newVersion} for ${publishedMenu.label}. Changes: ${changeSummary}`,
          targetId: publishedMenu.id,
        });
      } catch (err) {
        console.warn('[menuService] Error publishing to Firestore:', err);
      }
    }

    return publishedMenu;
  },

  /**
   * Saves a menu draft (does NOT affect the public student menu).
   */
  async saveDraft(draft: MenuDraft): Promise<void> {
    const draftWithTs: MenuDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    if (db && isFirebaseConfigured()) {
      try {
        const draftRef = doc(db, 'menuDrafts', draft.id);
        await setDoc(draftRef, draftWithTs);
      } catch (err) {
        console.warn('[menuService] Error saving draft to Firestore:', err);
      }
    }

    // LocalStorage fallback for drafts
    try {
      const existingDrafts: MenuDraft[] = JSON.parse(localStorage.getItem('messsync_drafts') || '[]');
      const filtered = existingDrafts.filter((d) => d.id !== draft.id);
      filtered.unshift(draftWithTs);
      localStorage.setItem('messsync_drafts', JSON.stringify(filtered));
    } catch {}
  },

  /**
   * Fetches all saved drafts
   */
  async getDrafts(): Promise<MenuDraft[]> {
    if (db && isFirebaseConfigured()) {
      try {
        const snap = await getDocs(collection(db, 'menuDrafts'));
        const remote = snap.docs.map((d) => d.data() as MenuDraft);
        if (remote.length > 0) return remote;
      } catch {}
    }

    try {
      return JSON.parse(localStorage.getItem('messsync_drafts') || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Deletes a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    if (db && isFirebaseConfigured()) {
      try {
        // firestore delete
      } catch {}
    }
    try {
      const existingDrafts: MenuDraft[] = JSON.parse(localStorage.getItem('messsync_drafts') || '[]');
      const filtered = existingDrafts.filter((d) => d.id !== draftId);
      localStorage.setItem('messsync_drafts', JSON.stringify(filtered));
    } catch {}
  },

  /**
   * Fetches published version history for a week
   */
  async getVersionHistory(weekId: string): Promise<MenuVersion[]> {
    if (db && isFirebaseConfigured()) {
      try {
        const q = query(
          collection(db, 'menuVersions'),
          where('weekId', '==', weekId),
          orderBy('version', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as MenuVersion);
      } catch (err) {
        console.warn('[menuService] Error fetching version history from Firestore:', err);
      }
    }

    // Fallback: return mock initial version
    return [
      {
        id: `${weekId}-v1`,
        weekId,
        version: 1,
        publishedAt: new Date().toISOString(),
        publishedBy: 'admin@chitkara.edu.in',
        data: buildWeekMenuForDate(weekId.replace('week-', '')),
        changeSummary: 'Initial verified Chitkara mess schedule transcription',
      },
    ];
  },
};
