import React, { useState, useEffect } from 'react';
import { WeekMenu, MealOccurrence } from '@/types/menu';
import { RatingRecord, RatingAggregate } from '@/types/rating';
import { ratingService } from '@/services/ratingService';
import {
  Star,
  Shield,
  EyeOff,
  Flag,
  CheckCircle2,
  Filter,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { formatTime12h, formatFriendlyDate } from '@/utils/dateUtils';
import { authService } from '@/services/authService';

interface RatingModerationViewProps {
  weekMenu: WeekMenu;
}

export const RatingModerationView: React.FC<RatingModerationViewProps> = ({
  weekMenu,
}) => {
  const allMeals: MealOccurrence[] = Object.values(weekMenu.days).flat();
  const [selectedMealId, setSelectedMealId] = useState<string>(allMeals[0]?.id || '');
  const [reviews, setReviews] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const currentMeal = allMeals.find((m) => m.id === selectedMealId) || allMeals[0];
  const adminEmail = authService.getCurrentUser()?.email || 'admin@chitkara.edu.in';

  useEffect(() => {
    if (!currentMeal) return;
    setLoading(true);
    ratingService.getMealReviews(currentMeal.id).then((revs) => {
      setReviews(revs);
      setLoading(false);
    });
  }, [currentMeal?.id]);

  const handleModerate = async (reviewId: string, status: 'published' | 'hidden' | 'flagged') => {
    await ratingService.moderateReview(reviewId, status, adminEmail);
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status, isModerated: true } : r))
    );
    setActionNotice(`Review marked as ${status}. Audit log recorded.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const agg = currentMeal?.ratingSummary || { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const dist = agg.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalInDist = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-chitkara">
          <span>Live Campus Oversight</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
          Rating Analytics & Review Moderation
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor real-time student satisfaction, feedback tags, and moderate written reviews with full audit tracking.
        </p>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Meal Selection Dropdown / Horizontal Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Select Meal Occurrence to Inspect:
        </label>
        <select
          value={selectedMealId}
          onChange={(e) => setSelectedMealId(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
        >
          {allMeals.map((m) => {
            const mAvg = m.ratingSummary?.average ?? 0;
            const mCount = m.ratingSummary?.count ?? 0;
            return (
              <option key={m.id} value={m.id}>
                {m.dayOfWeek} {m.name} ({formatFriendlyDate(m.date)}) • {mCount > 0 ? `${mAvg.toFixed(1)}★ (${mCount} ratings)` : 'No ratings yet'}
              </option>
            );
          })}
        </select>
      </div>

      {currentMeal && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Rating Aggregate & 5-Star Distribution Bars */}
          <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Performance Score
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-amber-500">
                  {agg.average.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">
                  out of 5.0 ({agg.count} total ratings)
                </span>
              </div>
            </div>

            {/* Star Distribution Bars */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = (dist as any)[stars] || 0;
                const pct = Math.round((count / totalInDist) * 100);

                return (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-slate-700 flex items-center gap-0.5">
                      <span>{stars}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium text-slate-500 text-[11px]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
              <p>Dishes served in this meal:</p>
              <p className="font-semibold text-slate-700 mt-1 line-clamp-2">
                {currentMeal.dishes.map((d) => d.name).join(', ')}
              </p>
            </div>
          </div>

          {/* Right Column: Student Reviews & Moderation Controls */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Student Written Feedback ({reviews.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Anonymous device IDs masked</span>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-4">Loading feedback records...</p>
            ) : reviews.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                No written feedback submitted yet for this meal.
              </div>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      rev.status === 'hidden'
                        ? 'bg-slate-100/80 border-slate-300 opacity-60'
                        : rev.status === 'flagged'
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] font-bold text-slate-600 ml-1">
                          {rev.rating}.0
                        </span>
                        {rev.status !== 'published' && (
                          <span
                            className={`ml-2 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                              rev.status === 'hidden'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {rev.status}
                          </span>
                        )}
                      </div>

                      {/* Moderation Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleModerate(rev.id, 'published')}
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Approve / Keep Published"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleModerate(rev.id, 'flagged')}
                          className="p-1 rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Flag for Attention"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleModerate(rev.id, 'hidden')}
                          className="p-1 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                          title="Hide Review (Inappropriate/Abusive)"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Review text */}
                    {rev.comment && (
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        "{rev.comment}"
                      </p>
                    )}

                    {/* Tags */}
                    {rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rev.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold capitalize"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
