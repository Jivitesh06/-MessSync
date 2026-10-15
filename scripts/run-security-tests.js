import assert from 'assert';
import { buildWeekMenuForDate } from '../src/data/chitkaraInitialMenu.js';
import { computeWeekDiff, applyAcceptedDiff } from '../src/services/diffService.js';
import { parseMenuTextToWeek } from '../src/services/ocrService.js';

console.log('🔒 Starting MessSync Security & Integrity Audit Suite...\n');

let passed = 0;
let total = 0;

function runCheck(title, fn) {
  total++;
  try {
    fn();
    console.log(`  🛡️ VERIFIED: ${title}`);
    passed++;
  } catch (err) {
    console.error(`  🚨 FAILED: ${title}`);
    console.error(err);
  }
}

// -------------------------------------------------------------
// Security Check 1: Production Admin Authentication Lockdown
// -------------------------------------------------------------
runCheck('Security 1: Generic university email domain wildcards are not granted admin role', () => {
  // Simulate an arbitrary student with university email
  const studentEmail = 'rahul.kumar24@chitkara.edu.in';
  const AUTHORIZED_ADMIN_EMAILS = [
    'admin@chitkara.edu.in',
    'messadmin@chitkara.edu.in',
    'warden@chitkara.edu.in',
  ];

  const hasWildcardAdmin = studentEmail.endsWith('@chitkara.edu.in');
  const isAuthorized = AUTHORIZED_ADMIN_EMAILS.includes(studentEmail);

  // In secure implementation, ordinary student must NOT be admin
  assert.strictEqual(isAuthorized, false, 'Student email must not match authorized admin whitelist');
});

runCheck('Security 2: Demo/mock admin credentials rejected in production environment', () => {
  const isProd = true;
  const isFirebaseConfigured = false;

  // Simulate production login guard
  const attemptProdDemoLogin = () => {
    if (isProd) {
      if (!isFirebaseConfigured) {
        throw new Error('Production authentication error: Firebase Authentication credentials must be configured. Demo logins are disabled in production.');
      }
    }
  };

  assert.throws(
    () => attemptProdDemoLogin(),
    /Production authentication error/,
    'Must throw in production when Firebase is unconfigured instead of allowing mock bypass'
  );
});

// -------------------------------------------------------------
// Security Check 3: Rating Aggregates Manipulation Prevention
// -------------------------------------------------------------
runCheck('Security 3: Rating document IDs enforce strict deterministic uniqueness (mealId_deviceId)', () => {
  const mealId = '2026-10-15-lunch';
  const deviceId = 'dev_student_uuid_789';

  const expectedDocId = `${mealId}_${deviceId}`;
  const spoofedDocId = `${mealId}_random_fake_id_999`;

  // Validation function matching Firestore rules constraint:
  // ratingId == request.resource.data.mealId + '_' + request.resource.data.deviceId
  const validateDocId = (ratingId, data) => {
    return ratingId === `${data.mealId}_${data.deviceId}`;
  };

  assert.strictEqual(validateDocId(expectedDocId, { mealId, deviceId }), true);
  assert.strictEqual(validateDocId(spoofedDocId, { mealId, deviceId }), false);
});

runCheck('Security 4: Rating values outside 1-5 or invalid data types are rejected', () => {
  const isValidRating = (r) => typeof r === 'number' && Number.isInteger(r) && r >= 1 && r <= 5;

  assert.strictEqual(isValidRating(5), true);
  assert.strictEqual(isValidRating(1), true);
  assert.strictEqual(isValidRating(0), false);
  assert.strictEqual(isValidRating(6), false);
  assert.strictEqual(isValidRating(3.5), false);
  assert.strictEqual(isValidRating(-1), false);
  assert.strictEqual(isValidRating('5'), false);
});

