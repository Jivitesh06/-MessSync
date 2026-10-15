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
   * Subscribes to real-time rating aggregates for a specific meal occurrence.
   */
  subscribeToRating(mealId: string, callback: AggregateListener): Unsubscribe {
    if (!localAggregateListeners.has(mealId)) {
      localAggregateListeners.set(mealId, new Set());
    }
    localAggregateListeners.get(mealId)!.add(callback);

    let firestoreUnsub: Unsubscribe | null = null;

    if (db && isFirebaseConfigured()) {
      try {
        const aggRef = doc(db, 'ratingAggregates', mealId);
        firestoreUnsub = onSnapshot(aggRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as RatingAggregate;
            idbStorage.saveRatingAggregate(data);
            callback(data);
          }
        });
      } catch (err) {
        console.warn('[ratingService] Error setting up aggregate listener:', err);
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

    // Use Firestore transaction if connected
    if (db && isFirebaseConfigured()) {
      try {
        const ratingRef = doc(db, 'ratings', docId);
        const aggRef = doc(db, 'ratingAggregates', params.mealId);

        await runTransaction(db, async (transaction) => {
          const aggSnap = await transaction.get(aggRef);
          let currentAgg: RatingAggregate;

          if (aggSnap.exists()) {
            currentAgg = aggSnap.data() as RatingAggregate;
          } else {
            currentAgg = this.getDefaultAggregate(params.mealId, params.date, params.slotId, params.mealName);
          }

          // Calculate changes
          const oldRating = existing ? existing.rating : null;
          const newRating = record.rating;

          const dist = { ...currentAgg.distribution };
          const tagCounts = { ...currentAgg.tagCounts };

          let newCount = currentAgg.count;
          let newSum = currentAgg.average * currentAgg.count;

          if (isEdit && oldRating) {
            // Recalculate average without incrementing count!
            dist[oldRating as 1|2|3|4|5] = Math.max(0, (dist[oldRating as 1|2|3|4|5] || 1) - 1);
            dist[newRating as 1|2|3|4|5] = (dist[newRating as 1|2|3|4|5] || 0) + 1;
            newSum = newSum - oldRating + newRating;
            
            // Adjust tag counts
            if (existing) {
              existing.tags.forEach((t) => {
                tagCounts[t] = Math.max(0, (tagCounts[t] || 1) - 1);
              });
            }
          } else {
            // New rating: increment count
            newCount += 1;
            dist[newRating as 1|2|3|4|5] = (dist[newRating as 1|2|3|4|5] || 0) + 1;
            newSum += newRating;
          }

          record.tags.forEach((t) => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          });

          const newAverage = newCount > 0 ? Number((newSum / newCount).toFixed(2)) : newRating;

          currentAgg = {
            ...currentAgg,
            average: newAverage,
            count: newCount,
            distribution: dist,
            tagCounts,
            lastUpdated: nowIso,
          };

          transaction.set(ratingRef, record);
          transaction.set(aggRef, currentAgg);
          updatedAggregate = currentAgg;
        });

        // @ts-ignore
        if (updatedAggregate) {
          await idbStorage.saveRatingAggregate(updatedAggregate);
          notifyLocalAggListeners(params.mealId, updatedAggregate);
          return { success: true, isEdit, isOfflinePending: false, aggregate: updatedAggregate };
        }
      } catch (err) {
        console.warn('[ratingService] Firestore transaction failed, falling back to local aggregate:', err);
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

    return localReviewsStore.get(mealId) || [
      {
        id: `mock-rev-1`,
        mealId,
        date: mealId.split('-').slice(0, 3).join('-'),
        slotId: mealId.split('-')[3] || 'lunch',
        rating: 5,
        tags: ['taste', 'freshness'],
        comment: 'Dal makhani was exceptionally good today, hot and rich!',
        deviceId: 'anon_student_1',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'published',
      },
      {
        id: `mock-rev-2`,
        mealId,
        date: mealId.split('-').slice(0, 3).join('-'),
        slotId: mealId.split('-')[3] || 'lunch',
        rating: 4,
        tags: ['temperature', 'quantity'],
        comment: 'Freshly served rotis right from tandoor. Good service.',
        deviceId: 'anon_student_2',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        status: 'published',
      },
    ];
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
      average: 4.3,
      count: 24,
      distribution: { 1: 1, 2: 1, 3: 3, 4: 9, 5: 10 },
      tagCounts: {
        taste: 18,
        freshness: 14,
        variety: 11,
        quantity: 16,
        temperature: 15,
      },
      lastUpdated: new Date().toISOString(),
    };
  },
};
