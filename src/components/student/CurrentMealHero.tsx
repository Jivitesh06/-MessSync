import React, { useState, useEffect } from 'react';
import { MealOccurrence } from '@/types/menu';
import { computeMealStatus, formatTime12h, formatFriendlyDate, getNowInIST } from '@/utils/dateUtils';
import { DishChip } from './DishChip';
import { Star, Clock, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { RatingAggregate } from '@/types/rating';

interface CurrentMealHeroProps {
  meal: MealOccurrence | null;
  isTomorrow?: boolean;
  onRateClick: (meal: MealOccurrence) => void;
  onViewDayMenu?: () => void;
}

export const CurrentMealHero: React.FC<CurrentMealHeroProps> = ({
  meal,
  isTomorrow = false,
  onRateClick,
  onViewDayMenu,
}) => {
  // Tick every 15 seconds so status and countdown update automatically without page reload
  const [now, setNow] = useState<Date>(getNowInIST());
  const [liveAggregate, setLiveAggregate] = useState<RatingAggregate | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getNowInIST());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to live rating updates for this meal
  useEffect(() => {
    if (!meal) return;
    const unsub = ratingService.subscribeToRating(meal.id, (agg) => {
      setLiveAggregate(agg);
    });
    return unsub;
  }, [meal?.id]);

  if (!meal) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center">
        <p className="text-slate-500 font-medium">No meal schedule available for this time.</p>
      </div>
    );
  }

  const statusInfo = computeMealStatus(meal, now);
  const ratingAvg = liveAggregate ? liveAggregate.average : meal.ratingSummary?.average || 4.2;
  const ratingCount = liveAggregate ? liveAggregate.count : meal.ratingSummary?.count || 28;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-elevated transition-all">
      {/* Top Brand Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-chitkara via-red-500 to-amber-500" />

      <div className="p-5 sm:p-6">
        {/* Header row: Context tag & Status badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {isTomorrow ? 'Tomorrow' : formatFriendlyDate(meal.date)} •{' '}
              {formatTime12h(meal.startTime)} – {formatTime12h(meal.endTime)}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeColor}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusInfo.status === 'serving_now'
                    ? 'bg-emerald-500 animate-ping'
                    : statusInfo.status === 'coming_up'
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />
              {statusInfo.badgeText}
            </span>
          </div>
        </div>

        {/* Meal Name & Countdown */}
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {meal.name}
          </h2>
          {statusInfo.countdownText && (
            <span className="text-xs sm:text-sm font-semibold text-chitkara bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
              {statusInfo.countdownText}
            </span>
          )}
        </div>

        {/* Rating summary strip */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-800 text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{ratingAvg.toFixed(1)}</span>
          </div>
          <span className="text-xs text-slate-500">
            Based on <strong className="text-slate-700 font-semibold">{ratingCount}</strong> student ratings
          </span>
        </div>

        {/* Dishes List */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Today's Dishes & Specialties
          </h3>
          <div className="flex flex-wrap gap-2">
            {meal.dishes.map((dish) => (
              <DishChip key={dish.id} dish={dish} />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => onRateClick(meal)}
            className="flex-1 flex items-center justify-center gap-2 bg-chitkara text-white hover:bg-chitkara-dark px-4 py-2.5 rounded-xl font-semibold text-sm shadow-xs transition-colors active-press"
          >
            <Star className="w-4 h-4 fill-white/80" />
            <span>Rate This Meal</span>
          </button>

          {onViewDayMenu && (
            <button
              onClick={onViewDayMenu}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors active-press"
            >
              <span>Full Day</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
