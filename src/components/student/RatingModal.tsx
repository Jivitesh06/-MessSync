import React, { useState, useEffect } from 'react';
import { MealOccurrence } from '@/types/menu';
import { FeedbackTag, AVAILABLE_FEEDBACK_TAGS, RatingRecord } from '@/types/rating';
import { ratingService } from '@/services/ratingService';
import { Star, X, Check, WifiOff, AlertCircle } from 'lucide-react';
import { formatTime12h, formatFriendlyDate } from '@/utils/dateUtils';

interface RatingModalProps {
  meal: MealOccurrence | null;
  isOpen: boolean;
  onClose: () => void;
  onRatingSubmitted?: (mealId: string) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  meal,
  isOpen,
  onClose,
  onRatingSubmitted,
}) => {
  const [stars, setStars] = useState<number>(5);
  const [hoverStars, setHoverStars] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<FeedbackTag[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [existingRating, setExistingRating] = useState<RatingRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && meal) {
      setSuccessMessage(null);
      // Check if device previously rated
      ratingService.getMyExistingRating(meal.id).then((rec) => {
        if (rec) {
          setExistingRating(rec);
          setStars(rec.rating);
          setSelectedTags(rec.tags);
          setComment(rec.comment || '');
        } else {
          setExistingRating(null);
          setStars(5);
          setSelectedTags([]);
          setComment('');
        }
      });
    }
  }, [isOpen, meal]);

  if (!isOpen || !meal) return null;

  const toggleTag = (tag: FeedbackTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await ratingService.submitRating({
        mealId: meal.id,
        date: meal.date,
        slotId: meal.slotId,
        mealName: meal.name,
        rating: stars,
        tags: selectedTags,
        comment,
      });

      if (res.isOfflinePending) {
        setSuccessMessage('Rating saved offline! It will sync automatically when back online.');
      } else if (res.isEdit) {
        setSuccessMessage('Your rating was updated! Thanks for keeping the menu accurate.');
      } else {
        setSuccessMessage('Thank you! Your rating has been counted in live campus feedback.');
      }

      onRatingSubmitted?.(meal.id);

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-chitkara uppercase tracking-wider">
              {formatFriendlyDate(meal.date)} • {meal.name}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Rate Today's Meal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <div className="p-5 overflow-y-auto space-y-5">
          {successMessage ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Recorded!</h4>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Device 1-rating notice if editing */}
              {existingRating && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">You have already rated this meal.</span> Submitting now will edit your previous rating and recalculate the average without double-counting.
                  </div>
                </div>
              )}

              {/* Star Selector */}
              <div className="text-center py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select your rating (1 to 5 Stars)
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isFilled = (hoverStars || stars) >= val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setStars(val)}
                        onMouseEnter={() => setHoverStars(val)}
                        onMouseLeave={() => setHoverStars(0)}
                        className="p-1.5 rounded-lg hover:scale-115 transition-transform active-press focus:outline-hidden"
                      >
                        <Star
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm font-bold text-slate-700 mt-2">
                  {stars === 5 && '🌟 Exceptional! Loved it'}
                  {stars === 4 && '👍 Great and tasty'}
                  {stars === 3 && '😐 Average mess meal'}
                  {stars === 2 && '👎 Below expectations'}
                  {stars === 1 && '⚠️ Very poor quality'}
                </p>
              </div>

              {/* Feedback Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  What stood out? (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_FEEDBACK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all active-press ${
                          isSelected
                            ? 'bg-red-50 text-chitkara border-chitkara font-bold shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{tag.icon}</span>
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Short Review */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Short Review (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">{comment.length}/300</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 300))}
                  placeholder="e.g. Kadai paneer had great gravy, rotis were soft and fresh..."
                  rows={3}
                  className="w-full text-sm rounded-xl border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:border-chitkara focus:ring-1 focus:ring-chitkara focus:outline-hidden"
                />
              </div>

              {/* Offline note */}
              {isOffline && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  <span>You're offline. Rating will be saved to your device and submitted upon reconnection.</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl font-bold text-white bg-chitkara hover:bg-chitkara-dark shadow-xs transition-colors active-press flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Star className="w-4 h-4 fill-white" />
                      <span>{existingRating ? 'Update Rating' : 'Submit Rating'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
