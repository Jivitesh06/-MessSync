import React, { useState, useEffect } from 'react';
import { MealOccurrence } from '@/types/menu';
import { computeMealStatus, formatTime12h } from '@/utils/dateUtils';
import { DishChip } from './DishChip';
import { Star, Clock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { RatingAggregate, RatingRecord } from '@/types/rating';

interface MealCardProps {
  meal: MealOccurrence;
  onRateClick: (meal: MealOccurrence) => void;
  defaultExpanded?: boolean;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onRateClick,
  defaultExpanded = false,
}) => {
  const [liveAggregate, setLiveAggregate] = useState<RatingAggregate | null>(null);
  const [showReviews, setShowReviews] = useState<boolean>(false);
  const [reviews, setReviews] = useState<RatingRecord[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);

  useEffect(() => {
    const unsub = ratingService.subscribeToRating(meal.id, (agg) => {
      setLiveAggregate(agg);
    });
    return unsub;
  }, [meal.id]);

  const statusInfo = computeMealStatus(meal);
  const ratingAvg = liveAggregate ? liveAggregate.average : (meal.ratingSummary?.average ?? 0);
  const ratingCount = liveAggregate ? liveAggregate.count : (meal.ratingSummary?.count ?? 0);

  const handleToggleReviews = async () => {
    if (!showReviews && reviews.length === 0) {
      setLoadingReviews(true);
      const revs = await ratingService.getMealReviews(meal.id);
      setReviews(revs);
      setLoadingReviews(false);
    }
    setShowReviews(!showReviews);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden transition-all hover:border-slate-300">
      <div className="p-4 sm:p-5">
        {/* Header: Title, Timings, Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {meal.name}
              </h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.badgeColor}`}>
                {statusInfo.badgeText}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {formatTime12h(meal.startTime)} – {formatTime12h(meal.endTime)}
              </span>
            </div>
          </div>

          {/* Rating Pill / Quick Rate Button */}
          <button
            onClick={() => onRateClick(meal)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 text-xs font-bold active-press transition-colors shrink-0"
            title="Click to rate this meal"
          >
            <Star className={`w-3.5 h-3.5 ${ratingCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-amber-400/60'}`} />
            <span>{ratingCount > 0 ? ratingAvg.toFixed(1) : 'Rate'}</span>
            {ratingCount > 0 && (
              <span className="text-[10px] text-amber-700 font-medium hidden sm:inline">
                ({ratingCount})
              </span>
            )}
          </button>
        </div>

        {/* Dishes Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {meal.dishes.map((dish) => (
            <DishChip key={dish.id} dish={dish} />
          ))}
        </div>

        {/* Footer: Rating breakdown toggle & Rate action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={handleToggleReviews}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium py-1 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Student Feedback</span>
            {showReviews ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onRateClick(meal)}
            className="font-semibold text-chitkara hover:text-chitkara-dark py-1 px-2 rounded-md hover:bg-red-50 transition-colors"
          >
            Rate Meal
          </button>
        </div>

        {/* Expanded Student Feedback & Distribution */}
        {showReviews && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-3 bg-slate-50/70 -mx-4 -mb-4 p-4">
            {/* Tag breakdown */}
            {liveAggregate?.tagCounts && (
              <div>
                <p className="font-semibold text-slate-600 mb-1.5">What students like:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(liveAggregate.tagCounts).map(([tag, count]) => {
                    if (count <= 0) return null;
                    return (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-medium capitalize"
                      >
                        {tag}: <strong>{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent student comments */}
            <div>
              <p className="font-semibold text-slate-600 mb-1.5">Recent Comments:</p>
              {loadingReviews ? (
                <p className="text-slate-400">Loading student reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-slate-400 italic">No written reviews yet. Be the first to add one!</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {r.comment && <p className="text-slate-700 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
