import { MealOccurrence } from '@/types/menu';

/**
 * Returns current Date in Asia/Kolkata timezone
 */
export function getNowInIST(): Date {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

/**
 * Formats a Date into "YYYY-MM-DD"
 */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's ISO date string in Asia/Kolkata (e.g. "2026-10-15")
 */
export function getTodayIST(): string {
  return formatISODate(getNowInIST());
}

/**
 * Formats 24-hour time "07:00" to "7:00 AM"
 */
export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  return `${h}:${m} ${ampm}`;
}

/**
 * Converts "HH:MM" to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

export type MealLiveStatus = 'serving_now' | 'coming_up' | 'served' | 'unavailable';

export interface MealStatusDetails {
  status: MealLiveStatus;
  badgeText: string;
  badgeColor: string; // Tailwind class
  countdownText?: string;
  isToday: boolean;
}

/**
 * Computes live status and countdown for a meal based on current IST time
 */
export function computeMealStatus(meal: MealOccurrence, targetNow?: Date): MealStatusDetails {
  const now = targetNow || getNowInIST();
  const todayStr = formatISODate(now);
  const isToday = meal.date === todayStr;
  const isPastDate = meal.date < todayStr;
  const isFutureDate = meal.date > todayStr;

  if (isPastDate) {
    return {
      status: 'served',
      badgeText: 'Served',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      isToday: false,
    };
  }

  if (isFutureDate) {
    return {
      status: 'coming_up',
      badgeText: 'Upcoming',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      isToday: false,
    };
  }

  // It's today
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(meal.startTime);
  const endMin = timeToMinutes(meal.endTime);

  if (currentMinutes >= startMin && currentMinutes < endMin) {
    const diffMin = endMin - currentMinutes;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    const timeRemaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      status: 'serving_now',
      badgeText: 'Serving Now',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold animate-pulse',
      countdownText: `Closes in ${timeRemaining}`,
      isToday: true,
    };
  } else if (currentMinutes < startMin) {
    const diffMin = startMin - currentMinutes;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    const timeUntil = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      status: 'coming_up',
      badgeText: 'Coming Up',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold',
      countdownText: `Starts in ${timeUntil}`,
      isToday: true,
    };
  } else {
    return {
      status: 'served',
      badgeText: 'Served',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      countdownText: 'Ended today',
      isToday: true,
    };
  }
}

/**
 * Finds the smartest meal to show on the student home screen:
 * 1. If a meal is currently serving, return it.
 * 2. If an upcoming meal exists today, return the next upcoming one.
 * 3. If dinner has ended today, return tomorrow's breakfast!
 * 4. Fallback: first meal of today.
 */
export function getSmartCurrentMeal(
  todayMeals: MealOccurrence[],
  tomorrowMeals?: MealOccurrence[],
  targetNow?: Date
): { meal: MealOccurrence | null; isTomorrow: boolean } {
  if (!todayMeals || todayMeals.length === 0) {
    return { meal: null, isTomorrow: false };
  }

  const now = targetNow || getNowInIST();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Is any meal serving right now?
  const serving = todayMeals.find((m) => {
    const s = timeToMinutes(m.startTime);
    const e = timeToMinutes(m.endTime);
    return currentMinutes >= s && currentMinutes < e;
  });
  if (serving) {
    return { meal: serving, isTomorrow: false };
  }

  // 2. Is any meal coming up later today?
  const upcoming = todayMeals.filter((m) => timeToMinutes(m.startTime) > currentMinutes);
  if (upcoming.length > 0) {
    // Earliest upcoming
    upcoming.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return { meal: upcoming[0], isTomorrow: false };
  }

  // 3. All meals for today have ended (after dinner ends at 20:50 IST). Show tomorrow's breakfast!
  if (tomorrowMeals && tomorrowMeals.length > 0) {
    const tomorrowBreakfast = tomorrowMeals.find((m) => m.slotId === 'breakfast') || tomorrowMeals[0];
    return { meal: tomorrowBreakfast, isTomorrow: true };
  }

  // Fallback: If tomorrow's week isn't loaded yet (e.g. Sunday evening), construct tomorrow's breakfast
  const todayBreakfast = todayMeals.find((m) => m.slotId === 'breakfast') || todayMeals[0];
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDateStr = formatISODate(tomorrowDate);

  return {
    meal: {
      ...todayBreakfast,
      id: `${tomorrowDateStr}-breakfast`,
      date: tomorrowDateStr,
      dayOfWeek: tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' }) as MealOccurrence['dayOfWeek'],
    },
    isTomorrow: true,
  };
}

/**
 * Given any date, returns the Monday and Sunday ISO dates of that week
 */
export function getWeekBoundaries(dateStr: string): { monday: string; sunday: string; label: string } {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const monStr = formatISODate(monday);
  const sunStr = formatISODate(sunday);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const label = `${monday.toLocaleDateString('en-US', options)} – ${sunday.toLocaleDateString('en-US', options)}, ${sunday.getFullYear()}`;

  return { monday: monStr, sunday: sunStr, label };
}

/**
 * Returns formatted human date: "Thursday, Oct 15"
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
