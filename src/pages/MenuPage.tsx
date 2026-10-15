import React, { useState } from 'react';
import { WeekMenu, MealOccurrence } from '@/types/menu';
import { DaySelector } from '@/components/student/DaySelector';
import { MealCard } from '@/components/student/MealCard';
import { RatingModal } from '@/components/student/RatingModal';
import { formatFriendlyDate, getTodayIST, getWeekBoundaries } from '@/utils/dateUtils';
import { Search, LayoutGrid, Calendar, Filter } from 'lucide-react';
import { mealTimingService } from '@/services/mealTimingService';

interface MenuPageProps {
  weekMenu: WeekMenu;
  onOpenSearch: () => void;
  onNavigateWeek: (offsetDays: number) => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({
  weekMenu,
  onOpenSearch,
  onNavigateWeek,
}) => {
  const todayStr = getTodayIST();
  const availableDates = Object.keys(weekMenu.days).sort();
  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates.includes(todayStr) ? todayStr : availableDates[0] || todayStr
  );
  const [selectedMealForRating, setSelectedMealForRating] = useState<MealOccurrence | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'overview'>('cards');
  const [timings, setTimings] = useState(mealTimingService.getCurrentTimings());

  React.useEffect(() => {
    return mealTimingService.subscribeToTimings((t) => setTimings(t));
  }, []);

  const mealsForDate = weekMenu.days[selectedDate] || [];

  return (
    <div className="space-y-5 pb-20">
      {/* Top Controls: Search & View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-slate-400 hover:border-slate-300 hover:text-slate-600 shadow-2xs transition-colors"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="text-xs sm:text-sm">Search any dish in menu...</span>
        </button>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode('overview')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Week & Day Selector */}
      <DaySelector
        dates={availableDates}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate(d)}
        onPreviousWeek={() => onNavigateWeek(-7)}
        onNextWeek={() => onNavigateWeek(7)}
        weekLabel={weekMenu.label}
      />

      {/* View Mode 1: Daily Cards */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {formatFriendlyDate(selectedDate)}
            </h2>
            <span className="text-xs text-slate-400">
              {mealsForDate.length} meals scheduled
            </span>
          </div>

          {mealsForDate.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
              No published meals found for this date.
            </div>
          ) : (
            mealsForDate.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onRateClick={(m) => setSelectedMealForRating(m)}
              />
            ))
          )}
        </div>
      )}

      {/* View Mode 2: Weekly Overview Table */}
      {viewMode === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="text-sm font-bold text-slate-900">
              Weekly Timetable Overview ({weekMenu.label})
            </h3>
            <p className="text-xs text-slate-500">
              Scroll horizontally to see all days and meal categories.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[100px]">
                    Day
                  </th>
                  <th className="p-3 border-r border-slate-200 min-w-[180px]">
                    Breakfast ({timings.breakfast.startTime}–{timings.breakfast.endTime})
                  </th>
                  <th className="p-3 border-r border-slate-200 min-w-[200px]">
                    Lunch ({timings.lunch.startTime}–{timings.lunch.endTime})
                  </th>
                  <th className="p-3 border-r border-slate-200 min-w-[180px]">
                    Snacks ({timings.snacks.startTime}–{timings.snacks.endTime})
                  </th>
                  <th className="p-3 min-w-[200px]">
                    Dinner ({timings.dinner.startTime}–{timings.dinner.endTime})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {availableDates.map((dateStr) => {
                  const meals = weekMenu.days[dateStr] || [];
                  const isCurrentDay = dateStr === todayStr;

                  const getMealDishes = (slot: string) => {
                    const m = meals.find((x) => x.slotId === slot);
                    if (!m) return '—';
                    return m.dishes.map((d) => d.name).join(', ');
                  };

                  const d = new Date(dateStr + 'T12:00:00Z');
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = d.getUTCDate();

                  return (
                    <tr
                      key={dateStr}
                      className={isCurrentDay ? 'bg-red-50/40 font-medium' : 'hover:bg-slate-50/50'}
                    >
                      <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{dayName} {dayNum}</span>
                          {isCurrentDay && (
                            <span className="w-2 h-2 rounded-full bg-chitkara" title="Today" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-700 leading-relaxed">
                        {getMealDishes('breakfast')}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-700 leading-relaxed">
                        {getMealDishes('lunch')}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-700 leading-relaxed">
                        {getMealDishes('snacks')}
                      </td>
                      <td className="p-3 text-slate-700 leading-relaxed">
                        {getMealDishes('dinner')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      <RatingModal
        meal={selectedMealForRating}
        isOpen={Boolean(selectedMealForRating)}
        onClose={() => setSelectedMealForRating(null)}
      />
    </div>
  );
};