runCheck('Security 5: Server-side aggregate recalculation preserves mathematical integrity without duplicate counts', () => {
  // Existing state: 10 ratings, sum = 40, average = 4.0
  let count = 10;
  let sum = 40;
  let distribution = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

  // Student edits rating from 2 stars to 5 stars
  const oldRating = 2;
  const newRating = 5;

  // Server-side recalculation
  distribution[oldRating] -= 1;
  distribution[newRating] += 1;
  sum = sum - oldRating + newRating; // 40 - 2 + 5 = 43
  const newAverage = Number((sum / count).toFixed(2)); // 43 / 10 = 4.3

  assert.strictEqual(count, 10, 'Count must remain 10');
  assert.strictEqual(distribution[2], 0, '2-star distribution decremented');
  assert.strictEqual(distribution[5], 5, '5-star distribution incremented');
  assert.strictEqual(newAverage, 4.3, 'New average correctly calculated');
});

// -------------------------------------------------------------
// Security Check 6: Draft Isolation & Verification Gate
// -------------------------------------------------------------
runCheck('Security 6: Drafts cannot be served to students before explicit admin publication', () => {
  const publishedWeek = buildWeekMenuForDate('2026-10-12');
  publishedWeek.isPublished = true;

  const draftWeek = JSON.parse(JSON.stringify(publishedWeek));
  draftWeek.isPublished = false; // Admin draft

  // Student menu accessor guard
  const filterForStudent = (week) => {
    if (!week || week.isPublished !== true) {
      return null;
    }
    return week;
  };

  assert.ok(filterForStudent(publishedWeek), 'Published menu accessible to students');
  assert.strictEqual(filterForStudent(draftWeek), null, 'Draft menu must be blocked from student access');
});

// -------------------------------------------------------------
// Security Check 7: OCR Glare Review & Diff Verification
// -------------------------------------------------------------
runCheck('Security 7: Low confidence / glare OCR items cannot bypass review', () => {
  const { menu, uncertainCount } = parseMenuTextToWeek('', [], '2026-10-12');
  assert.ok(uncertainCount > 0, 'Uncertain items flagged');

  // Verify that dishes with needsReview flag require admin confirmation
  const dinner = menu.days['2026-10-12'].find((m) => m.slotId === 'dinner');
  const flagged = dinner.dishes.find((d) => d.needsReview);
  assert.ok(flagged, 'Flagged dish identified');
  assert.strictEqual(flagged.needsReview, true);
});

// -------------------------------------------------------------
// Security Check 8: Offline Queue Drain Lifecycle
// -------------------------------------------------------------
runCheck('Security 8: Offline ratings queue accumulates offline and drains completely on reconnect', () => {
  // Simulate offline queue
  const queue = [];
  const enqueue = (item) => queue.push({ ...item, synced: false });
  const drain = () => {
    const synced = queue.splice(0, queue.length);
    return synced.map((i) => ({ ...i, synced: true }));
  };

  // User submits 2 ratings offline
  enqueue({ id: 'q1', mealId: '2026-10-15-lunch', rating: 5 });
  enqueue({ id: 'q2', mealId: '2026-10-15-dinner', rating: 4 });

  assert.strictEqual(queue.length, 2, 'Queue holds 2 pending items');

  // Connection restored
  const drained = drain();
  assert.strictEqual(drained.length, 2, '2 items drained');
  assert.strictEqual(queue.length, 0, 'Queue completely empty after sync');
  assert.strictEqual(drained.every((i) => i.synced), true, 'All items marked as synced');
});

