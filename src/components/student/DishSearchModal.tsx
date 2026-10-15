import React, { useState } from 'react';
import { WeekMenu, MealOccurrence, Dish } from '@/types/menu';
import { Search, X, Calendar, Clock, ChevronRight } from 'lucide-react';
import { formatTime12h, formatFriendlyDate } from '@/utils/dateUtils';
import { DishChip } from './DishChip';

interface DishSearchModalProps {
  weekMenu: WeekMenu;
  isOpen: boolean;
  onClose: () => void;
  onSelectMeal?: (date: string, mealId: string) => void;
}

interface SearchResult {
  dish: Dish;
  date: string;
  dayOfWeek: string;
  mealName: string;
  slotId: string;
  startTime: string;
  endTime: string;
  mealId: string;
}

export const DishSearchModal: React.FC<DishSearchModalProps> = ({
  weekMenu,
  isOpen,
  onClose,
  onSelectMeal,
}) => {
  const [queryText, setQueryText] = useState<string>('');

  if (!isOpen) return null;

  // Search dishes across all days and meals in weekMenu
  const results: SearchResult[] = [];
  const cleanQ = queryText.trim().toLowerCase();

  if (cleanQ.length >= 2) {
    Object.entries(weekMenu.days).forEach(([date, meals]) => {
      meals.forEach((meal) => {
        meal.dishes.forEach((dish) => {
          if (dish.name.toLowerCase().includes(cleanQ) || (dish.category && dish.category.toLowerCase().includes(cleanQ))) {
            results.push({
              dish,
              date,
              dayOfWeek: meal.dayOfWeek,
              mealName: meal.name,
              slotId: meal.slotId,
              startTime: meal.startTime,
              endTime: meal.endTime,
              mealId: meal.id,
            });
          }
        });
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-400 ml-1" />
          <input
            type="text"
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search dishes (e.g. Paneer, Rajma, Biryani, Halwa)..."
            className="flex-1 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
          {queryText && (
            <button
              onClick={() => setQueryText('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
          >
            Cancel
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 space-y-3">
          {cleanQ.length < 2 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <p>Type at least 2 characters to search Chitkara menu dishes.</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {['Paneer', 'Rajma', 'Dal Makhani', 'Chole', 'Kheer', 'Biryani'].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setQueryText(sug)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p className="font-semibold text-slate-700">No dishes found matching "{queryText}"</p>
              <p className="text-xs text-slate-400 mt-1">Check your spelling or try another keyword.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Found {results.length} occurrence{results.length > 1 ? 's' : ''} this week
              </p>
              {results.map((res, idx) => (
                <div
                  key={`${res.mealId}-${res.dish.id}-${idx}`}
                  onClick={() => {
                    onSelectMeal?.(res.date, res.mealId);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200/90 hover:border-chitkara hover:bg-red-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 active-press"
                >
                  <div className="space-y-1">
                    <DishChip dish={res.dish} showReviewBadge={false} />
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{res.dayOfWeek}</span>
                      <span>•</span>
                      <span>{res.mealName}</span>
                      <span>•</span>
                      <span>{formatTime12h(res.startTime)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
