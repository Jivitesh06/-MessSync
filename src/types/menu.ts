export type MealCategory = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface Dish {
  id: string;
  name: string;
  category?: 'Main' | 'Breads' | 'Rice' | 'Dessert' | 'Beverage' | 'Sides' | 'Salad';
  isVegetarian: boolean;
  isSpecial?: boolean;
  needsReview?: boolean; // Flagged when OCR text has low confidence or glare
  reviewNote?: string;
}

export interface MealOccurrence {
  id: string; // Deterministic: e.g. "2026-10-15-lunch"
  date: string; // "YYYY-MM-DD"
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  slotId: MealCategory | string;
  name: string; // "Breakfast", "Lunch", "Evening Tea & Snacks", "Dinner"
  startTime: string; // "07:00" (24h)
  endTime: string; // "10:00" (24h)
  dishes: Dish[];
  ratingSummary?: {
    average: number;
    count: number;
    distribution?: Record<number, number>;
  };
  notes?: string;
  publishedVersion?: number;
  updatedAt: string;
}

export interface WeekMenu {
  id: string; // "week-2026-10-12"
  startDate: string; // "2026-10-12" (Monday)
  endDate: string; // "2026-10-18" (Sunday)
  label: string;
  isPublished: boolean;
  publishedAt?: string;
  publishedBy?: string;
  version: number;
  days: Record<string, MealOccurrence[]>; // date "YYYY-MM-DD" -> array of 4 meals
  sourcePhotoUrl?: string;
}

export interface MenuDraft {
  id: string;
  weekId: string;
  startDate: string;
  endDate: string;
  label: string;
  days: Record<string, MealOccurrence[]>;
  sourcePhotoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  hasUncertainDishes: boolean;
}

export interface MenuVersion {
  id: string;
  weekId: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  data: WeekMenu;
  changeSummary: string;
}

export interface MealTimingConfig {
  slotId: string;
  name: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}