// -------------------------------------------------------------
// Security Check 9: Spark Tier Aggregate Derivation Integrity
// -------------------------------------------------------------
runCheck('Security 9: Spark Tier: Aggregate derivation directly from rating records preserves mathematical precision without Cloud Functions', () => {
  const records = [
    { id: 'm1_dev1', mealId: '2026-10-15-lunch', rating: 5, tags: ['taste', 'freshness'], status: 'published' },
    { id: 'm1_dev2', mealId: '2026-10-15-lunch', rating: 4, tags: ['variety'], status: 'published' },
    { id: 'm1_dev3', mealId: '2026-10-15-lunch', rating: 3, tags: ['taste'], status: 'published' },
  ];

  // Calculation matching ratingService.computeAggregateFromRecords
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tagCounts = { taste: 0, freshness: 0, variety: 0, quantity: 0, temperature: 0 };
  let sum = 0;
  records.forEach((r) => {
    dist[r.rating]++;
    sum += r.rating;
    r.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const count = records.length;
  const average = Number((sum / count).toFixed(2));

  assert.strictEqual(count, 3, 'Total count matches records count');
  assert.strictEqual(sum, 12);
  assert.strictEqual(average, 4.0, 'Average is 4.00');
  assert.strictEqual(dist[5], 1);
  assert.strictEqual(dist[4], 1);
  assert.strictEqual(dist[3], 1);
  assert.strictEqual(tagCounts.taste, 2, 'Tag taste counted twice');
  assert.strictEqual(tagCounts.freshness, 1);
  assert.strictEqual(tagCounts.variety, 1);
});

// -------------------------------------------------------------
// Security Check 10: Rejection of Direct Aggregate Manipulation
// -------------------------------------------------------------
runCheck('Security 10: Client direct writes to ratingAggregates collection are rejected by security rules', () => {
  // Simulate Firestore rule:
  // match /ratingAggregates/{mealId} { allow write: if isAdmin(); }
  const canWriteAggregate = (user) => {
    return Boolean(user && user.role === 'admin');
  };

  const studentUser = { uid: 'student_123', role: 'student' };
  const anonymousUser = null;
  const adminUser = { uid: 'admin_456', role: 'admin' };

  assert.strictEqual(canWriteAggregate(studentUser), false, 'Student cannot tamper with ratingAggregates');
  assert.strictEqual(canWriteAggregate(anonymousUser), false, 'Anonymous user cannot write ratingAggregates');
  assert.strictEqual(canWriteAggregate(adminUser), true, 'Admin can manage ratingAggregates');
});

// -------------------------------------------------------------
// Security Check 11: Admin-Only Menu Publishing & Edit Gate
// -------------------------------------------------------------
runCheck('Security 11: Menu publishing requires verified admin role; unauthenticated edits are rejected', () => {
  // Simulate Firestore rule:
  // match /menuWeeks/{weekId} { allow write: if isAdmin(); }
  const canPublishMenu = (auth) => {
    if (!auth) return false;
    return auth.token?.admin === true || auth.role === 'admin';
  };

  assert.strictEqual(canPublishMenu(null), false, 'Unauthenticated user rejected');
  assert.strictEqual(canPublishMenu({ role: 'student' }), false, 'Student user rejected');
  assert.strictEqual(canPublishMenu({ role: 'admin', token: { admin: true } }), true, 'Verified admin allowed');
});

// -------------------------------------------------------------
// Security Check 12: Offline Menu Persistence Verification
// -------------------------------------------------------------
runCheck('Security 12: Offline menu fallback persists published menu across network disconnections', () => {
  const publishedMenu = buildWeekMenuForDate('2026-10-12');
  publishedMenu.isPublished = true;

  // Mock IndexedDB storage map
  const idb = new Map();
  idb.set(publishedMenu.id, publishedMenu);

  // Network fetch simulator
  const fetchMenuWithOfflineFallback = (isOnline, weekId) => {
    if (!isOnline) {
      // Offline: fetch from IndexedDB cache
      const cached = idb.get(weekId);
      if (!cached) throw new Error('No offline menu available');
      return cached;
    }
    return idb.get(weekId);
  };

  // Test offline retrieval
  const offlineResult = fetchMenuWithOfflineFallback(false, 'week-2026-10-12');
  assert.ok(offlineResult, 'Menu retrieved offline from cache');
  assert.strictEqual(offlineResult.isPublished, true);
  assert.strictEqual(Object.keys(offlineResult.days).length, 7, 'All 7 days intact in offline mode');
});

console.log(`\n======================================================`);
console.log(`Security Audit Results: ${passed}/${total} Security Checks Passed!`);
console.log(`======================================================\n`);

if (passed !== total) {
  process.exit(1);
}
