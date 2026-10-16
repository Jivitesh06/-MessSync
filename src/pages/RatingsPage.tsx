import React, { useState } from 'react';
import { WeekMenu, MealOccurrence } from '@/types/menu';
import { Star, TrendingUp, Award, ThumbsUp, MessageSquare, Filter } from 'lucide-react';
import { formatTime12h, formatFriendlyDate } from '@/utils/dateUtils';
import { RatingModal } from '@/components/student/RatingModal';

interface RatingsPageProps {
  weekMenu: WeekMenu;
}

export const RatingsPage: React.FC<RatingsPageProps> = ({ weekMenu }) => {
  const [selectedSlot, setSelectedSlot] = useState<string>('all');
  const [selectedMealForRating, setSelectedMealForRating] = useState<MealOccurrence | null>(null);

  // Flatten all meals
  const allMeals: MealOccurrence[] = [];
  Object.values(weekMenu.days).forEach((meals) => {
    meals.forEach((m) => allMeals.push(m));
  });

  // Filter
  const filteredMeals = selectedSlot === 'all'
    ? allMeals
    : allMeals.filter((m) => m.slotId === selectedSlot);

  // Derive authentic ratings without mock fallbacks
  const ratedMeals = allMeals.filter((m) => (m.ratingSummary?.count ?? 0) > 0);
  const totalRatingsCampus = ratedMeals.reduce((acc, m) => acc + (m.ratingSummary?.count ?? 0), 0);
  const totalScoreSum = ratedMeals.reduce(
    (acc, m) => acc + (m.ratingSummary?.average ?? 0) * (m.ratingSummary?.count ?? 0),
    0
  );
  const campusOverallAvg =
    totalRatingsCampus > 0 ? (totalScoreSum / totalRatingsCampus).toFixed(2) : '—';

  // Sort by rating
  const sortedByRating = [...filteredMeals]
    .filter((m) => (m.ratingSummary?.count ?? 0) > 0)
    .sort((a, b) => (b.ratingSummary?.average ?? 0) - (a.ratingSummary?.average ?? 0));

  const topMeals = sortedByRating.slice(0, 5);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner Stats */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-elevated">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
          <Award className="w-4 h-4" />
          <span>Chitkara Live Student Ratings</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          Campus Mess Leaderboard
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Real-time, verified feedback from Chitkara hostel residents.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/80">
          <div className="bg-white/10 rounded-xl p-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 block">
              Campus Average
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-amber-400">{campusOverallAvg}</span>
              <span className="text-xs text-slate-300">/ 5.0</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 block">
              Confirmed Ratings
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-white">{totalRatingsCampus}</span>
              <span className="text-xs text-slate-300">reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'All Meals' },
          { id: 'breakfast', label: 'Breakfast' },
          { id: 'lunch', label: 'Lunch' },
          { id: 'snacks', label: 'Snacks' },
          { id: 'dinner', label: 'Dinner' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSlot(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedSlot === tab.id
                ? 'bg-chitkara text-white border-chitkara shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top Ranked Meals */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Highest-Rated Meals This Week
          </h3>
          <span className="text-xs text-slate-400">Ranked by students</span>
        </div>

        <div className="space-y-2.5">
          {topMeals.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-200/80 text-center space-y-2">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No student ratings recorded yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ratings will appear here in real-time as Chitkara students rate meals from the home screen.
              </p>
            </div>
          ) : (
            topMeals.map((meal, idx) => {
              const avg = meal.ratingSummary?.average ?? 0;
              const count = meal.ratingSummary?.count ?? 0;

              return (
                <div
                  key={meal.id}
                  className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : idx === 1
                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {meal.dayOfWeek} {meal.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {meal.dishes.map((d) => d.name).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{avg.toFixed(1)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {count} ratings
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedMealForRating(meal)}
                      className="px-2.5 py-1 text-xs font-semibold text-chitkara bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      Rate
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
