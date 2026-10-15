export interface MealSlotTiming {
  slotId: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  name: string;
  startTime: string; // 24-hour "HH:MM"
  endTime: string;   // 24-hour "HH:MM"
  isConfigurablePlaceholder?: boolean;
  note?: string;
}

export type MealTimingsConfig = Record<'breakfast' | 'lunch' | 'snacks' | 'dinner', MealSlotTiming>;

/**
 * Official Chitkara University Mess Service Timings.
 * - Breakfast: 7:30 AM – 8:50 AM
 * - Lunch: 12:00 PM – 2:30 PM
 * - Dinner: 7:30 PM – 8:50 PM
 * - Evening Tea & Snacks: Kept as existing category, configurable via Admin Panel.
 */
export const DEFAULT_CHITKARA_TIMINGS: MealTimingsConfig = {
  breakfast: {
    slotId: 'breakfast',
    name: 'Breakfast',
    startTime: '07:30',
    endTime: '08:50',
  },
  lunch: {
    slotId: 'lunch',
    name: 'Lunch',
    startTime: '12:00',
    endTime: '14:30',
  },
  snacks: {
    slotId: 'snacks',
    name: 'Evening Tea & Snacks',
    startTime: '16:30',
    endTime: '17:30',
    isConfigurablePlaceholder: true,
    note: 'Configurable in admin panel until official notice is provided',
  },
  dinner: {
    slotId: 'dinner',
    name: 'Dinner',
    startTime: '19:30',
    endTime: '20:50',
  },
};

/**
 * Validates a 24-hour time string in HH:MM format
 */
export function isValidTimeString(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const match = timeStr.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return Boolean(match);
}

/**
 * Validates that a meal timing has valid format and start < end
 */
export function validateMealTiming(timing: MealSlotTiming): { valid: boolean; error?: string } {
  if (!isValidTimeString(timing.startTime)) {
    return { valid: false, error: `${timing.name} start time must be in HH:MM format (00:00-23:59).` };
  }
  if (!isValidTimeString(timing.endTime)) {
    return { valid: false, error: `${timing.name} end time must be in HH:MM format (00:00-23:59).` };
  }

  const [sh, sm] = timing.startTime.split(':').map(Number);
  const [eh, em] = timing.endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin >= endMin) {
    return { valid: false, error: `${timing.name} start time (${timing.startTime}) must be strictly before end time (${timing.endTime}).` };
  }

  return { valid: true };
}
