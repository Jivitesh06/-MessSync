import React, { useState } from 'react';
import { WeekMenu, MealOccurrence } from '@/types/menu';
import { CurrentMealHero } from '@/components/student/CurrentMealHero';
import { MealCard } from '@/components/student/MealCard';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import { RatingModal } from '@/components/student/RatingModal';
import { getSmartCurrentMeal, getTodayIST, formatFriendlyDate } from '@/utils/dateUtils';
import { Sparkles, CalendarDays, Search, WifiOff, Clock } from 'lucide-react';

interface HomePageProps {
  weekMenu: WeekMenu;
  onNavigateToTab: (tab: any) => void;
  onOpenSearch: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  weekMenu,
  onNavigateToTab,
  onOpenSearch,
}) => {
  const [selectedMealForRating, setSelectedMealForRating] = useState<MealOccurrence | null>(null);

  const todayStr = getTodayIST();
  const todayMeals = weekMenu.days[todayStr] || Object.values(weekMenu.days)[0] || [];

  // Tomorrow meals (for smart next-day breakfast after dinner)
  const allDates = Object.keys(weekMenu.days).sort();
  const todayIndex = allDates.indexOf(todayStr);
  const tomorrowStr = todayIndex !== -1 && todayIndex + 1 < allDates.length ? allDates[todayIndex + 1] : undefined;
  const tomorrowMeals = tomorrowStr ? weekMenu.days[tomorrowStr] : undefined;

  const { meal: smartMeal, isTomorrow } = getSmartCurrentMeal(todayMeals, tomorrowMeals);

  return (
    <div className="space-y-6 pb-20">
      {/* Search quick button */}
      <button
        onClick={onOpenSearch}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-400 hover:border-slate-300 hover:text-slate-600 shadow-2xs transition-all active-press"
      >
        <div className="flex items-center gap-2.5 text-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <span>Search dish (e.g. Paneer, Rajma, Halwa)...</span>
        </div>
        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
          Search
        </span>
      </button>

      {/* Prominent Smart Current/Upcoming Meal Hero */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-chitkara animate-ping" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isTomorrow ? "Tomorrow's Highlight" : 'Right Now on Campus'}
            </h2>
          </div>
          <span className="text-xs font-semibold text-chitkara">
            {isTomorrow ? 'Starts 7:00 AM' : 'Live Status'}
          </span>
        </div>

        <CurrentMealHero
          meal={smartMeal}
          isTomorrow={isTomorrow}
          onRateClick={(meal) => setSelectedMealForRating(meal)}
          onViewDayMenu={() => {
            const el = document.getElementById('full-day-schedule');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </section>

      {/* Install PWA Prompt */}
      <InstallPrompt />

      {/* Today's Complete 4-Meal Schedule */}
      <section id="full-day-schedule" className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Today's Complete Menu
            </h3>
            <p className="text-xs text-slate-500">
              {formatFriendlyDate(todayStr)} • Chitkara University Mess
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('menu')}
            className="text-xs font-bold text-chitkara hover:text-chitkara-dark flex items-center gap-1 hover:underline"
          >
            <span>Full Week</span>
            <CalendarDays className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {todayMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onRateClick={(m) => setSelectedMealForRating(m)}
            />
          ))}
        </div>
      </section>

      {/* Rating Modal */}
      <RatingModal
        meal={selectedMealForRating}
        isOpen={Boolean(selectedMealForRating)}
        onClose={() => setSelectedMealForRating(null)}
      />
    </div>
  );
};
