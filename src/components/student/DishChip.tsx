import React from 'react';
import { Dish } from '@/types/menu';
import { AlertCircle, Sparkles } from 'lucide-react';

interface DishChipProps {
  dish: Dish;
  showReviewBadge?: boolean;
}

export const DishChip: React.FC<DishChipProps> = ({ dish, showReviewBadge = true }) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
        dish.needsReview
          ? 'bg-amber-50/70 border-amber-300/80 text-amber-900'
          : dish.isSpecial
          ? 'bg-red-50/60 border-red-200 text-slate-900 shadow-2xs'
          : 'bg-white border-slate-200/90 text-slate-800'
      }`}
    >
      {/* Indian FSSAI Veg / Non-Veg Mark */}
      <span
        className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
          dish.isVegetarian
            ? 'border-emerald-600 bg-white'
            : 'border-red-700 bg-white'
        }`}
        title={dish.isVegetarian ? 'Vegetarian' : 'Contains Egg / Non-Veg'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-700'
          }`}
        />
      </span>

      {/* Dish Name */}
      <span className="leading-tight">{dish.name}</span>

      {/* Special item star */}
      {dish.isSpecial && (
        <span className="flex items-center text-[10px] uppercase font-bold tracking-wider text-chitkara bg-red-100/70 px-1.5 py-0.5 rounded-xs">
          Special
        </span>
      )}

      {/* OCR Review Warning Badge if flagged */}
      {showReviewBadge && dish.needsReview && (
        <span
          className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-xs"
          title={dish.reviewNote || 'Flagged for administrator review due to glare on printed menu'}
        >
          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="hidden sm:inline">Review</span>
        </span>
      )}
    </div>
  );
};
