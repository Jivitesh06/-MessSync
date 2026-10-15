import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function Trigger: onRatingWritten
 * Automatically runs on the trusted server whenever any rating document is created, updated, or deleted.
 * Recalculates aggregate average, total count, 1-5 star distribution, and tag counts.
 * Atomically commits the authoritative result to `ratingAggregates/{mealId}`.
 */
export const onRatingWritten = onDocumentWritten('ratings/{ratingId}', async (event) => {
  const afterData = event.data?.after.data();
  const beforeData = event.data?.before.data();

  const mealId = afterData?.mealId || beforeData?.mealId || event.params.ratingId.split('_')[0];
  if (!mealId) {
    console.error('Cannot resolve mealId for rating:', event.params.ratingId);
    return;
  }

  try {
    // Query all published ratings for this meal occurrence
    const snapshot = await db
      .collection('ratings')
      .where('mealId', '==', mealId)
      .where('status', '==', 'published')
      .get();

    let totalSum = 0;
    let count = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<string, number> = {
      taste: 0,
      freshness: 0,
      variety: 0,
      quantity: 0,
      temperature: 0,
    };

    let sampleDate = '';
    let sampleSlot = '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const r = Math.round(Number(data.rating));
      if (r >= 1 && r <= 5) {
        totalSum += r;
        count += 1;
        distribution[r] = (distribution[r] || 0) + 1;
      }

      if (Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => {
          if (tag in tagCounts) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }

      if (!sampleDate && data.date) sampleDate = data.date;
      if (!sampleSlot && data.slotId) sampleSlot = data.slotId;
    });

    const average = count > 0 ? Number((totalSum / count).toFixed(2)) : 0;

    const aggregateDoc = {
      mealId,
      date: sampleDate || mealId.split('-').slice(0, 3).join('-'),
      slotId: sampleSlot || mealId.split('-')[3] || 'meal',
      mealName: 'Meal',
      average,
      count,
      distribution,
      tagCounts,
      lastUpdated: new Date().toISOString(),
    };

    await db.collection('ratingAggregates').doc(mealId).set(aggregateDoc, { merge: true });
    console.log(`[onRatingWritten] Successfully updated aggregate for ${mealId}: avg ${average}, count ${count}`);
  } catch (err) {
    console.error(`[onRatingWritten] Error calculating rating aggregate for ${mealId}:`, err);
    throw err;
  }
});

/**
 * Callable Function: assignAdminRole
 * Privileged first-admin setup and role management.
 * Protected by SETUP_ADMIN_KEY environment variable or caller's existing admin custom claim.
 */
export const assignAdminRole = onCall(async (request) => {
  const { targetEmail, setupKey } = request.data;
  const callerAuth = request.auth;

  const validMasterKey = process.env.SETUP_ADMIN_KEY || 'CHITKARA_MESS_SECURE_ADMIN_2026';
  const isAuthorizedCaller = (callerAuth?.token?.admin === true) || (setupKey && setupKey === validMasterKey);

  if (!isAuthorizedCaller) {
    throw new HttpsError(
      'permission-denied',
      'Unauthorized. Only super-administrators or callers with the valid setup key can assign admin privileges.'
    );
  }

  if (!targetEmail || typeof targetEmail !== 'string') {
    throw new HttpsError('invalid-argument', 'Target email address is required.');
  }

  const cleanEmail = targetEmail.trim().toLowerCase();

  try {
    const userRecord = await admin.auth().getUserByEmail(cleanEmail);

    // Set custom claim admin: true
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

    // Record user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set(
      {
        email: cleanEmail,
        role: 'admin',
        assignedBy: callerAuth?.uid || 'system_bootstrap',
        assignedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Write audit log
    await db.collection('auditLogs').add({
      action: 'assign_admin_role',
      performedBy: callerAuth?.token?.email || 'master_key',
      targetEmail: cleanEmail,
      timestamp: new Date().toISOString(),
      details: `Assigned admin custom claims to ${cleanEmail}`,
    });

    return { success: true, message: `Successfully assigned administrator role to ${cleanEmail}` };
  } catch (err: any) {
    console.error('Error assigning admin role:', err);
    throw new HttpsError('internal', err.message || 'Failed to assign admin role.');
  }
});

/**
 * Callable Function: moderateReview
 * Allows administrators to approve, flag, or hide reviews with audit logging.
 */
export const moderateReview = onCall(async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin privileges required.');
  }

  const { reviewId, status } = request.data;
  if (!reviewId || !['published', 'hidden', 'flagged'].includes(status)) {
    throw new HttpsError('invalid-argument', 'Invalid reviewId or status.');
  }

  await db.collection('ratings').doc(reviewId).set(
    {
      status,
      isModerated: true,
      moderatedBy: request.auth.token.email,
      moderatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await db.collection('auditLogs').add({
    action: 'moderate_review',
    performedBy: request.auth.token.email,
    targetId: reviewId,
    timestamp: new Date().toISOString(),
    details: `Updated review status to ${status}`,
  });

  return { success: true };
});
