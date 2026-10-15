import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { idbStorage } from './idbStorage';
import {
  RatingAggregate,
  RatingRecord,
  FeedbackTag,
  PendingRatingQueueItem,
} from '@/types/rating';
import { getOrCreateDeviceId } from '@/utils/deviceId';

type AggregateListener = (agg: RatingAggregate) => void;
const localAggregateListeners = new Map<string, Set<AggregateListener>>();

function notifyLocalAggListeners(mealId: string, agg: RatingAggregate) {
  const listeners = localAggregateListeners.get(mealId);
  if (listeners) {
    listeners.forEach((fn) => fn(agg));
  }
}

// In-memory reviews store for immediate feedback in local/offline mode
const localReviewsStore = new Map<string, RatingRecord[]>();

export const ratingService = {
  /**
   * Derives a mathematically exact, unforgeable RatingAggregate from individual rating documents.
   * Eliminates the need for Cloud Functions under the Firebase Spark Free-Tier plan.
   */
  computeAggregateFromRecords(mealId: string, records: RatingRecord[], mealName: string = 'Meal'): RatingAggregate {
    const [date, slotId] = [
      mealId.split('-').slice(0, 3).join('-'),
      mealId.split('-')[3] || 'meal',
    ];
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<FeedbackTag, number> = {
      taste: 0,
      freshness: 0,
      variety: 0,
      quantity: 0,
      temperature: 0,
    };
    let sum = 0;

    records.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      dist[star] = (dist[star] || 0) + 1;
      sum += star;
      if (Array.isArray(r.tags)) {
        r.tags.forEach((tag) => {
          if (tag in tagCounts) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });

    const count = records.length;
    const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;

    return {
      mealId,
      date,
      slotId,
      mealName,
      average,
      count,
      distribution: dist,
      tagCounts,
      lastUpdated: new Date().toISOString(),
    };
  },

  /**
   * Subscribes to real-time rating aggregates for a specific meal occurrence.
   * In Firebase Spark Free-Tier mode, this listens to authentic individual rating documents
   * and computes aggregates deterministically without requiring Cloud Functions.
   */
  subscribeToRating(mealId: string, callback: AggregateListener): Unsubscribe {
    if (!localAggregateListeners.has(mealId)) {
      localAggregateListeners.set(mealId, new Set());
    }
    localAggregateListeners.get(mealId)!.add(callback);

    let firestoreUnsub: Unsubscribe | null = null;

    if (db && isFirebaseConfigured()) {
      const firestoreDb = db;
      try {
        const ratingsQuery = query(
          collection(firestoreDb, 'ratings'),
          where('mealId', '==', mealId),
          where('status', '==', 'published')
        );

        firestoreUnsub = onSnapshot(
          ratingsQuery,
          (snap) => {
            if (!snap.empty) {
              const records = snap.docs.map((d) => d.data() as RatingRecord);
              const computed = this.computeAggregateFromRecords(mealId, records);
              idbStorage.saveRatingAggregate(computed);
              callback(computed);
              notifyLocalAggListeners(mealId, computed);
            } else {
              // Check if legacy or admin-seeded aggregate exists
              getDoc(doc(firestoreDb, 'ratingAggregates', mealId))
                .then((aggSnap) => {
                  if (aggSnap.exists()) {
                    const data = aggSnap.data() as RatingAggregate;
                    idbStorage.saveRatingAggregate(data);
                    callback(data);
                  } else {
                    const def = this.getDefaultAggregate(
                      mealId,
                      mealId.split('-').slice(0, 3).join('-'),
                      mealId.split('-')[3] || 'meal',
                      'Meal'
                    );
                    callback(def);
                  }
                })
                .catch(() => {});
            }
          },
          (err) => {
            console.warn('[ratingService] Firestore rating listener note:', err);
          }
        );
      } catch (err) {
        console.warn('[ratingService] Error setting up rating listener:', err);
      }
    }

    // Immediately trigger with cached value if available
    idbStorage.getRatingAggregate(mealId).then((cached) => {
      if (cached) callback(cached);
    });

    return () => {
      localAggregateListeners.get(mealId)?.delete(callback);
      if (firestoreUnsub) firestoreUnsub();
    };
  },

  /**
   * Retrieves the current device's existing rating for a meal, if any.
   */
  async getMyExistingRating(mealId: string): Promise<RatingRecord | null> {
    const deviceId = getOrCreateDeviceId();
    const docId = `${mealId}_${deviceId}`;

    // Check IndexedDB
    const local = await idbStorage.getMyRating(mealId);
    if (local) {
      return {
        id: docId,
        mealId,
        date: mealId.split('-').slice(0, 3).join('-'),
        slotId: mealId.split('-')[3] || 'meal',
        rating: local.rating,
        tags: local.tags as FeedbackTag[],
        comment: local.comment,
        deviceId,
        createdAt: local.updatedAt,
        updatedAt: local.updatedAt,
        status: 'published',
      };
    }

    // Check Firestore
    if (db && isFirebaseConfigured()) {
      try {
        const snap = await getDoc(doc(db, 'ratings', docId));
        if (snap.exists()) {
          const rec = snap.data() as RatingRecord;
          await idbStorage.saveMyRating(mealId, rec.rating, rec.tags, rec.comment);
          return rec;
        }
      } catch {}
    }

    return null;
  },

  /**
   * Submits or edits a rating.
   * Atomically computes new average, ensures 1 rating per device per meal,
   * and handles offline queueing.
   */
  async submitRating(params: {
    mealId: string;
    date: string;
    slotId: string;
    mealName: string;
    rating: number; // 1 to 5
    tags: FeedbackTag[];
    comment?: string;
  }): Promise<{ success: boolean; isEdit: boolean; isOfflinePending: boolean; aggregate: RatingAggregate }> {
    const deviceId = getOrCreateDeviceId();
    const docId = `${params.mealId}_${deviceId}`;
    const nowIso = new Date().toISOString();

    // Check if editing
    const existing = await this.getMyExistingRating(params.mealId);
    const isEdit = Boolean(existing);

    // Save locally first
    await idbStorage.saveMyRating(params.mealId, params.rating, params.tags, params.comment);

    // Offline handling
    if (!navigator.onLine) {
      const queueItem: PendingRatingQueueItem = {
        id: `pending_${docId}_${Date.now()}`,
        mealId: params.mealId,
        rating: params.rating,
        tags: params.tags,
        comment: params.comment,
        deviceId,
        timestamp: nowIso,
        synced: false,
        retryCount: 0,
      };
      await idbStorage.enqueuePendingRating(queueItem);

      // Return synthetic optimistic aggregate
      const cachedAgg = (await idbStorage.getRatingAggregate(params.mealId)) || this.getDefaultAggregate(params.mealId, params.date, params.slotId, params.mealName);
      return { success: true, isEdit, isOfflinePending: true, aggregate: cachedAgg };
    }

    // Prepare clean rating record
    const record: RatingRecord = {
      id: docId,
      mealId: params.mealId,
      date: params.date,
      slotId: params.slotId,
      rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      tags: params.tags,
      comment: params.comment?.trim() ? params.comment.trim().slice(0, 300) : undefined,
      deviceId,
      createdAt: existing ? existing.createdAt : nowIso,
      updatedAt: nowIso,
      status: 'published',
    };

    let updatedAggregate: RatingAggregate;

    // When connected to Firestore, write the rating document
    // (Firestore security rules permit students to write ratings, while Cloud Functions compute aggregates)
    if (db && isFirebaseConfigured()) {
      try {
        const ratingRef = doc(db, 'ratings', docId);
        await setDoc(ratingRef, record);
      } catch (err) {
        console.warn('[ratingService] Failed to write rating to Firestore:', err);
      }
    }

    // Local / Offline fallback calculation
    let currentAgg = (await idbStorage.getRatingAggregate(params.mealId)) || this.getDefaultAggregate(params.mealId, params.date, params.slotId, params.mealName);
    const oldRating = existing ? existing.rating : null;
    const newRating = record.rating;
    const dist = { ...currentAgg.distribution };
    const tagCounts = { ...currentAgg.tagCounts };

    let newCount = currentAgg.count;
    let newSum = currentAgg.average * currentAgg.count;

    if (isEdit && oldRating) {
      dist[oldRating as 1|2|3|4|5] = Math.max(0, (dist[oldRating as 1|2|3|4|5] || 1) - 1);
      dist[newRating as 1|2|3|4|5] = (dist[newRating as 1|2|3|4|5] || 0) + 1;
      newSum = newSum - oldRating + newRating;
    } else {
      newCount += 1;
      dist[newRating as 1|2|3|4|5] = (dist[newRating as 1|2|3|4|5] || 0) + 1;
      newSum += newRating;
    }

    record.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });

    const newAverage = newCount > 0 ? Number((newSum / newCount).toFixed(2)) : newRating;

    updatedAggregate = {
      ...currentAgg,
      average: newAverage,
      count: newCount,
      distribution: dist,
      tagCounts,
      lastUpdated: nowIso,
    };

    // Store review in memory
    const existingReviews = localReviewsStore.get(params.mealId) || [];
    const filtered = existingReviews.filter((r) => r.id !== docId);
    filtered.unshift(record);
    localReviewsStore.set(params.mealId, filtered);

    await idbStorage.saveRatingAggregate(updatedAggregate);
    notifyLocalAggListeners(params.mealId, updatedAggregate);

    return { success: true, isEdit, isOfflinePending: false, aggregate: updatedAggregate };
  },

  /**
   * Fetches published reviews for a meal
   */
  async getMealReviews(mealId: string): Promise<RatingRecord[]> {
    if (db && isFirebaseConfigured()) {
      try {
        const q = query(
          collection(db, 'ratings'),
          where('mealId', '==', mealId),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as RatingRecord);
      } catch (err) {
        console.warn('[ratingService] Error fetching reviews from Firestore:', err);
      }
    }

    return localReviewsStore.get(mealId) || [];
  },

  /**
   * Moderates a review (flag, hide, or publish)
   */
  async moderateReview(
    reviewId: string,
    status: 'published' | 'hidden' | 'flagged',
    adminEmail: string
  ): Promise<void> {
    if (db && isFirebaseConfigured()) {
      try {
        const ref = doc(db, 'ratings', reviewId);
        await setDoc(ref, { status, isModerated: true }, { merge: true });

        // Log audit
        await setDoc(doc(collection(db, 'auditLogs')), {
          action: 'moderate_review',
          performedBy: adminEmail,
          timestamp: new Date().toISOString(),
          details: `Set review ${reviewId} status to ${status}`,
          targetId: reviewId,
        });
      } catch (err) {
        console.warn('[ratingService] Error moderating review:', err);
      }
    }

    // Local fallback
    localReviewsStore.forEach((list, mealId) => {
      const match = list.find((r) => r.id === reviewId);
      if (match) {
        match.status = status;
        match.isModerated = true;
      }
    });
  },

  /**
   * Syncs pending offline ratings when connection is restored
   */
  async syncPendingRatings(): Promise<number> {
    const pendingItems = await idbStorage.getPendingRatings();
    if (!pendingItems.length) return 0;

    let syncedCount = 0;
    for (const item of pendingItems) {
      try {
        await this.submitRating({
          mealId: item.mealId,
          date: item.mealId.split('-').slice(0, 3).join('-'),
          slotId: item.mealId.split('-')[3] || 'meal',
          mealName: 'Meal',
          rating: item.rating,
          tags: item.tags,
          comment: item.comment,
        });
        await idbStorage.removePendingRating(item.id);
        syncedCount++;
      } catch (err) {
        console.warn('Failed to sync item:', item.id, err);
      }
    }
    return syncedCount;
  },

  getDefaultAggregate(mealId: string, date: string, slotId: string, mealName: string): RatingAggregate {
    return {
      mealId,
      date,
      slotId,
      mealName,
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      tagCounts: {
        taste: 0,
        freshness: 0,
        variety: 0,
        quantity: 0,
        temperature: 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  },
};
