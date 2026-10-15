import React, { useState } from 'react';
import { WeekMenu, MealOccurrence, Dish } from '@/types/menu';
import { OcrExtractionResult } from '@/services/ocrService';
import {
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Save,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Edit2,
} from 'lucide-react';
import { formatTime12h, formatFriendlyDate } from '@/utils/dateUtils';

interface OcrReviewViewProps {
  photoUrl: string;
  extractedResult: OcrExtractionResult;
  onProceedToDiff: (reviewedMenu: WeekMenu) => void;
  onSaveDraft: (reviewedMenu: WeekMenu) => void;
  onBack: () => void;
}

export const OcrReviewView: React.FC<OcrReviewViewProps> = ({
  photoUrl,
  extractedResult,
  onProceedToDiff,
  onSaveDraft,
  onBack,
}) => {
  const [menu, setMenu] = useState<WeekMenu>(extractedResult.menu);
  const availableDates = Object.keys(menu.days).sort();
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || '');
  const [selectedSlot, setSelectedSlot] = useState<string>('lunch');

  // Currently selected meal occurrence
  const currentMeals = menu.days[selectedDate] || [];
  const currentMeal = currentMeals.find((m) => m.slotId === selectedSlot) || currentMeals[0];

  const [newDishName, setNewDishName] = useState<string>('');
  const [isVegetarian, setIsVegetarian] = useState<boolean>(true);

  // Update dish name
  const handleUpdateDishName = (dishId: string, newName: string) => {
    const updated = { ...menu };
    const dayMeals = updated.days[selectedDate];
    if (dayMeals) {
      const meal = dayMeals.find((m) => m.id === currentMeal.id);
      if (meal) {
        const dish = meal.dishes.find((d) => d.id === dishId);
        if (dish) {
          dish.name = newName;
          dish.needsReview = false; // Resolved by admin edit!
        }
      }
    }
    setMenu(updated);
  };

  // Toggle vegetarian
  const handleToggleVeg = (dishId: string) => {
    const updated = { ...menu };
    const dayMeals = updated.days[selectedDate];
    if (dayMeals) {
      const meal = dayMeals.find((m) => m.id === currentMeal.id);
      if (meal) {
        const dish = meal.dishes.find((d) => d.id === dishId);
        if (dish) {
          dish.isVegetarian = !dish.isVegetarian;
        }
      }
    }
    setMenu(updated);
  };

  // Delete dish
  const handleDeleteDish = (dishId: string) => {
    const updated = { ...menu };
    const dayMeals = updated.days[selectedDate];
    if (dayMeals) {
      const meal = dayMeals.find((m) => m.id === currentMeal.id);
      if (meal) {
        meal.dishes = meal.dishes.filter((d) => d.id !== dishId);
      }
    }
    setMenu(updated);
  };

  // Add new dish
  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim() || !currentMeal) return;

    const updated = { ...menu };
    const dayMeals = updated.days[selectedDate];
    if (dayMeals) {
      const meal = dayMeals.find((m) => m.id === currentMeal.id);
      if (meal) {
        meal.dishes.push({
          id: `${meal.id}-custom-${Date.now()}`,
          name: newDishName.trim(),
          category: 'Main',
          isVegetarian,
          needsReview: false,
        });
      }
    }
    setMenu(updated);
    setNewDishName('');
  };

  // Count remaining uncertain dishes
  const remainingUncertain = Object.values(menu.days)
    .flat()
    .reduce((acc, m) => acc + m.dishes.filter((d) => d.needsReview).length, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Upload</span>
          </button>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Review & Correct Extracted Dishes
          </h2>
          <p className="text-xs text-slate-500">
            Compare with the original notice photograph on the left. Correct any glare-obscured dishes before publishing.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onSaveDraft(menu)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => onProceedToDiff(menu)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-chitkara hover:bg-chitkara-dark text-white font-bold text-xs shadow-xs transition-colors active-press"
          >
            <span>Compare & Publish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Uncertainty Alert Banner */}
      {remainingUncertain > 0 ? (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300/80 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">{remainingUncertain} dish{remainingUncertain > 1 ? 'es' : ''} flagged for review.</span> Light glare or reflections were detected on the printed notice. Review and edit them below.
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All dishes verified! Ready to compare against the active published timetable.</span>
        </div>
      )}

      {/* Side-by-Side Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Original Photograph Viewer */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200 shadow-subtle space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Original Notice Photo</span>
            </h3>
            <span className="text-[11px] text-slate-400">Pinch/Scroll to zoom</span>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-[500px] flex items-center justify-center">
            <img
              src={photoUrl}
              alt="Uploaded Notice Board"
              className="w-full h-auto max-h-[500px] object-contain cursor-zoom-in"
            />
          </div>
        </div>

        {/* Right Column: Interactive Dish Editor */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle space-y-5">
          {/* Day & Meal Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {availableDates.map((dStr) => {
                const dayMeals = menu.days[dStr] || [];
                const dayName = dayMeals[0]?.dayOfWeek || 'Day';
                const hasFlags = dayMeals.some((m) => m.dishes.some((d) => d.needsReview));
                const isSelected = dStr === selectedDate;

                return (
                  <button
                    key={dStr}
                    onClick={() => setSelectedDate(dStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative shrink-0 border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{dayName}</span>
                    {hasFlags && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Meal Slot Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              {[
                { id: 'breakfast', label: 'Breakfast' },
                { id: 'lunch', label: 'Lunch' },
                { id: 'snacks', label: 'Snacks' },
                { id: 'dinner', label: 'Dinner' },
              ].map((slot) => {
                const isSlotSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSlotSelected
                        ? 'bg-white text-chitkara shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Meal Details & Dishes */}
          {currentMeal ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {currentMeal.dayOfWeek} • {currentMeal.name}
                  </h4>
                  <span className="text-xs text-slate-500">
                    Timings: {formatTime12h(currentMeal.startTime)} – {formatTime12h(currentMeal.endTime)}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {currentMeal.dishes.length} dishes
                </span>
              </div>

              {/* Editable Dish List */}
              <div className="space-y-2">
                {currentMeal.dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                      dish.needsReview
                        ? 'bg-amber-50/80 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Veg / Non-Veg Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleVeg(dish.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                        dish.isVegetarian ? 'border-emerald-600 bg-emerald-50' : 'border-red-600 bg-red-50'
                      }`}
                      title={dish.isVegetarian ? 'Click to mark as Non-Veg/Egg' : 'Click to mark as Veg'}
                    >
                      <span className={`w-2 h-2 rounded-full ${dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    </button>

                    {/* Editable Name Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={dish.name}
                        onChange={(e) => handleUpdateDishName(dish.id, e.target.value)}
                        className={`w-full text-xs sm:text-sm font-semibold rounded-md px-2 py-1 bg-transparent focus:bg-white focus:ring-1 focus:ring-chitkara focus:outline-hidden ${
                          dish.needsReview ? 'text-amber-950 font-bold' : 'text-slate-800'
                        }`}
                      />
                      {dish.needsReview && (
                        <p className="text-[10px] text-amber-700 px-2 mt-0.5 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{dish.reviewNote || 'Uncertain text: please verify name with notice photo.'}</span>
                        </p>
                      )}
                    </div>

                    {/* Delete Dish Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDish(dish.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete dish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Dish Form */}
              <form onSubmit={handleAddDish} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="Add dish (e.g. Boondi Raita, Gulab Jamun)..."
                  className="flex-1 text-xs sm:text-sm rounded-xl border border-slate-300 p-2 text-slate-800 focus:outline-hidden focus:border-chitkara"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-colors active-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Dish</span>
                </button>
              </form>
            </div>
          ) : (
            <p className="text-slate-400 text-xs">No meal selected.</p>
          )}
        </div>
      </div>
    </div>
  );
};
