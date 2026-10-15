import { WeekMenu, MealOccurrence, Dish } from '@/types/menu';

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DishDiffItem {
  id: string;
  type: DiffChangeType;
  date: string;
  dayName: string;
  slotId: string;
  mealName: string;
  oldDish?: Dish;
  newDish?: Dish;
  accepted: boolean; // default true for added/modified, false for removed
}

export interface WeekMenuDiffSummary {
  items: DishDiffItem[];
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
}

/**
 * Compares an existing published week menu against a newly extracted or proposed week menu.
 */
export function computeWeekDiff(
  existing: WeekMenu | null,
  proposed: WeekMenu
): WeekMenuDiffSummary {
  const items: DishDiffItem[] = [];

  const allDates = Array.from(
    new Set([
      ...Object.keys(existing?.days || {}),
      ...Object.keys(proposed.days || {}),
    ])
  ).sort();

  for (const date of allDates) {
    const existingMeals: MealOccurrence[] = existing?.days?.[date] || [];
    const proposedMeals: MealOccurrence[] = proposed.days?.[date] || [];

    // Find all slots
    const allSlotIds = Array.from(
      new Set([
        ...existingMeals.map((m) => m.slotId),
        ...proposedMeals.map((m) => m.slotId),
      ])
    );

    for (const slotId of allSlotIds) {
      const eMeal = existingMeals.find((m) => m.slotId === slotId);
      const pMeal = proposedMeals.find((m) => m.slotId === slotId);

      const dayName = pMeal?.dayOfWeek || eMeal?.dayOfWeek || 'Day';
      const mealName = pMeal?.name || eMeal?.name || slotId;

      const eDishes = eMeal?.dishes || [];
      const pDishes = pMeal?.dishes || [];

      // Match dishes by normalized name
      const matchedEDishes = new Set<string>();
      const matchedPDishes = new Set<string>();

      // 1. Direct matches & modified items
      pDishes.forEach((pDish) => {
        const pNorm = pDish.name.trim().toLowerCase();
        // Exact match
        const exact = eDishes.find((d) => d.name.trim().toLowerCase() === pNorm && !matchedEDishes.has(d.id));
        if (exact) {
          matchedEDishes.add(exact.id);
          matchedPDishes.add(pDish.id);
          items.push({
            id: `diff-${date}-${slotId}-${pDish.id}`,
            type: 'unchanged',
            date,
            dayName,
            slotId,
            mealName,
            oldDish: exact,
            newDish: pDish,
            accepted: true,
          });
          return;
        }

        // Fuzzy match: substring or category change
        const similar = eDishes.find((d) => {
          if (matchedEDishes.has(d.id)) return false;
          const eNorm = d.name.trim().toLowerCase();
          return (
            (eNorm.includes(pNorm) || pNorm.includes(eNorm)) &&
            Math.abs(eNorm.length - pNorm.length) < 8
          );
        });

        if (similar) {
          matchedEDishes.add(similar.id);
          matchedPDishes.add(pDish.id);
          items.push({
            id: `diff-${date}-${slotId}-${pDish.id}`,
            type: 'modified',
            date,
            dayName,
            slotId,
            mealName,
            oldDish: similar,
            newDish: pDish,
            accepted: true,
          });
          return;
        }

        // Otherwise this proposed dish is newly added
        matchedPDishes.add(pDish.id);
        items.push({
          id: `diff-${date}-${slotId}-${pDish.id}`,
          type: 'added',
          date,
          dayName,
          slotId,
          mealName,
          newDish: pDish,
          accepted: true,
        });
      });

      // 2. Any existing dishes that were not in proposed dishes are marked as removed
      eDishes.forEach((eDish) => {
        if (!matchedEDishes.has(eDish.id)) {
          items.push({
            id: `diff-${date}-${slotId}-${eDish.id}`,
            type: 'removed',
            date,
            dayName,
            slotId,
            mealName,
            oldDish: eDish,
            accepted: false, // Default to keep unless admin approves removal
          });
        }
      });
    }
  }

  const addedCount = items.filter((i) => i.type === 'added').length;
  const removedCount = items.filter((i) => i.type === 'removed').length;
  const modifiedCount = items.filter((i) => i.type === 'modified').length;
  const unchangedCount = items.filter((i) => i.type === 'unchanged').length;

  return {
    items,
    totalChanges: addedCount + removedCount + modifiedCount,
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
  };
}

/**
 * Applies the accepted diff items to produce a final published WeekMenu.
 */
export function applyAcceptedDiff(
  existing: WeekMenu | null,
  proposed: WeekMenu,
  diffItems: DishDiffItem[]
): WeekMenu {
  // If no existing menu, proposed is used directly
  if (!existing) return proposed;

  const result: WeekMenu = JSON.parse(JSON.stringify(proposed));

  // If a removal was NOT accepted by the admin, re-inject the old dish!
  const unacceptedRemovals = diffItems.filter((i) => i.type === 'removed' && !i.accepted && i.oldDish);
  for (const item of unacceptedRemovals) {
    if (!item.oldDish) continue;
    const dayMeals = result.days[item.date];
    if (dayMeals) {
      const meal = dayMeals.find((m) => m.slotId === item.slotId);
      if (meal) {
        meal.dishes.push(item.oldDish);
      }
    }
  }

  // If an addition was rejected by the admin, remove it!
  const unacceptedAdditions = diffItems.filter((i) => i.type === 'added' && !i.accepted && i.newDish);
  for (const item of unacceptedAdditions) {
    if (!item.newDish) continue;
    const dayMeals = result.days[item.date];
    if (dayMeals) {
      const meal = dayMeals.find((m) => m.slotId === item.slotId);
      if (meal) {
        meal.dishes = meal.dishes.filter((d) => d.id !== item.newDish?.id && d.name !== item.newDish?.name);
      }
    }
  }

  return result;
}
