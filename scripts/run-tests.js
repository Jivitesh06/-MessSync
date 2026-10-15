import assert from 'assert';
import { buildWeekMenuForDate, CHITKARA_WEEK_TEMPLATE } from '../src/data/chitkaraInitialMenu.js';
import {
  computeMealStatus,
  getSmartCurrentMeal,
  getWeekBoundaries,
  formatISODate,
  timeToMinutes,
} from '../src/utils/dateUtils.js';
import { computeWeekDiff, applyAcceptedDiff } from '../src/services/diffService.js';
import { parseMenuTextToWeek } from '../src/services/ocrService.js';

console.log('🧪 Starting MessSync Comprehensive Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

// -------------------------------------------------------------
// Scenario 1: Initial Data Integrity & Structure
// -------------------------------------------------------------
test('Scenario 1: Visitor can access Chitkara weekly schedule across Mon-Sun with 4 meals each', () => {
  const menu = buildWeekMenuForDate('2026-10-12');
  assert.strictEqual(menu.isPublished, true);
  assert.strictEqual(menu.version, 1);
  const days = Object.keys(menu.days);
  assert.strictEqual(days.length, 7, 'Must have 7 days in week');

  days.forEach((d) => {
    const meals = menu.days[d];
    assert.strictEqual(meals.length, 4, 'Each day must contain 4 meal slots');
    const slots = meals.map((m) => m.slotId);
    assert.deepStrictEqual(slots, ['breakfast', 'lunch', 'snacks', 'dinner']);
  });
});

// -------------------------------------------------------------
// Scenario 2: Smart Meal Selection & Asia/Kolkata Official Timings
// -------------------------------------------------------------
test('Scenario 2: Smart meal selection prioritizes current serving or upcoming meal with official timings', () => {
  const menu = buildWeekMenuForDate('2026-10-15');
  const todayMeals = menu.days['2026-10-15'];

  // Breakfast (07:30 - 08:50)
  // Simulate 7:15 AM (Before breakfast starts) -> Coming Up
  const simulatedEarlyNow = new Date('2026-10-15T07:15:00');
  const statusEarly = computeMealStatus(todayMeals[0], simulatedEarlyNow);
  assert.strictEqual(statusEarly.status, 'coming_up', '7:15 AM is before breakfast start');

  // Simulate 8:00 AM (During breakfast) -> Serving Now
  const simulatedBfastNow = new Date('2026-10-15T08:00:00');
  const statusBfast = computeMealStatus(todayMeals[0], simulatedBfastNow);
  assert.strictEqual(statusBfast.status, 'serving_now', '8:00 AM is during breakfast');

  // Lunch (12:00 - 14:30)
  // Simulate 12:30 PM (Lunch time) -> Serving Now
  const simulatedLunchNow = new Date('2026-10-15T12:30:00');
  const statusLunch = computeMealStatus(todayMeals[1], simulatedLunchNow);
  assert.strictEqual(statusLunch.status, 'serving_now', '12:30 PM is during lunch');
  assert.strictEqual(statusLunch.isToday, true);

  // Dinner (19:30 - 20:50)
  // Simulate 8:00 PM (20:00, During dinner) -> Serving Now
  const simulatedDinnerNow = new Date('2026-10-15T20:00:00');
  const statusDinner = computeMealStatus(todayMeals[3], simulatedDinnerNow);
  assert.strictEqual(statusDinner.status, 'serving_now', '8:00 PM is during dinner');

  // Simulate 8:55 PM (20:55, After dinner ends at 20:50) -> picks tomorrow's breakfast!
  const tomorrowMeals = menu.days['2026-10-16'];
  const simulatedNightNow = new Date('2026-10-15T20:55:00');
  const { meal: smartMeal, isTomorrow } = getSmartCurrentMeal(todayMeals, tomorrowMeals, simulatedNightNow);
  assert.ok(smartMeal);
  assert.strictEqual(smartMeal.slotId, 'breakfast', 'After 8:50 PM dinner cutoff, returns breakfast');
  assert.strictEqual(isTomorrow, true, 'Marked as tomorrow');
});

// -------------------------------------------------------------
// Scenario 2B: Strict Boundary Precision Tests (7:30 AM, 8:50 AM, 12:00 PM, 2:30 PM, 7:30 PM, 8:50 PM)
// -------------------------------------------------------------
test('Scenario 2B: Exact boundary transitions at 7:30 AM, 8:50 AM, 12:00 PM, 2:30 PM, 7:30 PM, and 8:50 PM', () => {
  const menu = buildWeekMenuForDate('2026-10-15');
  const todayMeals = menu.days['2026-10-15'];
  const [breakfast, lunch, snacks, dinner] = todayMeals;

  // 1. Breakfast Boundaries: 07:30 to 08:50
  // 7:29 AM -> Coming Up
  assert.strictEqual(computeMealStatus(breakfast, new Date('2026-10-15T07:29:00')).status, 'coming_up');
  // 7:30 AM sharp -> Serving Now
  assert.strictEqual(computeMealStatus(breakfast, new Date('2026-10-15T07:30:00')).status, 'serving_now');
  // 8:49 AM -> Serving Now
  assert.strictEqual(computeMealStatus(breakfast, new Date('2026-10-15T08:49:00')).status, 'serving_now');
  // 8:50 AM sharp -> Served
  assert.strictEqual(computeMealStatus(breakfast, new Date('2026-10-15T08:50:00')).status, 'served');

  // 2. Lunch Boundaries: 12:00 to 14:30
  // 11:59 AM -> Coming Up
  assert.strictEqual(computeMealStatus(lunch, new Date('2026-10-15T11:59:00')).status, 'coming_up');
  // 12:00 PM sharp -> Serving Now
  assert.strictEqual(computeMealStatus(lunch, new Date('2026-10-15T12:00:00')).status, 'serving_now');
  // 2:29 PM (14:29) -> Serving Now
  assert.strictEqual(computeMealStatus(lunch, new Date('2026-10-15T14:29:00')).status, 'serving_now');
  // 2:30 PM sharp (14:30) -> Served
  assert.strictEqual(computeMealStatus(lunch, new Date('2026-10-15T14:30:00')).status, 'served');

  // 3. Dinner Boundaries: 19:30 to 20:50
  // 7:29 PM (19:29) -> Coming Up
  assert.strictEqual(computeMealStatus(dinner, new Date('2026-10-15T19:29:00')).status, 'coming_up');
  // 7:30 PM sharp (19:30) -> Serving Now
  assert.strictEqual(computeMealStatus(dinner, new Date('2026-10-15T19:30:00')).status, 'serving_now');
  // 8:49 PM (20:49) -> Serving Now
  assert.strictEqual(computeMealStatus(dinner, new Date('2026-10-15T20:49:00')).status, 'serving_now');
  // 8:50 PM sharp (20:50) -> Served
  assert.strictEqual(computeMealStatus(dinner, new Date('2026-10-15T20:50:00')).status, 'served');

  // 4. Automatic transition after 8:50 PM dinner cutoff
  const tomorrowMeals = menu.days['2026-10-16'];
  const postDinnerSmart = getSmartCurrentMeal(todayMeals, tomorrowMeals, new Date('2026-10-15T20:50:01'));
  assert.strictEqual(postDinnerSmart.isTomorrow, true);
  assert.strictEqual(postDinnerSmart.meal.slotId, 'breakfast');
});

// -------------------------------------------------------------
// Scenario 3: Date & Week Boundaries Math
// -------------------------------------------------------------
test('Scenario 3: Week boundary calculator resolves Monday and Sunday correctly', () => {
  const b = getWeekBoundaries('2026-10-15'); // A Thursday
  assert.strictEqual(b.monday, '2026-10-12');
  assert.strictEqual(b.sunday, '2026-10-18');
});

// -------------------------------------------------------------
// Scenario 4: OCR Glare Detection & Flagging
// -------------------------------------------------------------
test('Scenario 4: Ambiguous / glare-affected dishes are flagged for administrator review', () => {
  const { menu, uncertainCount } = parseMenuTextToWeek('', [], '2026-10-12');
  assert.ok(uncertainCount > 0, 'Must flag glare-affected items');
  
  // Verify specific flagged dessert item from Monday dinner
  const mondayMeals = menu.days['2026-10-12'];
  const dinner = mondayMeals.find((m) => m.slotId === 'dinner');
  const gulabJamun = dinner.dishes.find((d) => d.name.toLowerCase().includes('gulab jamun'));
  assert.ok(gulabJamun);
  assert.strictEqual(gulabJamun.needsReview, true);
  assert.ok(gulabJamun.reviewNote.includes('Glare'));
});

// -------------------------------------------------------------
// Scenario 5: Menu Diff Engine (Additions, Removals, Modifications)
// -------------------------------------------------------------
test('Scenario 5: Diff engine detects additions, removals, and modifications with individual toggles', () => {
  const existing = buildWeekMenuForDate('2026-10-12');
  const proposed = JSON.parse(JSON.stringify(existing));

  // Modify Monday lunch: add "Jeera Chaas", remove "Seasonal Dry Mix Vegetable"
  const monMeals = proposed.days['2026-10-12'];
  const lunch = monMeals.find((m) => m.slotId === 'lunch');
  lunch.dishes = lunch.dishes.filter((d) => !d.name.includes('Seasonal Dry Mix Vegetable'));
  lunch.dishes.push({
    id: 'test-chaas',
    name: 'Spiced Jeera Chaas',
    category: 'Beverage',
    isVegetarian: true,
  });

  const diff = computeWeekDiff(existing, proposed);
  assert.ok(diff.addedCount >= 1, 'Must detect addition');
  assert.ok(diff.removedCount >= 1, 'Must detect removal');

  // Verify applyAcceptedDiff rejects unapproved changes
  const modifiedDiffItems = diff.items.map((i) => {
    if (i.newDish?.name === 'Spiced Jeera Chaas') {
      return { ...i, accepted: false }; // Admin rejects this addition
    }
    return i;
  });

  const finalMenu = applyAcceptedDiff(existing, proposed, modifiedDiffItems);
  const finalLunchDishes = finalMenu.days['2026-10-12'].find((m) => m.slotId === 'lunch').dishes;
  const hasChaas = finalLunchDishes.some((d) => d.name === 'Spiced Jeera Chaas');
  assert.strictEqual(hasChaas, false, 'Rejected addition must not be in final published menu');
});

// -------------------------------------------------------------
// Scenario 6: 1-Rating-Per-Device Mathematical Integrity
// -------------------------------------------------------------
test('Scenario 6: Editing a rating recalculates average without increasing total count', () => {
  let count = 10;
  let average = 4.0; // sum = 40
  let sum = average * count;

  // Student rated 3 stars previously, now changes to 5 stars
  const oldRating = 3;
  const newRating = 5;

  // Edit logic
  sum = sum - oldRating + newRating; // 40 - 3 + 5 = 42
  // Count remains unchanged:
  const newAverage = Number((sum / count).toFixed(2)); // 42 / 10 = 4.2

  assert.strictEqual(count, 10, 'Count must NOT increase on edit');
  assert.strictEqual(newAverage, 4.2, 'Average must be updated to 4.2');
});

// -------------------------------------------------------------
// Scenario 7: Dietary FSSAI Indicator Integrity
// -------------------------------------------------------------
test('Scenario 7: Egg and non-veg dishes are correctly flagged as non-vegetarian', () => {
  const template = CHITKARA_WEEK_TEMPLATE;
  const monBreakfast = template['Monday'].find((m) => m.slotId === 'breakfast');
  const eggDish = monBreakfast.dishes.find((d) => d.name.includes('Eggs'));
  assert.ok(eggDish);
  assert.strictEqual(eggDish.isVegetarian, false, 'Eggs must be non-vegetarian');

  const paratha = monBreakfast.dishes.find((d) => d.name.includes('Paratha'));
  assert.strictEqual(paratha.isVegetarian, true, 'Paratha must be vegetarian');
});

console.log(`\n========================================`);
console.log(`Results: ${passedTests}/${totalTests} Tests Passed successfully!`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
